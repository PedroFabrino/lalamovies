import { and, eq, gte, inArray, ne } from 'drizzle-orm';
import { AppDatabase, downloadRequests } from '../db';
import { IProwlarrService, ReleaseCandidate, Resolution, ScoreOptions } from './prowlarr';
import { IMetadataService } from './metadata';
import { cleanTorrentTitle, extractEpisodeInfo } from '../utils/torrentTitleCleaner';

export interface UpNextItem {
  id: string;
  showTitle: string;
  releaseTitle: string;
  mediaType: 'tv_show' | 'anime';
  seasonNumber: number;
  episodeNumber: number | null;
  posterUrl: string | null;
  rating: number | null;
  overview: string | null;
  resolution: Resolution;
  sizeBytes: number;
  formattedSize: string;
  seeders: number;
  indexer: string;
  downloadUrl: string;
  score: number;
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  year: number | null;
}

export interface UpNextResult {
  available: boolean;
  items: UpNextItem[];
  error?: string;
}

export interface IUpNextService {
  getUpNext(userId: string): Promise<UpNextResult>;
  clearCache(): void;
}

export interface UpNextServiceOptions {
  db: AppDatabase;
  prowlarr: IProwlarrService;
  metadata: IMetadataService;
  ttlMs?: number;
  getTmdbApiKey?: () => string | undefined;
}

const CAM_REGEX = /\b(CAM|CAMRip|TS|TELESYNC|TeleSync|HDCAM|HDTS|WORKPRINT|WP)\b/i;

