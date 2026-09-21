import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, desc, and, ne } from 'drizzle-orm';
import { adminGuard } from '../../middleware/auth';
import { requireFeature } from '../../middleware/featureFlags';
import { systemConfig, downloadRequests, users, DownloadRequest, requestCoRequesters } from '../../db/schema';
import { TorrentInfo } from '../../services/qbittorrent';
import { parseTorrentBuffer } from '../../services/torrentParser';
import {
  findMatchingCanonicalRequest,
  findCanonicalSeriesInfo,
  addCoRequester,
  globalRequestMutex,
  getDedupLockKey,
} from '../../services/requestDedup';
import { RequestStatus } from '../../services/requestStateMachine';
import { createRequestSchema, batchRequestSchema } from './schemas';

export const lifecycleRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests — create download request
  app.post('/', { preHandler: [requireFeature('manual_torrents')] }, async (request, reply) => {
    const parseResult = createRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
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
      waitlistNextSeason,
      coRequesterUserIds,
    } = parseResult.data;

    if (mediaType === 'private') {
      const callerRole = request.currentUser!.role;
      if (callerRole !== 'trusted' && callerRole !== 'admin') {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Only trusted or admin users can submit private requests',
        });
      }
      if (metadataSource !== 'tmdb') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Private requests only support TMDB metadata source',
        });
      }
    }

    const canonicalSeries = findCanonicalSeriesInfo(app.db, {
      metadataId,
      metadataSource,
      mediaType,
    });
    const effectiveTitle = canonicalSeries?.title || title;
    const effectiveMediaType = canonicalSeries?.mediaType || mediaType;

    const triggerNextSeasonWaitlist = async () => {
      if (
        waitlistNextSeason &&
        ['tv_show', 'anime'].includes(effectiveMediaType) &&
        seasonNumber !== undefined &&
        seasonNumber !== null &&
        (episodeNumber === undefined || episodeNumber === null)
      ) {
        const watcherUrl = app.watcherUrl || process.env.WATCHER_URL;
        const serviceApiKey = app.serviceApiKey || process.env.SERVICE_API_KEY;
        if (watcherUrl) {
          const cleanWatcherUrl = watcherUrl.replace(/\/+$/, '');
          const targetSeason = seasonNumber + 1;
          try {
            const res = await fetch(`${cleanWatcherUrl}/waitlist`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(serviceApiKey ? { 'x-service-key': serviceApiKey } : {}),
                'x-user-id': request.currentUser!.id,
              },
              body: JSON.stringify({
                userId: request.currentUser!.id,
                mediaType: effectiveMediaType,
                metadataId,
                metadataSource,
                title: effectiveTitle,
                year,
                seasonNumber: targetSeason,
                isNextSeason: true,
              }),
            });
            if (!res.ok) {
              request.log.warn(`Failed to create next-season waitlist entry: HTTP ${res.status}`);
            }
          } catch (err) {
            request.log.warn(err, 'Failed to reach Watcher service for next-season waitlist creation');
          }
        }
      }
    };

    const lockKey = getDedupLockKey({
      mediaType: effectiveMediaType,
      metadataId,
      metadataSource,
      seasonNumber,
      episodeNumber,
    });

    return globalRequestMutex.runExclusive(lockKey, async () => {
      // 1. Check for existing canonical request
      const existing = findMatchingCanonicalRequest(app.db, {
        mediaType: effectiveMediaType,
        metadataId,
        metadataSource,
        seasonNumber,
        episodeNumber,
      });

      if (existing) {
        await triggerNextSeasonWaitlist();

        if (existing.userId !== request.currentUser!.id) {
          addCoRequester(app.db, existing.id, request.currentUser!.id);
        }

        if (coRequesterUserIds && Array.isArray(coRequesterUserIds)) {
          for (const uid of coRequesterUserIds) {
            if (uid && uid !== existing.userId) {
              try {
                addCoRequester(app.db, existing.id, uid);
              } catch (err) {
                request.log.warn(err, `Failed to add co-requester ${uid}`);
              }
            }
          }
        }

        return reply.status(200).send({ request: existing });
      }

      // 2. Host disk safety check (< 10 GB free on host disk or below reject threshold)
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

      // 3. Check storage quota usage (85% threshold for deferral)
      const quotaRow = app.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'storage_quota_gb'))
        .get();

      const storageQuotaGb = quotaRow ? parseInt(quotaRow.value, 10) : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
      const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
      const currentFootprintBytes = app.fileSystem.getStorageFootprintBytes ? await app.fileSystem.getStorageFootprintBytes() : 0;
      const isQuotaExceeded = storageQuotaBytes > 0 && (currentFootprintBytes / storageQuotaBytes) >= 0.85;

      let status: typeof RequestStatus.QUEUED | typeof RequestStatus.DOWNLOADING = RequestStatus.QUEUED;
      let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
      let qbTorrentHash: string | null = null;
      let torrentFilePath: string | null = null;
      const stagingPath = process.env.STAGING_PATH || '/media_data/downloads/staging';
      const requestId = randomUUID();

      if (isQuotaExceeded) {
        // Defer request into queued waiting for space
        status = RequestStatus.QUEUED;
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
            status = RequestStatus.DOWNLOADING;
            deferredReason = null;
          } catch (err) {
            request.log.error(err, 'Could not add torrent to qBittorrent immediately, falling back to queued');
            status = RequestStatus.QUEUED;
            deferredReason = 'waiting_for_slot';
          }
        } else {
          status = RequestStatus.QUEUED;
          deferredReason = 'waiting_for_slot';
        }
      }

      // If queued and we have a torrent file, save it temporarily on disk for resumption
      if (status === RequestStatus.QUEUED && torrentBuffer) {
        const torrentsDir = path.resolve(path.dirname(stagingPath), 'torrents');
        if (!fs.existsSync(torrentsDir)) {
          fs.mkdirSync(torrentsDir, { recursive: true });
        }
        torrentFilePath = path.join(torrentsDir, `${requestId}.torrent`);
        fs.writeFileSync(torrentFilePath, torrentBuffer);
      }

      // 4. Insert record in download_requests table
      const newRequest: DownloadRequest = {
        id: requestId,
        userId: request.currentUser!.id,
        magnetLink: effectiveMagnetLink,
        mediaType: effectiveMediaType,
        status,
        metadataId,
        metadataSource,
        title: effectiveTitle,
        year: year ?? null,
        seasonNumber: seasonNumber ?? null,
        episodeNumber: episodeNumber ?? null,
        jellyfinPath: null,
        keepFlag: effectiveMediaType === 'private' ? true : false,
        qbTorrentHash,
        errorMessage: null,
        requestedAt: new Date().toISOString(),
        downloadedAt: null,
        lastPlayedAt: null,
        scheduledDeleteAt: null,
        sizeBytes: torrentSizeBytes,
        torrentFilePath,
        deferredReason,
        transcriptionStatus: 'none',
        transcriptionError: null,
      };

      app.requestsRepo.create(newRequest);

      if (coRequesterUserIds && Array.isArray(coRequesterUserIds)) {
        for (const uid of coRequesterUserIds) {
          if (uid && uid !== request.currentUser!.id) {
            try {
              addCoRequester(app.db, newRequest.id, uid);
            } catch (err) {
              request.log.warn(err, `Failed to add co-requester ${uid}`);
            }
          }
        }
      }

      await triggerNextSeasonWaitlist();

      return reply.status(201).send({ request: newRequest });
    });
  });

  // POST /requests/batch — create batch download requests atomically
  app.post('/batch', { preHandler: [requireFeature('batch_uploads')] }, async (request, reply) => {
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

      if (mType === 'private') {
        const callerRole = request.currentUser!.role;
        if (callerRole !== 'trusted' && callerRole !== 'admin') {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Only trusted or admin users can submit private requests',
          });
        }
        if (mSource !== 'tmdb') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Private requests only support TMDB metadata source',
          });
        }
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
    const currentFootprintBytes = app.fileSystem.getStorageFootprintBytes ? await app.fileSystem.getStorageFootprintBytes() : 0;
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
      const rawMediaType = (item.mediaType || topMediaType)!;
      const metadataId = (item.metadataId || topMetadataId)!;
      const metadataSource = (item.metadataSource || topMetadataSource)!;
      const rawTitle = (item.title || topTitle)!;

      const canonicalSeries = findCanonicalSeriesInfo(app.db, {
        metadataId,
        metadataSource,
        mediaType: rawMediaType,
      });
      const mediaType = canonicalSeries?.mediaType || rawMediaType;
      const title = canonicalSeries?.title || rawTitle;

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
      let status: typeof RequestStatus.QUEUED | typeof RequestStatus.DOWNLOADING = RequestStatus.QUEUED;
      let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
      let qbTorrentHash: string | null = null;
      let torrentFilePath: string | null = null;

      if (isQuotaExceeded) {
        status = RequestStatus.QUEUED;
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
          status = RequestStatus.DOWNLOADING;
          deferredReason = null;
          availableSlots--;
        } catch (err) {
          request.log.error(err, `Failed to add batch item ${title} immediately, falling back to queued`);
          status = RequestStatus.QUEUED;
          deferredReason = 'waiting_for_slot';
        }
      } else {
        status = RequestStatus.QUEUED;
        deferredReason = 'waiting_for_slot';
      }

      if (status === RequestStatus.QUEUED && torrentBuffer) {
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
        keepFlag: mediaType === 'private' ? true : false,
        qbTorrentHash,
        errorMessage: null,
        requestedAt: new Date().toISOString(),
        downloadedAt: null,
        lastPlayedAt: null,
        scheduledDeleteAt: null,
        sizeBytes: torrentSizeBytes,
        torrentFilePath,
        deferredReason,
        transcriptionStatus: 'none',
        transcriptionError: null,
      });
    }

    // 4. Atomic transaction insertion into SQLite
    const insertStmt = app.sqlite.prepare(`
      INSERT INTO download_requests (
        id, user_id, magnet_link, media_type, status, metadata_id, metadata_source,
        title, year, season_number, episode_number, jellyfin_path, keep_flag,
        qb_torrent_hash, error_message, requested_at, downloaded_at, last_played_at,
        scheduled_delete_at, size_bytes, torrent_file_path, deferred_reason,
        transcription_status, transcription_error
      ) VALUES (
        @id, @userId, @magnetLink, @mediaType, @status, @metadataId, @metadataSource,
        @title, @year, @seasonNumber, @episodeNumber, @jellyfinPath, @keepFlag,
        @qbTorrentHash, @errorMessage, @requestedAt, @downloadedAt, @lastPlayedAt,
        @scheduledDeleteAt, @sizeBytes, @torrentFilePath, @deferredReason,
        @transcriptionStatus, @transcriptionError
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
    const currentUserId = request.currentUser!.id;

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
      transcriptionStatus: downloadRequests.transcriptionStatus,
      transcriptionError: downloadRequests.transcriptionError,
      requesterUsername: users.username,
    };

    if (isAdmin) {
      const rawList = app.db
        .select(selectFields)
        .from(downloadRequests)
        .leftJoin(users, eq(downloadRequests.userId, users.id))
        .where(ne(downloadRequests.status, RequestStatus.DELETED))
        .orderBy(desc(downloadRequests.requestedAt))
        .all();

      const coReqMap = new Map<string, string[]>();
      const allCoRequesters = app.db
        .select({
          requestId: requestCoRequesters.requestId,
          username: users.username,
        })
        .from(requestCoRequesters)
        .leftJoin(users, eq(requestCoRequesters.userId, users.id))
        .all();

      for (const cr of allCoRequesters) {
        if (!coReqMap.has(cr.requestId)) {
          coReqMap.set(cr.requestId, []);
        }
        if (cr.username) {
          coReqMap.get(cr.requestId)!.push(cr.username);
        }
      }

      const list = rawList.map((item) => ({
        ...item,
        isPrimaryRequester: item.userId === currentUserId,
        coRequesters: coReqMap.get(item.id) || [],
      }));

      return reply.send({ requests: list });
    } else {
      // Non-admin: primary requests + co-requested requests
      const primaryRows = app.db
        .select(selectFields)
        .from(downloadRequests)
        .leftJoin(users, eq(downloadRequests.userId, users.id))
        .where(
          and(
            eq(downloadRequests.userId, currentUserId),
            ne(downloadRequests.status, RequestStatus.DELETED)
          )
        )
        .all();

      const coRequestRows = app.db
        .select(selectFields)
        .from(requestCoRequesters)
        .innerJoin(downloadRequests, eq(requestCoRequesters.requestId, downloadRequests.id))
        .leftJoin(users, eq(downloadRequests.userId, users.id))
        .where(
          and(
            eq(requestCoRequesters.userId, currentUserId),
            ne(downloadRequests.status, RequestStatus.DELETED)
          )
        )
        .all();

      const primaryMapped = primaryRows.map((r) => ({
        ...r,
        isPrimaryRequester: true,
        coRequesters: [],
      }));

      const coMapped = coRequestRows.map((r) => ({
        ...r,
        isPrimaryRequester: false,
        coRequesters: [],
      }));

      const seen = new Set<string>();
      const combined: typeof primaryMapped = [];
      for (const item of [...primaryMapped, ...coMapped]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          combined.push(item);
        }
      }
      combined.sort(
        (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      const callerRole = request.currentUser!.role;
      const filtered = combined.filter((item) => {
        if (item.mediaType === 'private') {
          return callerRole === 'trusted' && item.userId === currentUserId;
        }
        return true;
      });

      return reply.send({ requests: filtered });
    }
  });

  // GET /requests/:id — get single request
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const callerRole = request.currentUser!.role;
    const isAdmin = callerRole === 'admin';
    const isPrimary = item.userId === request.currentUser!.id;

    if (item.mediaType === 'private') {
      if (!isAdmin && !(callerRole === 'trusted' && isPrimary)) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Download request not found',
        });
      }
    }

    let isCoRequester = false;

    if (!isAdmin && !isPrimary) {
      const coReq = app.db
        .select()
        .from(requestCoRequesters)
        .where(
          and(
            eq(requestCoRequesters.requestId, item.id),
            eq(requestCoRequesters.userId, request.currentUser!.id)
          )
        )
        .get();
      isCoRequester = Boolean(coReq);
    }

    if (!isAdmin && !isPrimary && !isCoRequester) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    return reply.send({
      request: {
        ...item,
        isPrimaryRequester: isPrimary,
      },
    });
  });

  // PATCH /requests/:id/keep — admin toggle keepFlag
  app.patch('/:id/keep', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (item.mediaType === 'private') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cannot toggle keep flag for private media requests; private requests have a permanent keep flag.',
      });
    }

    const newKeepFlag = !item.keepFlag;
    app.requestsRepo.update(id, { keepFlag: newKeepFlag });

    item.keepFlag = newKeepFlag;
    return reply.send({ request: item });
  });

  // POST /requests/:id/retry — admin retry failed request
  app.post('/:id/retry', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (item.status !== 'error') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Only requests in error state can be retried',
      });
    }

    const stagingPath = process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads', 'staging');
    let destPath = item.jellyfinPath;
    let isComplete = false;
    let torrentSize = item.sizeBytes;

    if (destPath && fs.existsSync(destPath)) {
      isComplete = true;
    }

    // If not found at jellyfinPath, check qBittorrent & staging
    if (!isComplete && item.qbTorrentHash) {
      try {
        const torrents = app.qbittorrent.getAllTorrents ? await app.qbittorrent.getAllTorrents() : [];
        const found = torrents.find((t: TorrentInfo) => t.hash.toLowerCase() === item.qbTorrentHash?.toLowerCase());
        if (found) {
          torrentSize = found.size;
          if (found.progress === 1 || found.state.includes('complete') || found.state.includes('upload') || found.state.includes('seed')) {
            // Attempt hardlink move
            let files: Array<{ name: string; size: number }> = [];
            if (app.qbittorrent.getTorrentFiles) {
              files = await app.qbittorrent.getTorrentFiles(item.qbTorrentHash);
            }

            try {
              const existingShowFolder = app.requestsRepo.findExistingSeriesFolder({
                metadataId: item.metadataId,
                mediaType: item.mediaType,
                excludeRequestId: item.id,
              });

              const result = await app.fileSystem.processAndHardlinkTorrent({
                request: item,
                torrentStatus: { name: found.name },
                files,
                stagingPath,
                existingShowFolder,
                subtitleInspection: app.subtitleInspection,
              });
              destPath = result.destPath;
              isComplete = true;
            } catch (hardlinkErr) {
              const errMsg = (hardlinkErr as Error).message || 'Failed to process and hardlink torrent';
              app.requestsRepo.markError(id, errMsg);
              return reply.status(502).send({
                error: 'Bad Gateway',
                message: `Failed to process and hardlink torrent: ${errMsg}`,
              });
            }
          }
        }
      } catch (checkErr) {
        app.log.warn(`Error verifying torrent/files for retry: ${(checkErr as Error).message}`);
      }
    }

    if (isComplete && destPath && fs.existsSync(destPath)) {
      // Re-trigger Jellyfin library refresh
      if (app.jellyfin.refreshLibrary) {
        try {
          await app.jellyfin.refreshLibrary();
        } catch (refreshErr) {
          const errMsg = (refreshErr as Error).message || 'Failed to refresh Jellyfin library';
          app.db
            .update(downloadRequests)
            .set({
              errorMessage: errMsg,
              jellyfinPath: destPath,
            })
            .where(eq(downloadRequests.id, id))
            .run();

          return reply.status(502).send({
            error: 'Bad Gateway',
            message: `Files verified on disk, but Jellyfin refresh failed: ${errMsg}`,
          });
        }
      }

      let requestedBy: string | undefined;
      if (item.userId) {
        const reqUser = app.db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, item.userId))
          .get();
        requestedBy = reqUser?.username;
      }

      const downloadedAt = item.downloadedAt || new Date().toISOString();
      const updated = await app.stateMachine.transition(id, RequestStatus.SEEDING, {
        broadcast: true,
        extraFields: {
          jellyfinPath: destPath,
          downloadedAt,
          errorMessage: null,
          sizeBytes: torrentSize,
        },
        sendNotification: app.notifications ? 'download.completed' : undefined,
        notificationPayload: app.notifications
          ? {
              title: item.title,
              requestId: item.id,
              mediaType: item.mediaType,
              year: item.year,
              seasonNumber: item.seasonNumber,
              episodeNumber: item.episodeNumber,
              requestedBy,
              path: destPath,
              jellyfinUrl:
                typeof app.jellyfin.getPublicJellyfinUrl === 'function'
                  ? app.jellyfin.getPublicJellyfinUrl()
                  : undefined,
            }
          : undefined,
      });

      return reply.send({ request: updated, message: 'Request successfully completed and synced to Jellyfin' });
    } else {
      // Torrent is incomplete or missing from disk; reset to downloading
      const updated = await app.stateMachine.transition(id, RequestStatus.DOWNLOADING, {
        broadcast: true,
        extraFields: {
          errorMessage: null,
        },
      });

      return reply.send({ request: updated, message: 'Request reset to downloading' });
    }
  });

  // DELETE /requests/:id — delete/cleanup request
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

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

  // POST /requests/from-stream — promotion from ephemeral stream
  app.post('/from-stream', async (request, reply) => {
    const serviceKey = app.serviceApiKey;
    const headerKey = request.headers['x-service-key'];
    const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const isServiceAuth = Boolean(serviceKey && providedKey === serviceKey);
    const isAdmin = request.currentUser?.role === 'admin';

    if (!isServiceAuth && !isAdmin) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing authorization',
      });
    }

    const schema = z.object({
      userId: z.string().min(1),
      mediaType: z.enum(['movie', 'tv_show', 'anime']),
      metadataId: z.string().min(1),
      metadataSource: z.enum(['tmdb', 'anilist']),
      title: z.string().min(1),
      year: z.number().int().optional().nullable(),
      seasonNumber: z.number().int().optional().nullable(),
      episodeNumber: z.number().int().optional().nullable(),
      stagingPath: z.string().min(1),
      sizeBytes: z.number().optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parsed.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const data = parsed.data;
    const requestId = randomUUID();
    const now = new Date().toISOString();

    const ext = path.extname(data.stagingPath) || '.mkv';
    let destPath = '';
    try {
      destPath = app.fileSystem.buildLibraryPath({
        mediaType: data.mediaType,
        title: data.title,
        year: data.year,
        seasonNumber: data.seasonNumber,
        episodeNumber: data.episodeNumber,
        ext,
      });

      if (fs.existsSync(data.stagingPath)) {
        app.fileSystem.hardlink(data.stagingPath, destPath);
      }
    } catch (err) {
      app.log.warn(err, 'Failed to hardlink stream promotion file');
    }

    app.db
      .insert(downloadRequests)
      .values({
        id: requestId,
        userId: data.userId,
        magnetLink: 'promoted-from-stream',
        mediaType: data.mediaType,
        status: RequestStatus.DONE,
        metadataId: data.metadataId,
        metadataSource: data.metadataSource,
        title: data.title,
        year: data.year ?? null,
        seasonNumber: data.seasonNumber ?? null,
        episodeNumber: data.episodeNumber ?? null,
        jellyfinPath: destPath || null,
        keepFlag: false,
        requestedAt: now,
        downloadedAt: now,
        sizeBytes: data.sizeBytes ?? null,
      })
      .run();

    if (typeof app.jellyfin.safeRefresh === 'function') {
      app.jellyfin.safeRefresh().catch(() => {});
    } else if (typeof app.jellyfin.refreshLibrary === 'function') {
      app.jellyfin.refreshLibrary().catch(() => {});
    }

    return reply.status(201).send({
      requestId,
      jellyfinPath: destPath,
      status: 'completed',
    });
  });
};
