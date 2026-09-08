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
import { cleanTorrentTitle } from '../utils/torrentTitleCleaner';

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
    episodeNumber: z.number().int().optional(),
  })
  .refine(
    (data) => Boolean((data.magnetLink && data.magnetLink.trim().length > 0) || data.torrentFileBase64),
    {
      message: 'Either magnetLink or torrentFileBase64 is required',
    }
  );

const batchItemSchema = z
  .object({
    magnetLink: z.string().optional(),
    torrentFileBase64: z.string().optional(),
    torrentFileName: z.string().optional(),
    mediaType: z.enum(['movie', 'tv_show', 'anime']).optional(),
    metadataId: z.string().optional(),
    metadataSource: z.enum(['tmdb', 'anilist']).optional(),
    title: z.string().optional(),
    year: z.number().int().optional(),
    seasonNumber: z.number().int().optional(),
    episodeNumber: z.number().int().optional(),
  })
  .refine(
    (data) => Boolean((data.magnetLink && data.magnetLink.trim().length > 0) || data.torrentFileBase64),
    {
      message: 'Either magnetLink or torrentFileBase64 is required for each batch item',
    }
  );

const batchRequestSchema = z.object({
  mediaType: z.enum(['movie', 'tv_show', 'anime']).optional(),
  metadataId: z.string().optional(),
  metadataSource: z.enum(['tmdb', 'anilist']).optional(),
  title: z.string().optional(),
  year: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  items: z.array(batchItemSchema).min(1, 'At least one item is required in the batch'),
});

const searchReleasesSchema = z.object({
  metadataId: z.string().min(1, 'Metadata ID is required'),
  metadataSource: z.enum(['tmdb', 'anilist']),
  mediaType: z.enum(['movie', 'tv_show', 'anime']),
  title: z.string().min(1, 'Title is required'),
  year: z.number().int().optional().nullable(),
  seasonNumber: z.number().int().optional().nullable(),
  episodeNumber: z.number().int().optional().nullable(),
  romajiTitle: z.string().optional().nullable(),
  englishTitle: z.string().optional().nullable(),
});

