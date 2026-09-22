import { randomUUID } from 'node:crypto';
import { AppDatabase } from '../db';
import { DownloadRequest } from '../db/schema';
import { IRequestsRepository } from './requestsRepository';
import { IRequestStateMachine, RequestStatus } from './requestStateMachine';
import { ICleanupService } from './cleanup';
import { IFileSystemService } from './fileSystem';
import { IQBittorrentService } from './qbittorrent';
import { parseTorrentBuffer } from './torrentParser';
import {
  findMatchingCanonicalRequest,
  findCanonicalSeriesInfo,
  addCoRequester,
  globalRequestMutex,
  getDedupLockKey,
} from './requestDedup';
import {
  checkDiskSafety,
  isStorageQuotaExceeded,
  getConcurrentLimit,
  stageTorrentFile,
  buildInitialDownloadRequest,
} from './requestPreparation';
import {
  CreateRequestInput,
  CreateRequestResult,
  RequestServiceError,
} from './requestServiceTypes';

export interface ExecuteCreateRequestOptions {
  input: CreateRequestInput;
  db: AppDatabase;
  requestsRepo: IRequestsRepository;
  stateMachine: IRequestStateMachine;
  cleanup: ICleanupService;
  fileSystem: IFileSystemService;
  qbittorrent: IQBittorrentService;
  stagingPath: string;
  watcherUrl?: string | (() => string | undefined);
  serviceApiKey?: string | (() => string | undefined);
  logger?: {
    warn: (msg: string | object, ...args: unknown[]) => void;
    error: (msg: string | object, ...args: unknown[]) => void;
  };
}

