import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { inArray, and, ne, eq, isNotNull } from 'drizzle-orm';
import path from 'node:path';
import fs from 'node:fs';
import { downloadRequests, systemConfig, users } from '../db';
import { authMiddleware } from '../middleware/auth';
import { IMetadataService } from '../services/metadata';
import { RequestStatus } from '../services/requestStateMachine';
import { requireFeature } from '../middleware/featureFlags';
import { requestCoRequesters, DownloadRequest } from '../db/schema';

export interface MediaRequester {
  id: string;
  username: string;
}

export interface EpisodeItem {
  id: string;
  episodeNumber: number | null;
  title: string;
  sizeBytes: number;
  jellyfinPath: string | null;
}

export interface SeasonItem {
  seasonNumber: number;
  episodeCount: number;
  sizeBytes: number;
  episodes: EpisodeItem[];
}

export interface LibraryMediaCard {
  id: string;
  requestIds: string[];
  title: string;
  year: number | null;
  mediaType: 'movie' | 'tv_show' | 'anime';
  sizeBytes: number;
  jellyfinPath: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  metadataId?: string;
  metadataSource?: string;
  requestedBy: MediaRequester;
  coRequesters: MediaRequester[];
  canManage: boolean;
  seasons?: SeasonItem[];
}

interface MediaArtwork {
  posterUrl: string | null;
  backdropUrl: string | null;
}

const artworkCache = new Map<string, MediaArtwork>();

async function resolveArtwork(
  metadataId: string | null | undefined,
  metadataSource: string | null | undefined,
  mediaType: 'movie' | 'tv_show' | 'anime',
  title: string,
  tmdbApiKey?: string,
  metadataService?: IMetadataService
): Promise<MediaArtwork> {
  const cacheKey = `${metadataSource || 'unknown'}:${metadataId || title}:${mediaType}`;
  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey)!;
  }

  let result: MediaArtwork = { posterUrl: null, backdropUrl: null };

  try {
    if (metadataSource === 'tmdb' && metadataId && tmdbApiKey) {
      const type = mediaType === 'movie' ? 'movie' : 'tv';
      const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(metadataId)}?api_key=${encodeURIComponent(tmdbApiKey)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as { poster_path?: string | null; backdrop_path?: string | null };
        result = {
          posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
          backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : null,
        };
      }
    } else if (metadataSource === 'anilist' && metadataId) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const graphqlQuery = `query ($id: Int) { Media(id: $id, type: ANIME) { coverImage { large extraLarge } bannerImage } }`;
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: graphqlQuery, variables: { id: parseInt(metadataId, 10) } }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          data?: {
            Media?: {
              coverImage?: { large?: string; extraLarge?: string };
              bannerImage?: string;
            };
          };
        };
        const media = data?.data?.Media;
        if (media) {
          result = {
            posterUrl: media.coverImage?.extraLarge || media.coverImage?.large || null,
            backdropUrl: media.bannerImage || null,
          };
        }
      }
    }
  } catch {
    // Non-fatal
  }

  // Fallback to searching if still null and metadataService is provided
  if (!result.posterUrl && !result.backdropUrl && metadataService) {
    try {
      const candidates = await metadataService.searchMedia(title, mediaType, { apiKey: tmdbApiKey });
      if (candidates.length > 0 && candidates[0].posterUrl) {
        result = { posterUrl: candidates[0].posterUrl, backdropUrl: null };
      }
    } catch {
      // Non-fatal
    }
  }

  artworkCache.set(cacheKey, result);
  return result;
}

const moveMediaSchema = z.object({
  requestIds: z.array(z.string().min(1)).min(1, 'At least one request ID is required'),
  targetMediaType: z.enum(['movie', 'tv_show', 'anime']),
});

const deleteMediaSchema = z.object({
  requestIds: z.array(z.string().min(1)).min(1, 'At least one request ID is required'),
});

function getShowFolderPath(jellyfinPath: string | null, mediaType: string): string | null {
  if (!jellyfinPath) return null;
  const subDir = mediaType === 'anime' ? 'anime' : 'shows';
  const norm = jellyfinPath.replace(/\\/g, '/');
  const parts = norm.split('/');
  const idx = parts.indexOf(subDir);
  if (idx !== -1 && parts[idx + 1]) {
    return parts.slice(0, idx + 2).join(path.sep);
  }
  return path.dirname(jellyfinPath);
}