export const requestRoutes: FastifyPluginAsync = async (app) => {
  // All /requests routes require authentication
  app.addHook('preHandler', authMiddleware);

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

    // 1. Host disk safety check (< 10 GB free on host disk or below reject threshold)
    const hostDiskSafe = app.cleanup.isHostDiskSafe ? app.cleanup.isHostDiskSafe() : true;
    const space = app.cleanup.isSpaceSufficient ? app.cleanup.isSpaceSufficient() : { sufficient: true, percentFree: 100, threshold: 15 };
    if (!hostDiskSafe || !space.sufficient) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: !hostDiskSafe
          ? 'Insufficient host disk space (< 10 GB free)'
          : `Insufficient disk space (${space.percentFree}% free, minimum required is ${space.threshold}%)`,
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
      episodeNumber,
    } = parseResult.data;

    let torrentBuffer: Buffer | null = null;
    let effectiveMagnetLink = magnetLink || '';
    let torrentSizeBytes: number | null = null;

    if (torrentFileBase64) {
      try {
        torrentBuffer = Buffer.from(torrentFileBase64, 'base64');
        const parsed = parseTorrentBuffer(torrentBuffer);
        if (!effectiveMagnetLink) {
          effectiveMagnetLink = parsed.magnetUri;
        }
        torrentSizeBytes = parsed.totalSize || null;
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

    // 2. Check storage quota usage (85% threshold for deferral)
    const quotaRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'storage_quota_gb'))
      .get();

    const storageQuotaGb = quotaRow ? parseInt(quotaRow.value, 10) : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
    const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
    const currentFootprintBytes = app.fileSystem.getStorageFootprintBytes ? app.fileSystem.getStorageFootprintBytes() : 0;
    const isQuotaExceeded = storageQuotaBytes > 0 && (currentFootprintBytes / storageQuotaBytes) >= 0.85;

    let status: 'queued' | 'downloading' = 'queued';
    let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
    let qbTorrentHash: string | null = null;
    let torrentFilePath: string | null = null;
    const stagingPath = process.env.STAGING_PATH || '/media_data/downloads/staging';
    const requestId = randomUUID();

    if (isQuotaExceeded) {
      // Defer request into queued waiting for space
      status = 'queued';
      deferredReason = 'waiting_for_space';
    } else {
      // Storage quota has headroom: check concurrent limit
      const configRow = app.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'concurrent_limit'))
        .get();

      const concurrentLimit = configRow ? parseInt(configRow.value, 10) : 2;
      const activeCount = await app.qbittorrent.getActiveTorrentCount();

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
          deferredReason = null;
        } catch (err) {
          request.log.error(err, 'Could not add torrent to qBittorrent immediately, falling back to queued');
          status = 'queued';
          deferredReason = 'waiting_for_slot';
        }
      } else {
        status = 'queued';
        deferredReason = 'waiting_for_slot';
      }
    }

    // If queued and we have a torrent file, save it temporarily on disk for resumption
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
      episodeNumber: episodeNumber ?? null,
      jellyfinPath: null,
      keepFlag: false,
      qbTorrentHash,
      errorMessage: null,
      requestedAt: new Date().toISOString(),
      downloadedAt: null,
      lastPlayedAt: null,
      scheduledDeleteAt: null,
      sizeBytes: torrentSizeBytes,
      torrentFilePath,
      deferredReason,
    };

    app.db.insert(downloadRequests).values(newRequest).run();

    return reply.status(201).send({ request: newRequest });
  });

  // POST /requests/batch — create batch download requests atomically
  app.post('/batch', async (request, reply) => {
    const parseResult = batchRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const {
      mediaType: topMediaType,
      metadataId: topMetadataId,
      metadataSource: topMetadataSource,
      title: topTitle,
      year: topYear,
      seasonNumber: topSeasonNumber,
      items,
    } = parseResult.data;

    // Validate that every item has required metadata
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const mType = item.mediaType || topMediaType;
      const mId = item.metadataId || topMetadataId;
      const mSource = item.metadataSource || topMetadataSource;
      const t = item.title || topTitle;

      if (!mType || !mId || !mSource || !t) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Item #${i + 1} is missing required metadata (mediaType, metadataId, metadataSource, or title)`,
        });
      }
    }

    // 1. Host disk safety check
    const hostDiskSafe = app.cleanup.isHostDiskSafe ? app.cleanup.isHostDiskSafe() : true;
    const space = app.cleanup.isSpaceSufficient ? app.cleanup.isSpaceSufficient() : { sufficient: true, percentFree: 100, threshold: 15 };
    if (!hostDiskSafe || !space.sufficient) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: !hostDiskSafe
          ? 'Insufficient host disk space (< 10 GB free)'
          : `Insufficient disk space (${space.percentFree}% free, minimum required is ${space.threshold}%)`,
      });
    }

    // 2. Storage quota check (85% threshold)
    const quotaRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'storage_quota_gb'))
      .get();

    const storageQuotaGb = quotaRow ? parseInt(quotaRow.value, 10) : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
    const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
    const currentFootprintBytes = app.fileSystem.getStorageFootprintBytes ? app.fileSystem.getStorageFootprintBytes() : 0;
    const isQuotaExceeded = storageQuotaBytes > 0 && (currentFootprintBytes / storageQuotaBytes) >= 0.85;

    // 3. Concurrent slots calculation
    const configRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'concurrent_limit'))
      .get();

    const concurrentLimit = configRow ? parseInt(configRow.value, 10) : 2;
    const activeCount = await app.qbittorrent.getActiveTorrentCount();
    let availableSlots = isQuotaExceeded ? 0 : Math.max(0, concurrentLimit - activeCount);

    const stagingPath = process.env.STAGING_PATH || '/media_data/downloads/staging';
    const torrentsDir = path.resolve(path.dirname(stagingPath), 'torrents');

    const newRequests: DownloadRequest[] = [];

    for (const item of items) {
      const mediaType = (item.mediaType || topMediaType)!;
      const metadataId = (item.metadataId || topMetadataId)!;
      const metadataSource = (item.metadataSource || topMetadataSource)!;
      const title = (item.title || topTitle)!;
      const year = item.year ?? topYear ?? null;
      const seasonNumber = item.seasonNumber ?? topSeasonNumber ?? null;
      const episodeNumber = item.episodeNumber ?? null;

      let torrentBuffer: Buffer | null = null;
      let effectiveMagnetLink = item.magnetLink || '';
      let torrentSizeBytes: number | null = null;

      if (item.torrentFileBase64) {
        try {
          torrentBuffer = Buffer.from(item.torrentFileBase64, 'base64');
          const parsed = parseTorrentBuffer(torrentBuffer);
          if (!effectiveMagnetLink) {
            effectiveMagnetLink = parsed.magnetUri;
          }
          torrentSizeBytes = parsed.totalSize || null;
        } catch (err) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Invalid or corrupt .torrent file in batch: ${item.torrentFileName || 'unnamed'}`,
          });
        }
      }

      if (!effectiveMagnetLink) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Could not resolve magnet link or torrent file for ${title}`,
        });
      }

      const requestId = randomUUID();
      let status: 'queued' | 'downloading' = 'queued';
      let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
      let qbTorrentHash: string | null = null;
      let torrentFilePath: string | null = null;

      if (isQuotaExceeded) {
        status = 'queued';
        deferredReason = 'waiting_for_space';
      } else if (availableSlots > 0) {
        try {
          if (torrentBuffer) {
            qbTorrentHash = await app.qbittorrent.addTorrentFile(
              torrentBuffer,
              stagingPath,
              item.torrentFileName || `${title}.torrent`
            );
          } else {
            qbTorrentHash = await app.qbittorrent.addTorrent(effectiveMagnetLink, stagingPath);
          }
          status = 'downloading';
          deferredReason = null;
          availableSlots--;
        } catch (err) {
          request.log.error(err, `Failed to add batch item ${title} immediately, falling back to queued`);
          status = 'queued';
          deferredReason = 'waiting_for_slot';
        }
      } else {
        status = 'queued';
        deferredReason = 'waiting_for_slot';
      }

      if (status === 'queued' && torrentBuffer) {
        if (!fs.existsSync(torrentsDir)) {
          fs.mkdirSync(torrentsDir, { recursive: true });
        }
        torrentFilePath = path.join(torrentsDir, `${requestId}.torrent`);
        fs.writeFileSync(torrentFilePath, torrentBuffer);
      }

      newRequests.push({
        id: requestId,
        userId: request.currentUser!.id,
        magnetLink: effectiveMagnetLink,
        mediaType,
        status,
        metadataId,
        metadataSource,
        title,
        year,
        seasonNumber,
        episodeNumber,
        jellyfinPath: null,
        keepFlag: false,
        qbTorrentHash,
        errorMessage: null,
        requestedAt: new Date().toISOString(),
        downloadedAt: null,
        lastPlayedAt: null,
        scheduledDeleteAt: null,
        sizeBytes: torrentSizeBytes,
        torrentFilePath,
        deferredReason,
      });
    }

    // 4. Atomic transaction insertion into SQLite
    const insertStmt = app.sqlite.prepare(`
      INSERT INTO download_requests (
        id, user_id, magnet_link, media_type, status, metadata_id, metadata_source,
        title, year, season_number, episode_number, jellyfin_path, keep_flag,
        qb_torrent_hash, error_message, requested_at, downloaded_at, last_played_at,
        scheduled_delete_at, size_bytes, torrent_file_path, deferred_reason
      ) VALUES (
        @id, @userId, @magnetLink, @mediaType, @status, @metadataId, @metadataSource,
        @title, @year, @seasonNumber, @episodeNumber, @jellyfinPath, @keepFlag,
        @qbTorrentHash, @errorMessage, @requestedAt, @downloadedAt, @lastPlayedAt,
        @scheduledDeleteAt, @sizeBytes, @torrentFilePath, @deferredReason
      )
    `);

    const insertMany = app.sqlite.transaction((reqs: DownloadRequest[]) => {
      for (const req of reqs) {
        insertStmt.run({
          ...req,
          keepFlag: req.keepFlag ? 1 : 0,
        });
      }
    });

    insertMany(newRequests);

    return reply.status(201).send({
      requests: newRequests,
      count: newRequests.length,
    });
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
      episodeNumber: downloadRequests.episodeNumber,
      jellyfinPath: downloadRequests.jellyfinPath,
      keepFlag: downloadRequests.keepFlag,
      qbTorrentHash: downloadRequests.qbTorrentHash,
      errorMessage: downloadRequests.errorMessage,
      requestedAt: downloadRequests.requestedAt,
      downloadedAt: downloadRequests.downloadedAt,
      lastPlayedAt: downloadRequests.lastPlayedAt,
      scheduledDeleteAt: downloadRequests.scheduledDeleteAt,
      sizeBytes: downloadRequests.sizeBytes,
      deferredReason: downloadRequests.deferredReason,
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