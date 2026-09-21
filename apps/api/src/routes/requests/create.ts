import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { requireFeature } from '../../middleware/featureFlags';
import { systemConfig, DownloadRequest } from '../../db/schema';
import { parseTorrentBuffer } from '../../services/torrentParser';
import {
  findMatchingCanonicalRequest,
  findCanonicalSeriesInfo,
  addCoRequester,
  globalRequestMutex,
  getDedupLockKey,
} from '../../services/requestDedup';
import { RequestStatus } from '../../services/requestStateMachine';
import { createRequestSchema } from './schemas';

export const createRoutes: FastifyPluginAsync = async (app) => {
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

    const canonicalSeries = findCanonicalSeriesInfo(app.requestsRepo, {
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
      const existing = findMatchingCanonicalRequest(app.requestsRepo, {
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

      let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
      let qbTorrentHash: string | null = null;
      let torrentFilePath: string | null = null;
      const stagingPath = process.env.STAGING_PATH || '/media_data/downloads/staging';
      const requestId = randomUUID();

      if (isQuotaExceeded) {
        deferredReason = 'waiting_for_space';
      } else {
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
          } catch (err) {
            request.log.error(err, 'Could not add torrent to qBittorrent immediately, falling back to queued');
            deferredReason = 'waiting_for_slot';
          }
        } else {
          deferredReason = 'waiting_for_slot';
        }
      }

      // If queued and we have a torrent file, save it temporarily on disk for resumption
      if (!qbTorrentHash && torrentBuffer) {
        const torrentsDir = path.resolve(path.dirname(stagingPath), 'torrents');
        if (!fs.existsSync(torrentsDir)) {
          fs.mkdirSync(torrentsDir, { recursive: true });
        }
        torrentFilePath = path.join(torrentsDir, `${requestId}.torrent`);
        fs.writeFileSync(torrentFilePath, torrentBuffer);
      }

      // 4. Create request record via repository with initial status QUEUED
      const initialRequest: DownloadRequest = {
        id: requestId,
        userId: request.currentUser!.id,
        magnetLink: effectiveMagnetLink,
        mediaType: effectiveMediaType,
        status: RequestStatus.QUEUED,
        metadataId,
        metadataSource,
        title: effectiveTitle,
        year: year ?? null,
        seasonNumber: seasonNumber ?? null,
        episodeNumber: episodeNumber ?? null,
        jellyfinPath: null,
        keepFlag: effectiveMediaType === 'private' ? true : false,
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

      let resultingRequest: DownloadRequest = initialRequest;

      // 5. If started immediately, transition status to DOWNLOADING via StateMachine
      if (qbTorrentHash) {
        resultingRequest = await app.stateMachine.transition(
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

      if (coRequesterUserIds && Array.isArray(coRequesterUserIds)) {
        for (const uid of coRequesterUserIds) {
          if (uid && uid !== request.currentUser!.id) {
            try {
              addCoRequester(app.db, resultingRequest.id, uid);
            } catch (err) {
              request.log.warn(err, `Failed to add co-requester ${uid}`);
            }
          }
        }
      }

      await triggerNextSeasonWaitlist();

      return reply.status(201).send({ request: resultingRequest });
    });
  });
};
