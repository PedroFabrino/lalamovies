import fs from 'node:fs';
import { IRequestsRepository } from './requestsRepository';
import { IRequestStateMachine, RequestStatus } from './requestStateMachine';
import { IFileSystemService } from './fileSystem';
import { IQBittorrentService, TorrentInfo } from './qbittorrent';
import { IJellyfinService } from './jellyfin';
import { INotificationService } from './notifications';
import { ISubtitleInspectionService } from './subtitleInspection';
import { RetryRequestResult, RequestServiceError } from './requestServiceTypes';

export interface ExecuteRetryParams {
  id: string;
  requestsRepo: IRequestsRepository;
  stateMachine: IRequestStateMachine;
  fileSystem: IFileSystemService;
  qbittorrent: IQBittorrentService;
  jellyfin: IJellyfinService;
  notifications?: INotificationService;
  subtitleInspection?: ISubtitleInspectionService;
  stagingPath: string;
  logger: {
    warn: (msg: string | object, ...args: unknown[]) => void;
  };
}

export async function executeRetryRequest(params: ExecuteRetryParams): Promise<RetryRequestResult> {
  const {
    id,
    requestsRepo,
    stateMachine,
    fileSystem,
    qbittorrent,
    jellyfin,
    notifications,
    subtitleInspection,
    stagingPath,
    logger,
  } = params;

  const item = requestsRepo.findById(id);

  if (!item) {
    throw new RequestServiceError(404, 'Not Found', 'Download request not found');
  }

  if (item.status !== 'error') {
    throw new RequestServiceError(400, 'Bad Request', 'Only requests in error state can be retried');
  }

  let destPath = item.jellyfinPath;
  let isComplete = false;
  let torrentSize = item.sizeBytes;

  if (destPath && fs.existsSync(destPath)) {
    isComplete = true;
  }

  if (!isComplete && item.qbTorrentHash) {
    try {
      const torrents = qbittorrent.getAllTorrents ? await qbittorrent.getAllTorrents() : [];
      const found = torrents.find((t: TorrentInfo) => t.hash.toLowerCase() === item.qbTorrentHash?.toLowerCase());
      if (found) {
        torrentSize = found.size;
        if (
          found.progress === 1 ||
          found.state.includes('complete') ||
          found.state.includes('upload') ||
          found.state.includes('seed')
        ) {
          let files: Array<{ name: string; size: number }> = [];
          if (qbittorrent.getTorrentFiles) {
            files = await qbittorrent.getTorrentFiles(item.qbTorrentHash);
          }

          try {
            const existingShowFolder = requestsRepo.findExistingSeriesFolder({
              metadataId: item.metadataId,
              mediaType: item.mediaType,
              excludeRequestId: item.id,
            });

            const result = await fileSystem.processAndHardlinkTorrent({
              request: item,
              torrentStatus: { name: found.name },
              files,
              stagingPath,
              existingShowFolder,
              subtitleInspection,
            });
            destPath = result.destPath;
            isComplete = true;
          } catch (hardlinkErr) {
            const errMsg = (hardlinkErr as Error).message || 'Failed to process and hardlink torrent';
            requestsRepo.markError(id, errMsg);
            throw new RequestServiceError(502, 'Bad Gateway', `Failed to process and hardlink torrent: ${errMsg}`);
          }
        }
      }
    } catch (checkErr) {
      if (checkErr instanceof RequestServiceError) throw checkErr;
      logger.warn(`Error verifying torrent/files for retry: ${(checkErr as Error).message}`);
    }
  }

  if (isComplete && destPath && fs.existsSync(destPath)) {
    let requestedBy: string | undefined;
    if (item.userId) {
      requestedBy = requestsRepo.findRequesterUsername(item.userId);
    }

    const downloadedAt = item.downloadedAt || new Date().toISOString();
    const updated = await stateMachine.transition(id, RequestStatus.SEEDING, {
      broadcast: true,
      refreshJellyfin: true,
      extraFields: {
        jellyfinPath: destPath,
        downloadedAt,
        errorMessage: null,
        sizeBytes: torrentSize,
      },
      sendNotification: notifications ? 'download.completed' : undefined,
      notificationPayload: notifications
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
              typeof jellyfin.getPublicJellyfinUrl === 'function'
                ? jellyfin.getPublicJellyfinUrl()
                : undefined,
          }
        : undefined,
    });

    return { request: updated, message: 'Request successfully completed and synced to Jellyfin' };
  }

  const updated = await stateMachine.transition(id, RequestStatus.DOWNLOADING, {
    broadcast: true,
    extraFields: {
      errorMessage: null,
    },
  });

  return { request: updated, message: 'Request reset to downloading' };
}