export const libraryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireFeature('jellyfin_library_view'));

  // GET / - Retrieves completed downloads grouped into movies, shows, and anime
  app.get('/', async (request, reply) => {
    const currentUserId = request.currentUser?.id;
    const isAdmin = request.currentUser?.role === 'admin';

    // Strictly completed downloads (done or seeding, and not deleted)
    const items = app.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          inArray(downloadRequests.status, [RequestStatus.DONE, RequestStatus.SEEDING]),
          ne(downloadRequests.status, RequestStatus.DELETED)
        )
      )
      .all();

    // Map of all users
    const allUsers = app.db.select().from(users).all();
    const usersMap = new Map<string, MediaRequester>();
    for (const u of allUsers) {
      usersMap.set(u.id, { id: u.id, username: u.username });
    }

    // Map of co-requesters per request
    const allCoReqRows = app.db.select().from(requestCoRequesters).all();
    const coRequestersMap = new Map<string, MediaRequester[]>();
    for (const row of allCoReqRows) {
      const coUser = usersMap.get(row.userId);
      if (coUser) {
        const existing = coRequestersMap.get(row.requestId) || [];
        existing.push(coUser);
        coRequestersMap.set(row.requestId, existing);
      }
    }

    const moviesList: LibraryMediaCard[] = [];
    const showsGroupMap = new Map<string, DownloadRequest[]>();
    const animeGroupMap = new Map<string, DownloadRequest[]>();

    for (const item of items) {
      if (item.mediaType === 'movie') {
        const reqUser = usersMap.get(item.userId) || { id: item.userId, username: 'Unknown' };
        const coReqs = coRequestersMap.get(item.id) || [];
        const canManage = isAdmin || item.userId === currentUserId;

        moviesList.push({
          id: item.id,
          requestIds: [item.id],
          title: item.title,
          year: item.year ?? null,
          mediaType: 'movie',
          sizeBytes: item.sizeBytes || 0,
          jellyfinPath: item.jellyfinPath,
          metadataId: item.metadataId,
          metadataSource: item.metadataSource,
          requestedBy: reqUser,
          coRequesters: coReqs,
          canManage,
        });
      } else if (item.mediaType === 'tv_show') {
        const key = item.metadataId ? `tmdb:${item.metadataId}` : item.title.toLowerCase().trim();
        const group = showsGroupMap.get(key) || [];
        group.push(item);
        showsGroupMap.set(key, group);
      } else if (item.mediaType === 'anime') {
        const key = item.metadataId ? `${item.metadataSource}:${item.metadataId}` : item.title.toLowerCase().trim();
        const group = animeGroupMap.get(key) || [];
        group.push(item);
        animeGroupMap.set(key, group);
      }
    }

    const formatSeriesGroups = (
      groupMap: Map<string, DownloadRequest[]>,
      mediaType: 'tv_show' | 'anime'
    ): LibraryMediaCard[] => {
      const result: LibraryMediaCard[] = [];

      for (const [, group] of groupMap.entries()) {
        group.sort((a, b) => {
          const sA = a.seasonNumber ?? 0;
          const sB = b.seasonNumber ?? 0;
          if (sA !== sB) return sA - sB;
          return (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0);
        });

        const primaryReq = group[0];
        const primaryUser = usersMap.get(primaryReq.userId) || { id: primaryReq.userId, username: 'Unknown' };
        const canManage = isAdmin || group.every((r) => r.userId === currentUserId);
        const totalSize = group.reduce((sum, r) => sum + (r.sizeBytes || 0), 0);
        const year = group.find((r) => r.year != null)?.year ?? null;

        // Collect all unique co-requesters
        const coReqUserMap = new Map<string, MediaRequester>();
        for (const r of group) {
          if (r.userId !== primaryUser.id) {
            const u = usersMap.get(r.userId);
            if (u) coReqUserMap.set(u.id, u);
          }
          const attached = coRequestersMap.get(r.id) || [];
          for (const u of attached) {
            if (u.id !== primaryUser.id) {
              coReqUserMap.set(u.id, u);
            }
          }
        }

        // Build seasons hierarchy
        const seasonMap = new Map<number, EpisodeItem[]>();
        let commonFolderPath: string | null = null;

        for (const r of group) {
          if (!commonFolderPath && r.jellyfinPath) {
            commonFolderPath = getShowFolderPath(r.jellyfinPath, mediaType);
          }

          const sNum = r.seasonNumber ?? 1;
          const epList = seasonMap.get(sNum) || [];
          epList.push({
            id: r.id,
            episodeNumber: r.episodeNumber ?? null,
            title: r.title,
            sizeBytes: r.sizeBytes || 0,
            jellyfinPath: r.jellyfinPath,
          });
          seasonMap.set(sNum, epList);
        }

        const seasons: SeasonItem[] = Array.from(seasonMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([seasonNumber, episodes]) => ({
            seasonNumber,
            episodeCount: episodes.length,
            sizeBytes: episodes.reduce((acc, ep) => acc + ep.sizeBytes, 0),
            episodes: episodes.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)),
          }));

        result.push({
          id: primaryReq.id,
          requestIds: group.map((r) => r.id),
          title: primaryReq.title,
          year,
          mediaType,
          sizeBytes: totalSize,
          jellyfinPath: commonFolderPath || primaryReq.jellyfinPath,
          metadataId: primaryReq.metadataId,
          metadataSource: primaryReq.metadataSource,
          requestedBy: primaryUser,
          coRequesters: Array.from(coReqUserMap.values()),
          canManage,
          seasons,
        });
      }

      return result;
    };

    const showsList = formatSeriesGroups(showsGroupMap, 'tv_show');
    const animeList = formatSeriesGroups(animeGroupMap, 'anime');

    const tmdbKeyRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'tmdb_api_key'))
      .get();
    const tmdbApiKey = tmdbKeyRow?.value || process.env.TMDB_API_KEY;

    // Resolve artwork in parallel across all items
    await Promise.allSettled([
      ...moviesList.map(async (m) => {
        const art = await resolveArtwork(m.metadataId, m.metadataSource, 'movie', m.title, tmdbApiKey, app.metadata);
        m.posterUrl = art.posterUrl;
        m.backdropUrl = art.backdropUrl;
      }),
      ...showsList.map(async (s) => {
        const art = await resolveArtwork(s.metadataId, s.metadataSource, 'tv_show', s.title, tmdbApiKey, app.metadata);
        s.posterUrl = art.posterUrl;
        s.backdropUrl = art.backdropUrl;
      }),
      ...animeList.map(async (a) => {
        const art = await resolveArtwork(a.metadataId, a.metadataSource, 'anime', a.title, tmdbApiKey, app.metadata);
        a.posterUrl = art.posterUrl;
        a.backdropUrl = art.backdropUrl;
      }),
    ]);

    return reply.send({
      movies: moviesList,
      shows: showsList,
      anime: animeList,
    });
  });

  // POST /move - Batch relocation across library categories with hardlink preservation
  app.post('/move', async (request, reply) => {
    const parseRes = moveMediaSchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: parseRes.error.issues[0]?.message || 'Invalid request payload',
      });
    }

    const { requestIds, targetMediaType } = parseRes.data;
    const currentUserId = request.currentUser?.id;
    const isAdmin = request.currentUser?.role === 'admin';

    const requests = app.db
      .select()
      .from(downloadRequests)
      .where(inArray(downloadRequests.id, requestIds))
      .all();

    if (requests.length !== requestIds.length) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'One or more media items not found',
      });
    }

    if (!isAdmin) {
      const unowned = requests.filter((r) => r.userId !== currentUserId);
      if (unowned.length > 0) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'You can only move items you requested',
        });
      }
    }

    // Perform directory/file relocation on disk and update DB
    for (const req of requests) {
      if (req.mediaType === targetMediaType) {
        continue;
      }

      const currentPath = req.jellyfinPath;
      let newJellyfinPath = currentPath;
      let effectiveTitle = req.title;

      if (currentPath) {
        const isDir = fs.existsSync(currentPath) && fs.statSync(currentPath).isDirectory();
        const ext = isDir ? undefined : path.extname(currentPath) || '.mkv';

        let existingShowFolder: string | undefined;

        if (['tv_show', 'anime'].includes(targetMediaType)) {
          try {
            const targetSubDir = targetMediaType === 'anime' ? 'anime' : 'shows';
            const conditions = [
              ne(downloadRequests.id, req.id),
              ne(downloadRequests.status, RequestStatus.DELETED),
              eq(downloadRequests.mediaType, targetMediaType),
              isNotNull(downloadRequests.jellyfinPath),
            ];
            if (req.metadataId) {
              conditions.push(eq(downloadRequests.metadataId, req.metadataId));
            }

            const existingTargetSeries = app.db
              .select({
                jellyfinPath: downloadRequests.jellyfinPath,
                title: downloadRequests.title,
              })
              .from(downloadRequests)
              .where(and(...conditions))
              .get();

            if (existingTargetSeries?.jellyfinPath) {
              const parts = existingTargetSeries.jellyfinPath.split(/[\\/]/);
              const idx = parts.indexOf(targetSubDir);
              if (idx !== -1 && parts[idx + 1]) {
                existingShowFolder = parts[idx + 1];
                effectiveTitle = existingTargetSeries.title || existingShowFolder.replace(/\s*\(\d{4}\)$/, '').trim();
              }
            }

            // If not found in DB, check target library directory on disk
            if (!existingShowFolder) {
              const mediaBase =
                (app.fileSystem.getMediaBasePath ? app.fileSystem.getMediaBasePath() : null) ||
                process.env.MEDIA_PATH ||
                path.resolve(process.cwd(), 'media');
              const cleanReqTitle = req.title.replace(/[<>:"/\\|?*]/g, '').trim();
              const baseClean = cleanReqTitle.replace(/\s*-\s*\d+$/, '').trim() || cleanReqTitle;
              const candidates = [req.year ? `${baseClean} (${req.year})` : baseClean, baseClean];
              for (const folder of candidates) {
                if (fs.existsSync(path.join(mediaBase, targetSubDir, folder))) {
                  existingShowFolder = folder;
                  effectiveTitle = folder.replace(/\s*\(\d{4}\)$/, '').trim();
                  break;
                }
              }
            }
          } catch {
            // Non-fatal
          }
        }

        const destPath = app.fileSystem.buildLibraryPath({
          mediaType: targetMediaType,
          title: effectiveTitle,
          year: req.year,
          seasonNumber: req.seasonNumber,
          episodeNumber: req.episodeNumber,
          isSeasonPack: isDir || (targetMediaType !== 'movie' && !ext),
          ext,
          existingShowFolder,
        });

        if (fs.existsSync(currentPath)) {
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          // Move the file or folder - within same mount, renameSync maintains inode (hardlinks intact!)
          fs.renameSync(currentPath, destPath);

          // Clean up empty parent directory if left behind
          try {
            const oldParent = path.dirname(currentPath);
            if (fs.existsSync(oldParent) && fs.readdirSync(oldParent).length === 0) {
              fs.rmdirSync(oldParent);
              const oldGrandParent = path.dirname(oldParent);
              if (fs.existsSync(oldGrandParent) && fs.readdirSync(oldGrandParent).length === 0) {
                fs.rmdirSync(oldGrandParent);
              }
            }
          } catch {
            // Ignore cleanup failures
          }
        }

        newJellyfinPath = destPath;
      }

      app.db
        .update(downloadRequests)
        .set({
          mediaType: targetMediaType,
          title: effectiveTitle,
          jellyfinPath: newJellyfinPath,
        })
        .where(eq(downloadRequests.id, req.id))
        .run();
    }

    if (app.fileSystem.invalidateFootprintCache) {
      app.fileSystem.invalidateFootprintCache();
    }

    if (typeof app.jellyfin.safeRefresh === 'function') {
      await app.jellyfin.safeRefresh();
    } else if (app.jellyfin?.refreshLibrary) {
      try {
        await app.jellyfin.refreshLibrary();
      } catch {
        // Non-blocking
      }
    }

    return reply.send({
      success: true,
      movedCount: requests.length,
    });
  });

  // POST /delete - Batch cleanup and deletion with ownership / co-requester safeguards
  app.post('/delete', async (request, reply) => {
    const parseRes = deleteMediaSchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: parseRes.error.issues[0]?.message || 'Invalid request payload',
      });
    }

    const { requestIds } = parseRes.data;
    const currentUserId = request.currentUser?.id;
    const isAdmin = request.currentUser?.role === 'admin';

    const requests = app.db
      .select()
      .from(downloadRequests)
      .where(inArray(downloadRequests.id, requestIds))
      .all();

    if (requests.length !== requestIds.length) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'One or more media items not found',
      });
    }

    if (!isAdmin) {
      const unowned = requests.filter((r) => r.userId !== currentUserId);
      if (unowned.length > 0) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'You can only delete items where you are the primary requester',
        });
      }
    }

    for (const req of requests) {
      await app.cleanup.cleanItem(req.id);
    }

    return reply.send({
      success: true,
      deletedCount: requests.length,
    });
  });
};