async function triggerNextSeasonWaitlist(params: {
  userId: string;
  mediaType: string;
  metadataId: string;
  metadataSource: string;
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  waitlistNextSeason?: boolean;
  watcherUrl?: string | (() => string | undefined);
  serviceApiKey?: string | (() => string | undefined);
  logger?: {
    warn: (msg: string | object, ...args: unknown[]) => void;
    error: (msg: string | object, ...args: unknown[]) => void;
  };
}): Promise<void> {
  const {
    userId,
    mediaType,
    metadataId,
    metadataSource,
    title,
    year,
    seasonNumber,
    episodeNumber,
    waitlistNextSeason,
    watcherUrl: rawWatcherUrl,
    serviceApiKey: rawServiceApiKey,
    logger,
  } = params;

  const watcherUrl =
    typeof rawWatcherUrl === 'function' ? rawWatcherUrl() : rawWatcherUrl || process.env.WATCHER_URL;
  const serviceApiKey =
    typeof rawServiceApiKey === 'function' ? rawServiceApiKey() : rawServiceApiKey || process.env.SERVICE_API_KEY;

  if (
    waitlistNextSeason &&
    ['tv_show', 'anime'].includes(mediaType) &&
    seasonNumber !== undefined &&
    seasonNumber !== null &&
    (episodeNumber === undefined || episodeNumber === null) &&
    watcherUrl
  ) {
    const cleanWatcherUrl = watcherUrl.replace(/\/+$/, '');
    const targetSeason = seasonNumber + 1;
    try {
      const res = await fetch(`${cleanWatcherUrl}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(serviceApiKey ? { 'x-service-key': serviceApiKey } : {}),
          'x-user-id': userId,
        },
        body: JSON.stringify({
          userId,
          mediaType,
          metadataId,
          metadataSource,
          title,
          year,
          seasonNumber: targetSeason,
          isNextSeason: true,
        }),
      });
      if (!res.ok) {
        logger?.warn(`Failed to create next-season waitlist entry: HTTP ${res.status}`);
      }
    } catch (err) {
      logger?.warn(err as object, 'Failed to reach Watcher service for next-season waitlist creation');
    }
  }
}

export async function executeCreateRequest(
  options: ExecuteCreateRequestOptions
): Promise<CreateRequestResult> {
  const {
    input,
    db,
    requestsRepo,
    stateMachine,
    cleanup,
    fileSystem,
    qbittorrent,
    stagingPath,
    watcherUrl,
    serviceApiKey,
    logger,
  } = options;

  const {
    userId,
    userRole,
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
  } = input;

  if (mediaType === 'private') {
    if (userRole !== 'trusted' && userRole !== 'admin') {
      throw new RequestServiceError(401, 'Unauthorized', 'Only trusted or admin users can submit private requests');
    }
    if (metadataSource !== 'tmdb') {
      throw new RequestServiceError(400, 'Bad Request', 'Private requests only support TMDB metadata source');
    }
  }

  const canonicalSeries = findCanonicalSeriesInfo(requestsRepo, {
    metadataId,
    metadataSource,
    mediaType,
  });
  const effectiveTitle = canonicalSeries?.title || title;
  const effectiveMediaType = canonicalSeries?.mediaType || mediaType;

  const waitlistParams = {
    userId,
    mediaType: effectiveMediaType,
    metadataId,
    metadataSource,
    title: effectiveTitle,
    year,
    seasonNumber,
    episodeNumber,
    waitlistNextSeason,
    watcherUrl,
    serviceApiKey,
    logger,
  };

  const lockKey = getDedupLockKey({
    mediaType: effectiveMediaType,
    metadataId,
    metadataSource,
    seasonNumber,
    episodeNumber,
  });

  return globalRequestMutex.runExclusive(lockKey, async () => {
    const existing = findMatchingCanonicalRequest(requestsRepo, {
      mediaType: effectiveMediaType,
      metadataId,
      metadataSource,
      seasonNumber,
      episodeNumber,
    });

    if (existing) {
      await triggerNextSeasonWaitlist(waitlistParams);

      if (existing.userId !== userId) {
        addCoRequester(db, existing.id, userId);
      }

      if (coRequesterUserIds && Array.isArray(coRequesterUserIds)) {
        for (const uid of coRequesterUserIds) {
          if (uid && uid !== existing.userId) {
            try {
              addCoRequester(db, existing.id, uid);
            } catch (err) {
              logger?.warn(err as object, `Failed to add co-requester ${uid}`);
            }
          }
        }
      }

      return { request: existing, isExisting: true };
    }

    const diskCheck = checkDiskSafety(cleanup);
    if (!diskCheck.sufficient) {
      throw new RequestServiceError(422, 'Unprocessable Entity', diskCheck.message!);
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
      } catch {
        throw new RequestServiceError(400, 'Bad Request', 'Invalid or corrupt .torrent file');
      }
    }

    if (!effectiveMagnetLink) {
      throw new RequestServiceError(400, 'Bad Request', 'Could not resolve magnet link or torrent file');
    }

    const isQuotaExceeded = await isStorageQuotaExceeded(db, fileSystem);
    let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
    let qbTorrentHash: string | null = null;
    let torrentFilePath: string | null = null;
    const requestId = randomUUID();

    if (isQuotaExceeded) {
      deferredReason = 'waiting_for_space';
    } else {
      const concurrentLimit = getConcurrentLimit(db);
      const activeCount = await qbittorrent.getActiveTorrentCount();

      if (activeCount < concurrentLimit) {
        try {
          if (torrentBuffer) {
            qbTorrentHash = await qbittorrent.addTorrentFile(
              torrentBuffer,
              stagingPath,
              torrentFileName || `${title}.torrent`
            );
          } else {
            qbTorrentHash = await qbittorrent.addTorrent(effectiveMagnetLink, stagingPath);
          }
        } catch (err) {
          logger?.error(err as object, 'Could not add torrent to qBittorrent immediately, falling back to queued');
          deferredReason = 'waiting_for_slot';
        }
      } else {
        deferredReason = 'waiting_for_slot';
      }
    }

    if (!qbTorrentHash && torrentBuffer) {
      torrentFilePath = stageTorrentFile(stagingPath, requestId, torrentBuffer);
    }

    const initialRequest = buildInitialDownloadRequest({
      requestId,
      userId,
      effectiveMagnetLink,
      mediaType: effectiveMediaType,
      metadataId,
      metadataSource,
      title: effectiveTitle,
      year,
      seasonNumber,
      episodeNumber,
      sizeBytes: torrentSizeBytes,
      torrentFilePath,
      deferredReason,
    });

    requestsRepo.create(initialRequest);
    let resultingRequest: DownloadRequest = initialRequest;

    if (qbTorrentHash) {
      resultingRequest = await stateMachine.transition(
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
        if (uid && uid !== userId) {
          try {
            addCoRequester(db, resultingRequest.id, uid);
          } catch (err) {
            logger?.warn(err as object, `Failed to add co-requester ${uid}`);
          }
        }
      }
    }

    await triggerNextSeasonWaitlist(waitlistParams);

    return { request: resultingRequest, isExisting: false };
  });
}
