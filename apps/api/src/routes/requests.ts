import fs from 'node:fs';
import path from 'node:path';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, adminGuard } from '../middleware/auth';
import { systemConfig, downloadRequests, users, DownloadRequest } from '../db/schema';
import { MetadataApiError } from '../services/metadata';
import { parseTorrentBuffer } from '../services/torrentParser';

const searchMetadataSchema = z
  .object({
    magnetLink: z.string().optional(),
    torrentFileBase64: z.string().optional(),
    mediaType: z.enum(['movie', 'tv_show', 'anime']),
    query: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.magnetLink && data.magnetLink.trim().length > 0) ||
          data.torrentFileBase64 ||
          (data.query && data.query.trim().length > 0)
      ),
    {
      message: 'Either magnetLink, torrentFileBase64, or explicit query is required',
    }
  );

const createRequestSchema = z
  .object({
    magnetLink: z.string().optional(),
    torrentFileBase64: z.string().optional(),
    torrentFileName: z.string().optional(),
    mediaType: z.enum(['movie', 'tv_show', 'anime']),
    metadataId: z.string().min(1, 'Metadata ID is required'),
    metadataSource: z.enum(['tmdb', 'anilist']),
    title: z.string().min(1, 'Title is required'),
    year: z.number().int().optional(),
    seasonNumber: z.number().int().optional(),
  })
  .refine(
    (data) => Boolean((data.magnetLink && data.magnetLink.trim().length > 0) || data.torrentFileBase64),
    {
      message: 'Either magnetLink or torrentFileBase64 is required',
    }
  );

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

    const { magnetLink, torrentFileBase64, mediaType, query: explicitQuery } = parseResult.data;

    let searchQuery = explicitQuery && explicitQuery.trim().length > 0 ? explicitQuery.trim() : '';

    if (!searchQuery && torrentFileBase64) {
      try {
        const parsed = parseTorrentBuffer(Buffer.from(torrentFileBase64, 'base64'));
        searchQuery = parsed.name;
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

    const {
      magnetLink,
      torrentFileBase64,
      torrentFileName,
      mediaType,
      metadataId,
      metadataSource,
      title,
      year,
      seasonNumber,
    } = parseResult.data;

    let torrentBuffer: Buffer | null = null;
    let effectiveMagnetLink = magnetLink || '';

    if (torrentFileBase64) {
      try {
        torrentBuffer = Buffer.from(torrentFileBase64, 'base64');
        const parsed = parseTorrentBuffer(torrentBuffer);
        if (!effectiveMagnetLink) {
          effectiveMagnetLink = parsed.magnetUri;
        }
      } catch (err) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid or corrupt .torrent file',
        });
      }
    }

    if (!effectiveMagnetLink) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Could not resolve magnet link or torrent file',
      });
    }

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
    let torrentFilePath: string | null = null;
    const stagingPath = process.env.STAGING_PATH || '/media_data/downloads/staging';
    const requestId = randomUUID();

    if (activeCount < concurrentLimit) {
      try {
        if (torrentBuffer) {
          qbTorrentHash = await app.qbittorrent.addTorrentFile(
            torrentBuffer,
            stagingPath,
            torrentFileName || `${title}.torrent`
          );
        } else {
          qbTorrentHash = await app.qbittorrent.addTorrent(effectiveMagnetLink, stagingPath);
        }
        status = 'downloading';
      } catch (err) {
        request.log.error(err, 'Could not add torrent to qBittorrent immediately, falling back to queued');
        status = 'queued';
      }
    }

    // If queued and we have a torrent file, save it temporarily on disk for the poller
    if (status === 'queued' && torrentBuffer) {
      const torrentsDir = path.resolve(path.dirname(stagingPath), 'torrents');
      if (!fs.existsSync(torrentsDir)) {
        fs.mkdirSync(torrentsDir, { recursive: true });
      }
      torrentFilePath = path.join(torrentsDir, `${requestId}.torrent`);
      fs.writeFileSync(torrentFilePath, torrentBuffer);
    }

    // 3. Insert record in download_requests table
    const newRequest: DownloadRequest = {
      id: requestId,
      userId: request.currentUser!.id,
      magnetLink: effectiveMagnetLink,
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
      scheduledDeleteAt: null,
      sizeBytes: null,
      torrentFilePath,
    };

    app.db.insert(downloadRequests).values(newRequest).run();

    return reply.status(201).send({ request: newRequest });
  });

  // GET /requests — list requests
  app.get('/', async (request, reply) => {
    const isAdmin = request.currentUser!.role === 'admin';

    const selectFields = {
      id: downloadRequests.id,
      userId: downloadRequests.userId,
      magnetLink: downloadRequests.magnetLink,
      mediaType: downloadRequests.mediaType,
      status: downloadRequests.status,
      metadataId: downloadRequests.metadataId,
      metadataSource: downloadRequests.metadataSource,
      title: downloadRequests.title,
      year: downloadRequests.year,
      seasonNumber: downloadRequests.seasonNumber,
      jellyfinPath: downloadRequests.jellyfinPath,
      keepFlag: downloadRequests.keepFlag,
      qbTorrentHash: downloadRequests.qbTorrentHash,
      errorMessage: downloadRequests.errorMessage,
      requestedAt: downloadRequests.requestedAt,
      downloadedAt: downloadRequests.downloadedAt,
      lastPlayedAt: downloadRequests.lastPlayedAt,
      scheduledDeleteAt: downloadRequests.scheduledDeleteAt,
      sizeBytes: downloadRequests.sizeBytes,
      requesterUsername: users.username,
    };

    let list;
    if (isAdmin) {
      list = app.db
        .select(selectFields)
        .from(downloadRequests)
        .leftJoin(users, eq(downloadRequests.userId, users.id))
        .orderBy(desc(downloadRequests.requestedAt))
        .all();
    } else {
      list = app.db
        .select(selectFields)
        .from(downloadRequests)
        .leftJoin(users, eq(downloadRequests.userId, users.id))
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