export function normalizeShowTitle(title: string): string {
  if (!title) return '';
  const cleaned = cleanTorrentTitle(title).title || title;
  return cleaned
    .toLowerCase()
    .replace(/['’".,_\-:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function groupShowRequests(
  requests: (typeof downloadRequests.$inferSelect)[]
): (typeof downloadRequests.$inferSelect)[][] {
  const n = requests.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const titleMap = new Map<string, number>();
  const metadataMap = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const req = requests[i];
    const normTitleKey = `${normalizeShowTitle(req.title)}:${req.mediaType}`;
    if (titleMap.has(normTitleKey)) {
      union(i, titleMap.get(normTitleKey)!);
    } else {
      titleMap.set(normTitleKey, i);
    }

    if (req.metadataId && req.metadataSource) {
      const metaKey = `${req.metadataSource}:${req.metadataId}`;
      if (metadataMap.has(metaKey)) {
        union(i, metadataMap.get(metaKey)!);
      } else {
        metadataMap.set(metaKey, i);
      }
    }
  }

  const grouped = new Map<number, typeof downloadRequests.$inferSelect[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = grouped.get(root) || [];
    list.push(requests[i]);
    grouped.set(root, list);
  }

  return Array.from(grouped.values());
}

export function matchesTarget(
  candidateTitle: string,
  targetSeason: number,
  targetEpisode: number | null
): boolean {
  const extracted = extractEpisodeInfo(candidateTitle);

  // If targeting a full season pack (targetEpisode === null)
  if (targetEpisode === null) {
    // 1. Candidate must NOT be an individual episode
    if (extracted.episodeNumber !== undefined && extracted.episodeNumber !== null) {
      return false;
    }
    // 2. Candidate must explicitly match targetSeason
    if (extracted.seasonNumber !== undefined && extracted.seasonNumber !== null) {
      return extracted.seasonNumber === targetSeason;
    }
    const cleaned = cleanTorrentTitle(candidateTitle);
    if (cleaned.seasonNumber !== undefined && cleaned.seasonNumber !== null) {
      return cleaned.seasonNumber === targetSeason;
    }
    return false;
  }

  // Targeting a specific episode (targetEpisode is a number)
  // 1. Candidate MUST have an episode number matching targetEpisode
  if (extracted.episodeNumber === undefined || extracted.episodeNumber === null) {
    return false;
  }
  if (extracted.episodeNumber !== targetEpisode) {
    return false;
  }

  // 2. Season number check
  const candidateSeason = extracted.seasonNumber ?? cleanTorrentTitle(candidateTitle).seasonNumber;
  if (candidateSeason !== undefined && candidateSeason !== null) {
    return candidateSeason === targetSeason;
  }

  // If candidate has no season number (e.g. anime absolute numbering like "Title - 11"):
  // Allow if targetSeason is 1
  return targetSeason === 1;
}

export class UpNextService implements IUpNextService {
  private db: AppDatabase;
  private prowlarr: IProwlarrService;
  private metadata: IMetadataService;
  private ttlMs: number;
  private getTmdbApiKey?: () => string | undefined;

  private cache = new Map<string, { timestamp: number; data: UpNextItem[] }>();
  private inflight = new Map<string, Promise<UpNextResult>>();

  constructor(options: UpNextServiceOptions) {
    this.db = options.db;
    this.prowlarr = options.prowlarr;
    this.metadata = options.metadata;
    this.ttlMs = options.ttlMs ?? 15 * 60 * 1000;
    this.getTmdbApiKey = options.getTmdbApiKey;
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  async getUpNext(userId: string): Promise<UpNextResult> {
    if (!this.prowlarr.isConfigured()) {
      return { available: false, items: [], error: 'Prowlarr is not configured' };
    }

    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return { available: true, items: cached.data };
    }

    if (this.inflight.has(userId)) {
      return this.inflight.get(userId)!;
    }

    const promise = this.calculateUpNext(userId).finally(() => {
      this.inflight.delete(userId);
    });

    this.inflight.set(userId, promise);
    return promise;
  }

  private async findBestCandidate(
    mediaType: 'tv_show' | 'anime',
    title: string,
    seasonNumber: number,
    episodeNumber: number | null
  ): Promise<ReleaseCandidate | null> {
    const searchRes = await this.prowlarr.searchReleases({
      mediaType,
      title,
      seasonNumber,
      episodeNumber,
    });

    if (!searchRes.isReachable) {
      throw new Error(searchRes.error || 'Prowlarr unreachable');
    }

    const healthyCandidates = searchRes.candidates.filter((candidate) => {
      if (candidate.seeders < 10) return false;
      if (candidate.score <= 0) return false;
      if (candidate.source === 'cam') return false;
      if (CAM_REGEX.test(candidate.title)) return false;
      return matchesTarget(candidate.title, seasonNumber, episodeNumber);
    });

    if (healthyCandidates.length === 0) {
      return null;
    }

    healthyCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.seeders - a.seeders;
    });

    return healthyCandidates[0];
  }

  private async calculateUpNext(userId: string): Promise<UpNextResult> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    let recentRequests: (typeof downloadRequests.$inferSelect)[];
    try {
      recentRequests = this.db
        .select()
        .from(downloadRequests)
        .where(
          and(
            eq(downloadRequests.userId, userId),
            ne(downloadRequests.status, 'deleted'),
            inArray(downloadRequests.mediaType, ['tv_show', 'anime']),
            gte(downloadRequests.requestedAt, cutoffDate)
          )
        )
        .all();
    } catch (err) {
      return { available: false, items: [], error: (err as Error).message };
    }

    if (recentRequests.length === 0) {
      return { available: true, items: [] };
    }

    // Group requests by series (unified by normalized title + mediaType or metadataId)
    const groups = groupShowRequests(recentRequests);

    const upNextItems: UpNextItem[] = [];
    const tmdbApiKey = this.getTmdbApiKey ? this.getTmdbApiKey() : undefined;

    for (const group of groups) {
      // Sort newest request first
      group.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      const rep = group[0];
      const reqWithMeta = group.find((r) => r.metadataId && r.metadataSource) || rep;
      const mediaType = rep.mediaType as 'tv_show' | 'anime';
      const showTitle = rep.title;
      let metadataId = reqWithMeta.metadataId || '';
      let metadataSource = (reqWithMeta.metadataSource || (mediaType === 'anime' ? 'anilist' : 'tmdb')) as 'tmdb' | 'anilist';

      // 1. Determine highest requested season
      let maxSeason = 1;
      for (const req of group) {
        if (req.seasonNumber && req.seasonNumber > maxSeason) {
          maxSeason = req.seasonNumber;
        }
      }

      // Requests for the maxSeason
      const seasonRequests = group.filter((r) => (r.seasonNumber ?? 1) === maxSeason);

      // Check if full season pack was requested for maxSeason
      const hasSeasonPack = seasonRequests.some(
        (r) => r.episodeNumber === null || r.episodeNumber === undefined
      );

      let targetSeason = maxSeason;
      let targetEpisode: number | null = null;
      let bestCandidate: ReleaseCandidate | null = null;

      try {
        if (hasSeasonPack) {
          targetSeason = maxSeason + 1;
          targetEpisode = null;
          bestCandidate = await this.findBestCandidate(mediaType, showTitle, targetSeason, targetEpisode);

          // If full season pack not found for targetSeason, fallback to Episode 1
          if (!bestCandidate) {
            targetEpisode = 1;
            bestCandidate = await this.findBestCandidate(mediaType, showTitle, targetSeason, targetEpisode);
          }
        } else {
          let maxEpisode = 0;
          for (const r of seasonRequests) {
            if (typeof r.episodeNumber === 'number' && r.episodeNumber > maxEpisode) {
              maxEpisode = r.episodeNumber;
            }
          }
          targetSeason = maxSeason;
          targetEpisode = maxEpisode + 1;
          bestCandidate = await this.findBestCandidate(mediaType, showTitle, targetSeason, targetEpisode);
        }

        if (!bestCandidate) {
          continue;
        }

        // 2. Metadata Enrichment for show artwork & rating
        let posterUrl: string | null = null;
        let rating: number | null = null;
        let overview: string | null = null;
        let year: number | null = rep.year ?? null;

        try {
          if (mediaType === 'anime') {
            const aniRes = await this.metadata.searchAniList(showTitle, year);
            if (aniRes && aniRes.length > 0) {
              posterUrl = aniRes[0].posterUrl;
              rating = aniRes[0].rating ?? null;
              overview = aniRes[0].overview;
              if (!year && aniRes[0].year) year = aniRes[0].year;
              if (!metadataId) {
                metadataId = aniRes[0].id;
                metadataSource = 'anilist';
              }
            }
          } else {
            const tmdbRes = await this.metadata.searchTMDB(showTitle, 'tv_show', tmdbApiKey, year);
            if (tmdbRes && tmdbRes.length > 0) {
              posterUrl = tmdbRes[0].posterUrl;
              rating = tmdbRes[0].rating ?? null;
              overview = tmdbRes[0].overview;
              if (!year && tmdbRes[0].year) year = tmdbRes[0].year;
              if (!metadataId) {
                metadataId = tmdbRes[0].id;
                metadataSource = 'tmdb';
              }
            }
          }
        } catch {
          // Non-critical, fallback to nulls
        }

        upNextItems.push({
          id: bestCandidate.guid || bestCandidate.downloadUrl,
          showTitle,
          releaseTitle: bestCandidate.title,
          mediaType,
          seasonNumber: targetSeason,
          episodeNumber: targetEpisode,
          posterUrl,
          rating,
          overview,
          resolution: bestCandidate.resolution,
          sizeBytes: bestCandidate.sizeBytes,
          formattedSize: bestCandidate.formattedSize,
          seeders: bestCandidate.seeders,
          indexer: bestCandidate.indexer,
          downloadUrl: bestCandidate.downloadUrl,
          score: bestCandidate.score,
          metadataId,
          metadataSource,
          year,
        });
      } catch (err) {
        if (
          (err as Error).message.includes('unreachable') ||
          (err as Error).message.includes('offline') ||
          (err as Error).message.includes('not configured')
        ) {
          return { available: false, items: [], error: (err as Error).message };
        }
        // Show query failed, continue with next show
      }
    }

    this.cache.set(userId, { timestamp: Date.now(), data: upNextItems });
    return { available: true, items: upNextItems };
  }
}
