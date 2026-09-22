import { randomUUID } from 'node:crypto';
import { AppDatabase } from '../db';
import { DownloadRequest } from '../db/schema';
import { IRequestsRepository } from './requestsRepository';
import { IRequestStateMachine, RequestStatus } from './requestStateMachine';
import { ICleanupService } from './cleanup';
import { IFileSystemService } from './fileSystem';
import { IQBittorrentService } from './qbittorrent';
import { parseTorrentBuffer } from './torrentParser';
import { findCanonicalSeriesInfo } from './requestDedup';
import {
  checkDiskSafety,
  isStorageQuotaExceeded,
  getConcurrentLimit,
  stageTorrentFile,
  buildInitialDownloadRequest,
} from './requestPreparation';
import {
  BatchRequestInput,
  BatchRequestResult,
  RequestServiceError,
} from './requestServiceTypes';

export interface ExecuteBatchParams {
  input: BatchRequestInput;
  db: AppDatabase;
  requestsRepo: IRequestsRepository;
  stateMachine: IRequestStateMachine;
  cleanup: ICleanupService;
  fileSystem: IFileSystemService;
  qbittorrent: IQBittorrentService;
  stagingPath: string;
  logger: {
    error: (msg: string | object, ...args: unknown[]) => void;
  };
}

export async function executeBatchRequests(params: ExecuteBatchParams): Promise<BatchRequestResult> {
  const {
    input,
    db,
    requestsRepo,
    stateMachine,
    cleanup,
    fileSystem,
    qbittorrent,
    stagingPath,
    logger,
  } = params;

  const {
    userId,
    userRole,
    mediaType: topMediaType,
    metadataId: topMetadataId,
    metadataSource: topMetadataSource,
    title: topTitle,
    year: topYear,
    seasonNumber: topSeasonNumber,
    items,
  } = input;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const mType = item.mediaType || topMediaType;
    const mId = item.metadataId || topMetadataId;
    const mSource = item.metadataSource || topMetadataSource;
    const t = item.title || topTitle;

    if (!mType || !mId || !mSource || !t) {
      throw new RequestServiceError(
        400,
        'Bad Request',
        `Item #${i + 1} is missing required metadata (mediaType, metadataId, metadataSource, or title)`
      );
    }

    if (mType === 'private') {
      if (userRole !== 'trusted' && userRole !== 'admin') {
        throw new RequestServiceError(401, 'Unauthorized', 'Only trusted or admin users can submit private requests');
      }
      if (mSource !== 'tmdb') {
        throw new RequestServiceError(400, 'Bad Request', 'Private requests only support TMDB metadata source');
      }
    }
  }

  const diskCheck = checkDiskSafety(cleanup);
  if (!diskCheck.sufficient) {
    throw new RequestServiceError(422, 'Unprocessable Entity', diskCheck.message!);
  }

  const isQuotaExceeded = await isStorageQuotaExceeded(db, fileSystem);
  const concurrentLimit = getConcurrentLimit(db);
  const activeCount = await qbittorrent.getActiveTorrentCount();
  let availableSlots = isQuotaExceeded ? 0 : Math.max(0, concurrentLimit - activeCount);

  const resultingRequests: DownloadRequest[] = [];

  for (const item of items) {
    const rawMediaType = (item.mediaType || topMediaType)!;
    const metadataId = (item.metadataId || topMetadataId)!;
    const metadataSource = (item.metadataSource || topMetadataSource)!;
    const rawTitle = (item.title || topTitle)!;

    const canonicalSeries = findCanonicalSeriesInfo(requestsRepo, {
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
      } catch {
        throw new RequestServiceError(
          400,
          'Bad Request',
          `Invalid or corrupt .torrent file in batch: ${item.torrentFileName || 'unnamed'}`
        );
      }
    }

    if (!effectiveMagnetLink) {
      throw new RequestServiceError(
        400,
        'Bad Request',
        `Could not resolve magnet link or torrent file for ${title}`
      );
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
          qbTorrentHash = await qbittorrent.addTorrentFile(
            torrentBuffer,
            stagingPath,
            item.torrentFileName || `${title}.torrent`
          );
        } else {
          qbTorrentHash = await qbittorrent.addTorrent(effectiveMagnetLink, stagingPath);
        }
        availableSlots--;
      } catch (err) {
        logger.error(err as object, `Failed to add batch item ${title} immediately, falling back to queued`);
        deferredReason = 'waiting_for_slot';
      }
    } else {
      deferredReason = 'waiting_for_slot';
    }

    if (!qbTorrentHash && torrentBuffer) {
      torrentFilePath = stageTorrentFile(stagingPath, requestId, torrentBuffer);
    }

    const initialRequest = buildInitialDownloadRequest({
      requestId,
      userId,
      effectiveMagnetLink,
      mediaType,
      metadataId,
      metadataSource,
      title,
      year,
      seasonNumber,
      episodeNumber,
      sizeBytes: torrentSizeBytes,
      torrentFilePath,
      deferredReason,
    });

    requestsRepo.create(initialRequest);
    let resultingItem: DownloadRequest = initialRequest;

    if (qbTorrentHash) {
      resultingItem = await stateMachine.transition(
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

  return { requests: resultingRequests, count: resultingRequests.length };
}
