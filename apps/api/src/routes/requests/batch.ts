import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { requireFeature } from '../../middleware/featureFlags';
import { systemConfig, DownloadRequest } from '../../db/schema';
import { parseTorrentBuffer } from '../../services/torrentParser';
import { findCanonicalSeriesInfo } from '../../services/requestDedup';
import { RequestStatus } from '../../services/requestStateMachine';
import { batchRequestSchema } from './schemas';

export const batchRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests/batch — create batch download requests
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

    const resultingRequests: DownloadRequest[] = [];

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
      let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
      let qbTorrentHash: string | null = null;
      let torrentFilePath: string | null = null;

      if (isQuotaExceeded) {
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
          availableSlots--;
        } catch (err) {
          request.log.error(err, `Failed to add batch item ${title} immediately, falling back to queued`);
          deferredReason = 'waiting_for_slot';
        }
      } else {
        deferredReason = 'waiting_for_slot';
      }

      if (!qbTorrentHash && torrentBuffer) {
        if (!fs.existsSync(torrentsDir)) {
          fs.mkdirSync(torrentsDir, { recursive: true });
        }
        torrentFilePath = path.join(torrentsDir, `${requestId}.torrent`);
        fs.writeFileSync(torrentFilePath, torrentBuffer);
      }

      const initialRequest: DownloadRequest = {
        id: requestId,
        userId: request.currentUser!.id,
        magnetLink: effectiveMagnetLink,
        mediaType,
        status: RequestStatus.QUEUED,
        metadataId,
        metadataSource,
        title,
        year,
        seasonNumber,
        episodeNumber,
        jellyfinPath: null,
        keepFlag: mediaType === 'private' ? true : false,
        qbTorrentHash: null,
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

      app.requestsRepo.create(initialRequest);

      let resultingItem: DownloadRequest = initialRequest;

      if (qbTorrentHash) {
        resultingItem = await app.stateMachine.transition(
          requestId,
          RequestStatus.DOWNLOADING,
          {
            broadcast: true,
            extraFields: {
              qbTorrentHash,
              deferredReason: null,
            },
          }
        );
      }

      resultingRequests.push(resultingItem);
    }

    return reply.status(201).send({
      requests: resultingRequests,
      count: resultingRequests.length,
    });
  });
};
