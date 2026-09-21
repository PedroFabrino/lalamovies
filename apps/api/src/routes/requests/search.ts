import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { systemConfig } from '../../db/schema';
import { normalizeShowTitle } from '../../services/upNext';
import { MetadataApiError } from '../../services/metadata';
import { cleanTorrentTitle } from '../../utils/torrentTitleCleaner';
import { parseTorrentBuffer } from '../../services/torrentParser';
import { findMatchingCanonicalRequest } from '../../services/requestDedup';
import {
  TmdbEpisodeInfo,
  TmdbSeasonDetails,
  searchMetadataSchema,
  searchReleasesSchema,
  existsRequestSchema,
} from './schemas';

export const searchRoutes: FastifyPluginAsync = async (app) => {
  // GET /requests/prowlarr-status
  app.get('/prowlarr-status', async (request, reply) => {
    const isConfigured = app.prowlarr.isConfigured();
    if (!isConfigured) {
      return reply.status(503).send({
        isConfigured: false,
        isReachable: false,
        message: 'Prowlarr is not configured with an API key',
      });
    }

    const isReachable = await app.prowlarr.checkHealth();
    if (!isReachable) {
      return reply.status(503).send({
        isConfigured: true,
        isReachable: false,
        message: 'Prowlarr service is unreachable',
      });
    }

    return reply.send({
      isConfigured: true,
      isReachable: true,
    });
  });

  // GET /requests/series-progress
  app.get('/series-progress', async (request, reply) => {
    const query = request.query as {
      metadataId?: string;
      metadataSource?: string;
      seasonNumber?: string;
      episodeNumber?: string;
      title?: string;
      mediaType?: string;
    };

    const effectiveUserId = request.currentUser?.id;
    if (!effectiveUserId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (query.mediaType === 'movie') {
      const allMovieRequests = app.requestsRepo.findByCriteria({
        mediaType: 'movie',
        excludeDeleted: true,
      });

      const normTitle = query.title ? normalizeShowTitle(query.title) : '';
      const matched = allMovieRequests.find((r) => {
        if (query.metadataId && r.metadataId && String(r.metadataId) === String(query.metadataId)) {
          return true;
        }
        if (normTitle && r.title && normalizeShowTitle(r.title) === normTitle) {
          return true;
        }
        return false;
      });

      const inLibrary = Boolean(
        matched && ['downloading', 'hardlinking', 'seeding', 'completed', 'queued'].includes(matched.status)
      );

      return reply.send({
        highestSeason: null,
        highestEpisode: null,
        existingEpisodes: [],
        suggestedSeason: 1,
        suggestedEpisode: 1,
        airDate: null,
        existingTitle: matched?.title || null,
        existingMediaType: matched?.mediaType || null,
        hasExisting: Boolean(matched),
        inLibrary,
        status: matched?.status || null,
      });
    }

    const userRequests = app.requestsRepo
      .findByUserId(effectiveUserId, true)
      .filter((r) => ['tv_show', 'anime'].includes(r.mediaType));

    const normTitle = query.title ? normalizeShowTitle(query.title) : '';
    const matching = userRequests.filter((r) => {
      if (query.metadataId && r.metadataId && String(r.metadataId) === String(query.metadataId)) {
        return true;
      }
      if (normTitle && r.title && normalizeShowTitle(r.title) === normTitle) {
        return true;
      }
      return false;
    });

    const requestedSeason = query.seasonNumber ? parseInt(query.seasonNumber, 10) : undefined;
    const requestedEp = query.episodeNumber ? parseInt(query.episodeNumber, 10) : undefined;

    if (matching.length === 0) {
      const targetSeason = requestedSeason && !isNaN(requestedSeason) ? requestedSeason : 1;
      const targetEp = requestedEp && !isNaN(requestedEp) ? requestedEp : 1;
      let airDate: string | null = null;
      const tmdbApiKey = process.env.TMDB_API_KEY;
      if (tmdbApiKey && query.metadataId && (!query.metadataSource || query.metadataSource === 'tmdb')) {
        try {
          const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(query.metadataId)}/season/${targetSeason}?api_key=${encodeURIComponent(tmdbApiKey)}`;
          const tmdbRes = await fetch(url);
          if (tmdbRes.ok) {
            const sData = (await tmdbRes.json()) as TmdbSeasonDetails;
            const ep = sData.episodes?.find((e: TmdbEpisodeInfo) => e.episode_number === targetEp);
            if (ep?.air_date) {
              airDate = ep.air_date.slice(0, 10);
            } else if (sData.air_date) {
              airDate = sData.air_date.slice(0, 10);
            }
          }
        } catch {
          // Non-blocking
        }
      }

      return reply.send({
        highestSeason: null,
        highestEpisode: null,
        existingEpisodes: [],
        suggestedSeason: targetSeason,
        suggestedEpisode: targetEp,
        existingTitle: null,
        existingMediaType: null,
        hasExisting: false,
        inLibrary: false,
        airDate,
      });
    }

    // Determine highest season
    let highestSeason = 1;
    for (const r of matching) {
      if (typeof r.seasonNumber === 'number' && r.seasonNumber > highestSeason) {
        highestSeason = r.seasonNumber;
      }
    }

    const targetSeason = requestedSeason && !isNaN(requestedSeason) ? requestedSeason : highestSeason;

    const seasonEpisodes = matching
      .filter((r) => (r.seasonNumber ?? 1) === targetSeason && typeof r.episodeNumber === 'number')
      .map((r) => r.episodeNumber as number)
      .sort((a, b) => a - b);

    const highestEp = seasonEpisodes.length > 0 ? seasonEpisodes[seasonEpisodes.length - 1] : 0;
    const suggestedEp = highestEp > 0 ? highestEp + 1 : 1;
    const lookupEp = requestedEp && !isNaN(requestedEp) ? requestedEp : suggestedEp;

    let airDate: string | null = null;
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (tmdbApiKey && query.metadataId && (!query.metadataSource || query.metadataSource === 'tmdb')) {
      try {
        const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(query.metadataId)}/season/${targetSeason}?api_key=${encodeURIComponent(tmdbApiKey)}`;
        const tmdbRes = await fetch(url);
        if (tmdbRes.ok) {
          const sData = (await tmdbRes.json()) as TmdbSeasonDetails;
          const ep = sData.episodes?.find((e: TmdbEpisodeInfo) => e.episode_number === lookupEp);
          if (ep?.air_date) {
            airDate = ep.air_date.slice(0, 10);
          } else if (sData.air_date) {
            airDate = sData.air_date.slice(0, 10);
          }
        }
      } catch {
        // Non-blocking
      }
    }

    const existingTitle = matching[0]?.title || null;
    const existingMediaType = matching[0]?.mediaType || null;

    return reply.send({
      highestSeason,
      highestEpisode: highestEp || null,
      existingEpisodes: seasonEpisodes,
      suggestedSeason: targetSeason,
      suggestedEpisode: suggestedEp,
      airDate,
      existingTitle,
      existingMediaType,
      hasExisting: true,
      inLibrary: seasonEpisodes.includes(lookupEp),
    });
  });

  // POST /requests/search-releases
  app.post('/search-releases', async (request, reply) => {
    const parseResult = searchReleasesSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const { mediaType, title, year, seasonNumber, episodeNumber, romajiTitle, englishTitle } = parseResult.data;

    try {
      const result = await app.prowlarr.searchReleases({
        mediaType,
        title,
        year,
        seasonNumber,
        episodeNumber,
        romajiTitle,
        englishTitle,
      });

      if (!result.isConfigured || !result.isReachable) {
        return reply.status(503).send(result);
      }

      return reply.send(result);
    } catch (err) {
      request.log.error(err, 'Failed to search torrent releases via Prowlarr');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search torrent releases',
      });
    }
  });

  // POST /requests/mark-infringing
  app.post('/mark-infringing', async (request, reply) => {
    const body = request.body as { infoHash?: string } | undefined;
    if (body?.infoHash) {
      app.prowlarr?.markHashInfringing?.(body.infoHash);
    }
    return reply.send({ success: true });
  });

  // POST /requests/search-metadata
  app.post('/search-metadata', async (request, reply) => {
    const parseResult = searchMetadataSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const { magnetLink, torrentFileBase64, mediaType, query: explicitQuery } = parseResult.data;

    let searchQuery = explicitQuery && explicitQuery.trim().length > 0 ? explicitQuery.trim() : '';

    if (!searchQuery && torrentFileBase64) {
      try {
        const parsed = parseTorrentBuffer(Buffer.from(torrentFileBase64, 'base64'));
        const cleaned = cleanTorrentTitle(parsed.name);
        searchQuery = cleaned.title || parsed.name;
      } catch (err) {
        request.log.warn(err, 'Failed to parse torrent buffer in search-metadata');
      }
    }

    if (!searchQuery && magnetLink) {
      searchQuery = app.metadata.extractTitleFromMagnet(magnetLink);
    }

    if (!searchQuery) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Could not extract search query from magnet link or torrent file',
      });
    }

    try {
      const configRow = app.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'tmdb_api_key'))
        .get();

      const apiKey = configRow?.value || process.env.TMDB_API_KEY;

      const candidates = await app.metadata.searchMedia(searchQuery, mediaType, { apiKey });

      return reply.send({
        query: searchQuery,
        mediaType,
        candidates,
      });
    } catch (err) {
      if (err instanceof MetadataApiError) {
        return reply.status(err.statusCode).send({
          error: 'Bad Gateway',
          message: err.message,
        });
      }

      request.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search metadata',
      });
    }
  });

  // GET /requests/exists
  app.get('/exists', async (request, reply) => {
    const parseResult = existsRequestSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues?.[0]?.message || 'Invalid query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { metadataId, metadataSource, mediaType, seasonNumber, episodeNumber } = parseResult.data;

    let match = null;
    if (mediaType) {
      match = findMatchingCanonicalRequest(app.requestsRepo, {
        mediaType,
        metadataId,
        metadataSource,
        seasonNumber,
        episodeNumber,
      });
    } else {
      if (seasonNumber !== undefined) {
        match = findMatchingCanonicalRequest(app.requestsRepo, {
          mediaType: 'tv_show',
          metadataId,
          metadataSource,
          seasonNumber,
          episodeNumber,
        });
      } else {
        match =
          findMatchingCanonicalRequest(app.requestsRepo, {
            mediaType: 'movie',
            metadataId,
            metadataSource,
          }) ||
          findMatchingCanonicalRequest(app.requestsRepo, {
            mediaType: 'tv_show',
            metadataId,
            metadataSource,
            seasonNumber,
            episodeNumber,
          });
      }
    }

    if (!match) {
      return reply.send({ exists: false });
    }

    if (match.mediaType === 'private') {
      const callerRole = request.currentUser!.role;
      const isAdmin = callerRole === 'admin';
      const isPrimary = match.userId === request.currentUser!.id;
      if (!isAdmin && !(callerRole === 'trusted' && isPrimary)) {
        return reply.send({ exists: false });
      }
    }

    return reply.send({
      exists: true,
      request: {
        id: match.id,
        title: match.title,
        status: match.status,
        mediaType: match.mediaType,
        year: match.year,
        seasonNumber: match.seasonNumber,
        episodeNumber: match.episodeNumber,
      },
    });
  });
};
