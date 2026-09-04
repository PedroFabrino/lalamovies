import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, adminGuard } from '../middleware/auth';
import { systemConfig, downloadRequests, DownloadRequest } from '../db/schema';
import { MetadataApiError } from '../services/metadata';

const searchMetadataSchema = z.object({
  magnetLink: z.string().min(1, 'Magnet link is required'),
  mediaType: z.enum(['movie', 'tv_show', 'anime']),
  query: z.string().optional(),
});

const createRequestSchema = z.object({
  magnetLink: z.string().min(1, 'Magnet link is required'),
  mediaType: z.enum(['movie', 'tv_show', 'anime']),
  metadataId: z.string().min(1, 'Metadata ID is required'),
  metadataSource: z.enum(['tmdb', 'anilist']),
  title: z.string().min(1, 'Title is required'),
  year: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
});

export const requestRoutes: FastifyPluginAsync = async (app) => {
  // All /requests routes require authentication
  app.addHook('preHandler', authMiddleware);

  // POST /requests/search-metadata
  app.post('/search-metadata', async (request, reply) => {
    const parseResult = searchMetadataSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const { magnetLink, mediaType, query: explicitQuery } = parseResult.data;

    const searchQuery =
      explicitQuery && explicitQuery.trim().length > 0
        ? explicitQuery.trim()
        : app.metadata.extractTitleFromMagnet(magnetLink);

    if (!searchQuery) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Could not extract search query from magnet link',
      });
    }

    try {
      if (mediaType === 'anime') {
        const candidates = await app.metadata.searchAniList(searchQuery);
        return reply.send({
          query: searchQuery,
          mediaType,
          candidates,
        });
      }

      const configRow = app.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'tmdb_api_key'))
        .get();

      const apiKey = configRow?.value || process.env.TMDB_API_KEY;

      const candidates = await app.metadata.searchTMDB(searchQuery, mediaType, apiKey);
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

  // POST /requests — create download request
  app.post('/', async (request, reply) => {
    const parseResult = createRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    // 1. Check disk space against reject threshold
    const space = app.cleanup.isSpaceSufficient();
    if (!space.sufficient) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: `Insufficient disk space (${space.percentFree}% free, minimum required is ${space.threshold}%)`,
      });
    }

    const { magnetLink, mediaType, metadataId, metadataSource, title, year, seasonNumber } =
      parseResult.data;

    // 2. Check concurrent download limit
    const configRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'concurrent_limit'))
      .get();

    const concurrentLimit = configRow ? parseInt(configRow.value, 10) : 2;
    const activeCount = await app.qbittorrent.getActiveTorrentCount();

    let status: 'queued' | 'downloading' = 'queued';
    let qbTorrentHash: string | null = null;

    if (activeCount < concurrentLimit) {
      const stagingPath = process.env.STAGING_PATH || '/media_data/downloads/staging';
      try {
        qbTorrentHash = await app.qbittorrent.addTorrent(magnetLink, stagingPath);
        status = 'downloading';
      } catch (err) {
        request.log.error(err, 'Could not add torrent to qBittorrent immediately, falling back to queued');
        status = 'queued';
      }
    }

    // 3. Insert record in download_requests table
    const newRequest: DownloadRequest = {
      id: randomUUID(),
      userId: request.currentUser!.id,
      magnetLink,
      mediaType,
      status,
      metadataId,
      metadataSource,
      title,
      year: year ?? null,
      seasonNumber: seasonNumber ?? null,
      jellyfinPath: null,
      keepFlag: false,
      qbTorrentHash,
      errorMessage: null,
      requestedAt: new Date().toISOString(),
      downloadedAt: null,
      lastPlayedAt: null,
      sizeBytes: null,
    };

    app.db.insert(downloadRequests).values(newRequest).run();

    return reply.status(201).send({ request: newRequest });
  });

  // GET /requests — list requests
  app.get('/', async (request, reply) => {
    const isAdmin = request.currentUser!.role === 'admin';

    let list: DownloadRequest[];
    if (isAdmin) {
      list = app.db
        .select()
        .from(downloadRequests)
        .orderBy(desc(downloadRequests.requestedAt))
        .all();
    } else {
      list = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.userId, request.currentUser!.id))
        .orderBy(desc(downloadRequests.requestedAt))
        .all();
    }

    return reply.send({ requests: list });
  });

  // GET /requests/:id — get single request
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, id))
      .get();

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const isAdmin = request.currentUser!.role === 'admin';
    if (!isAdmin && item.userId !== request.currentUser!.id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    return reply.send({ request: item });
  });

  // PATCH /requests/:id/keep — admin toggle keepFlag
  app.patch('/:id/keep', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, id))
      .get();

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const newKeepFlag = !item.keepFlag;
    app.db
      .update(downloadRequests)
      .set({ keepFlag: newKeepFlag })
      .where(eq(downloadRequests.id, id))
      .run();

    item.keepFlag = newKeepFlag;
    return reply.send({ request: item });
  });

  // DELETE /requests/:id — delete/cleanup request
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, id))
      .get();

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const isAdmin = request.currentUser!.role === 'admin';
    if (!isAdmin && item.userId !== request.currentUser!.id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    await app.cleanup.cleanItem(id);
    return reply.send({ ok: true });
  });
};