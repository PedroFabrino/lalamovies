import fs from 'node:fs';
import { AppDatabase } from '../db';
import { IRequestsRepository } from './requestsRepository';
import { IRequestStateMachine, RequestStatus, RequestStatusValue } from './requestStateMachine';
import { ICleanupService } from './cleanup';
import { IFileSystemService } from './fileSystem';
import { IQBittorrentService } from './qbittorrent';
import { parseTorrentBuffer } from './torrentParser';
import {
  checkDiskSafety,
  isStorageQuotaExceeded,
  getConcurrentLimit,
  stageTorrentFile,
} from './requestPreparation';
import {
  ReplaceTorrentInput,
  ReplaceTorrentResult,
  RequestServiceError,
} from './requestServiceTypes';

export interface ExecuteReplaceTorrentOptions {
  input: ReplaceTorrentInput;
  db: AppDatabase;
  requestsRepo: IRequestsRepository;
  stateMachine: IRequestStateMachine;
  cleanup: ICleanupService;
  fileSystem: IFileSystemService;
  qbittorrent: IQBittorrentService;
  stagingPath: string;
  logger?: {
    warn: (msg: string | object, ...args: unknown[]) => void;
    error: (msg: string | object, ...args: unknown[]) => void;
  };
}

export async function executeReplaceTorrent(
  options: ExecuteReplaceTorrentOptions
): Promise<ReplaceTorrentResult> {
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
  } = options;

  const request = requestsRepo.findById(input.requestId);
  if (!request) {
    throw new RequestServiceError(404, 'Not Found', 'Download request not found');
  }

  const isOwner = request.userId === input.userId;
  const isAdmin = input.userRole === 'admin';
  if (!isOwner && !isAdmin) {
    throw new RequestServiceError(
      403,
      'Forbidden',
      'You are not authorized to replace the torrent for this request'
    );
  }

  const eligibleStatuses: readonly string[] = [
    RequestStatus.DOWNLOADING,
    RequestStatus.QUEUED,
    RequestStatus.ERROR,
  ];
  if (!eligibleStatuses.includes(request.status)) {
    throw new RequestServiceError(
      400,
      'Bad Request',
      'Torrent replacement is only permitted for requests in downloading, queued, or error status'
    );
  }

  let torrentBuffer: Buffer | null = null;
  let effectiveMagnetLink = input.magnetLink || '';
  let torrentSizeBytes: number | null = null;

  if (input.torrentFileBase64) {
    try {
      torrentBuffer = Buffer.from(input.torrentFileBase64, 'base64');
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

  const diskCheck = checkDiskSafety(cleanup);
  if (!diskCheck.sufficient) {
    throw new RequestServiceError(422, 'Unprocessable Entity', diskCheck.message!);
  }

  // Purge previous download and staged artifacts
  if (request.qbTorrentHash) {
    try {
      await qbittorrent.removeTorrent(request.qbTorrentHash, true);
    } catch (err) {
      logger?.warn(err as object, `Failed to remove old torrent ${request.qbTorrentHash} from qBittorrent`);
    }
  }

  if (request.torrentFilePath) {
    try {
      if (fs.existsSync(request.torrentFilePath)) {
        fs.unlinkSync(request.torrentFilePath);
      }
    } catch (err) {
      logger?.warn(err as object, `Failed to delete old staged torrent file ${request.torrentFilePath}`);
    }
  }

  const isQuotaExceeded = await isStorageQuotaExceeded(db, fileSystem);
  let deferredReason: 'waiting_for_space' | 'waiting_for_slot' | null = null;
  let qbTorrentHash: string | null = null;
  let torrentFilePath: string | null = null;
  let targetStatus: RequestStatusValue = RequestStatus.QUEUED;

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
            input.torrentFileName || `${request.title}.torrent`
          );
        } else {
          qbTorrentHash = await qbittorrent.addTorrent(effectiveMagnetLink, stagingPath);
        }
        targetStatus = RequestStatus.DOWNLOADING;
      } catch (err) {
        logger?.error(err as object, 'Failed to add replacement torrent to qBittorrent immediately, falling back to queued');
        deferredReason = 'waiting_for_slot';
      }
    } else {
      deferredReason = 'waiting_for_slot';
    }
  }

  if (!qbTorrentHash && torrentBuffer) {
    torrentFilePath = stageTorrentFile(stagingPath, request.id, torrentBuffer);
  }

  const updated = await stateMachine.transition(request.id, targetStatus, {
    broadcast: true,
    extraFields: {
      magnetLink: effectiveMagnetLink,
      sizeBytes: torrentSizeBytes,
      torrentFilePath,
      qbTorrentHash,
      errorMessage: null,
      deferredReason,
    },
  });

  return {
    request: updated,
    message:
      targetStatus === RequestStatus.DOWNLOADING
        ? 'Torrent replaced and download started'
        : 'Torrent replaced and queued',
  };
}
