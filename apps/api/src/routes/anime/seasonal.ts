import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { requireFeature } from '../../middleware/featureFlags';
import { rankMetadataCandidates, MetadataCandidate } from '../../services/metadata';
import { MediaSeason } from '../../services/animeTypes';
import { parseAnimeTitleAndSeason } from '../../utils/animeTitleCleaner';

const seasonsQuerySchema = z.object({
  season: z.enum(['WINTER', 'SPRING', 'SUMMER', 'FALL']),
  year: z.coerce.number().int().min(1960).max(2100),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(24),
});

const resolveTmdbSchema = z.object({
  anilistId: z.number().optional(),
  title: z.string().min(1),
  romajiTitle: z.string().optional(),
  year: z.number().nullable().optional(),
  format: z.string().optional(),
});

export const animeSeasonalRoutes: FastifyPluginAsync = async (app) => {
  // All /anime routes require authentication and seasonal_anime feature flag
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireFeature('seasonal_anime'));

  // GET /anime/seasonal
  app.get('/seasonal', async (request, reply) => {
    const userId = request.currentUser?.id;
    const jellyfinUserId = request.currentUser?.jellyfinUserId;

    try {
      const sections = await app.animeSeason.getSeasonalSections(userId, jellyfinUserId);
      return reply.send(sections);
    } catch (err) {
      request.log.error(err, 'Failed to fetch seasonal anime sections');
      return reply.send({
        trending: [],
        popularThisSeason: [],
        upcomingNextSeason: [],
        anticipatedSequels: [],
        error: (err as Error).message || 'Failed to fetch seasonal anime',
      });
    }
  });

  // GET /anime/seasons?season=WINTER&year=2025&page=1&perPage=24
  app.get('/seasons', async (request, reply) => {
    const parseResult = seasonsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid season query parameters',
      });
    }

    const { season, year, page, perPage } = parseResult.data;

    try {
      const archive = await app.animeSeason.getSeasonalArchive(
        season as MediaSeason,
        year,
        page,
        perPage
      );
      return reply.send(archive);
    } catch (err) {
      request.log.error(err, `Failed to fetch anime season archive for ${season} ${year}`);
      return reply.status(502).send({
        error: 'Upstream Error',
        message: (err as Error).message || 'Failed to query seasonal archive',
      });
    }
  });

  // POST /anime/resolve-tmdb
  app.post('/resolve-tmdb', async (request, reply) => {
    const parseResult = resolveTmdbSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid payload for TMDB resolution',
      });
    }

    const { title, romajiTitle, year, format } = parseResult.data;
    const mediaType = format?.toUpperCase() === 'MOVIE' ? 'movie' : 'tv_show';

    const parsedTitle = parseAnimeTitleAndSeason(title);
    const parsedRomaji = romajiTitle ? parseAnimeTitleAndSeason(romajiTitle) : null;
    const cleanTitle = parsedTitle.cleanTitle;
    const detectedSeason =
      parsedTitle.seasonNumber > 1
        ? parsedTitle.seasonNumber
        : parsedRomaji && parsedRomaji.seasonNumber > 1
          ? parsedRomaji.seasonNumber
          : 1;

    try {
      // 1. Search TMDB with cleaned title first (e.g. "The Apothecary Diaries")
      const primaryCandidates = await app.metadata.searchTMDB(
        cleanTitle,
        mediaType,
        undefined,
        year ?? undefined
      );

      const allCandidates = [...primaryCandidates];
      const seenIds = new Set(primaryCandidates.map((c) => String(c.id)));

      // 2. If cleanTitle is distinct from original raw title, search raw title as fallback
      if (title.trim().toLowerCase() !== cleanTitle.trim().toLowerCase()) {
        try {
          const rawCandidates = await app.metadata.searchTMDB(
            title,
            mediaType,
            undefined,
            year ?? undefined
          );
          for (const cand of rawCandidates) {
            if (!seenIds.has(String(cand.id))) {
              seenIds.add(String(cand.id));
              allCandidates.push(cand);
            }
          }
        } catch {
          // ignore
        }
      }

      // 3. Search romaji queries if distinct
      const romajiQueries = [parsedRomaji?.cleanTitle, romajiTitle].filter(
        (r): r is string => Boolean(r && r.trim().toLowerCase() !== cleanTitle.trim().toLowerCase())
      );
      for (const rq of romajiQueries) {
        try {
          const romajiCandidates = await app.metadata.searchTMDB(
            rq,
            mediaType,
            undefined,
            year ?? undefined
          );
          for (const cand of romajiCandidates) {
            if (!seenIds.has(String(cand.id))) {
              seenIds.add(String(cand.id));
              allCandidates.push(cand);
            }
          }
        } catch {
          // ignore
        }
      }

      // Rank candidates against cleanTitle and year
      const ranked = rankMetadataCandidates<MetadataCandidate>(
        allCandidates,
        cleanTitle,
        year ?? undefined
      );

      return reply.send({
        candidates: ranked,
        recommended: ranked.length > 0 ? ranked[0] : null,
        cleanTitle,
        detectedSeason,
      });
    } catch (err) {
      request.log.error(err, `Failed to resolve TMDB candidate for anime "${title}"`);
      return reply.status(502).send({
        error: 'Resolution Failed',
        message: (err as Error).message || 'TMDB resolution failed',
      });
    }
  });
};
