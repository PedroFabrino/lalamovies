import fs from 'node:fs';
import path from 'node:path';
import { AppDatabase } from '../db';
import { IFileSystemService } from './fileSystem';
import { IRequestsRepository } from './requestsRepository';
import { IRequestStateMachine, RequestStatus } from './requestStateMachine';
import { PollerLogger } from '../jobs/downloadPoller';
import type { IQBittorrentService } from './qbittorrent';

export interface HardlinkRecoveryOptions {
  db: AppDatabase;
  fileSystem: IFileSystemService;
  requestsRepo: IRequestsRepository;
  stateMachine: IRequestStateMachine;
  stagingPath?: string;
  logger?: PollerLogger;
  qbittorrentService?: IQBittorrentService;
}

export interface HardlinkRecoveryResult {
  checkedCount: number;
  recoveredCount: number;
  failedCount: number;
}

/**
 * Startup recovery hook for requests left stuck in HARDLINKING status
 * due to a server crash or unhandled error mid-operation.
 */
export async function runHardlinkingRecovery(
  options: HardlinkRecoveryOptions
): Promise<HardlinkRecoveryResult> {
  const { fileSystem, requestsRepo, stateMachine, logger, qbittorrentService } = options;
  const stagingPath =
    options.stagingPath ||
    process.env.STAGING_PATH ||
    path.resolve(process.cwd(), 'downloads', 'staging');

  const stuckRequests = requestsRepo.findByStatus(RequestStatus.HARDLINKING);
  let recoveredCount = 0;
  let failedCount = 0;

  for (const req of stuckRequests) {
    logger?.info?.(`Attempting hardlink recovery for request ${req.id} (${req.title})`);
    try {
      const existingShowFolder = requestsRepo.findExistingSeriesFolder({
        metadataId: req.metadataId,
        mediaType: req.mediaType,
        excludeRequestId: req.id,
      });

      let files: Array<{ name: string; size: number }> = [];

      if (qbittorrentService?.getTorrentFiles && req.qbTorrentHash) {
        try {
          files = await qbittorrentService.getTorrentFiles(req.qbTorrentHash);
        } catch (qbErr) {
          logger?.warn?.(
            `Failed to get torrent files from qBittorrent for ${req.qbTorrentHash}: ${(qbErr as Error).message}`
          );
        }
      }

      if (files.length === 0 && fileSystem.reconstructFilesFromDisk) {
        try {
          const subDir =
            req.qbTorrentHash && fs.existsSync(path.join(stagingPath, req.qbTorrentHash))
              ? req.qbTorrentHash
              : req.title;
          files = await fileSystem.reconstructFilesFromDisk(stagingPath, subDir);
        } catch (diskErr) {
          logger?.warn?.(
            `Failed to reconstruct files from disk for ${req.title}: ${(diskErr as Error).message}`
          );
        }
      }

      const result = await fileSystem.processAndHardlinkTorrent({
        request: req,
        torrentStatus: { name: req.title },
        files,
        stagingPath,
        existingShowFolder,
      });

      await stateMachine.transition(req.id, RequestStatus.SEEDING, {
        refreshJellyfin: true,
        extraFields: {
          jellyfinPath: result.destPath,
          downloadedAt: new Date().toISOString(),
          mediaType: result.targetMediaType,
          title: result.effectiveTitle,
          transcriptionStatus: result.transcriptionStatus,
        },
      });

      recoveredCount++;
      logger?.info?.(
        `Successfully recovered stuck hardlinking request ${req.id} -> ${result.destPath}`
      );
    } catch (err) {
      failedCount++;
      const errorMessage = (err as Error).message || 'hardlink recovery failed';
      logger?.error?.(
        `Hardlink recovery failed for request ${req.id}: ${errorMessage}`,
        err
      );
      try {
        await stateMachine.transition(req.id, RequestStatus.ERROR, {
          extraFields: {
            errorMessage: `hardlink recovery failed: ${errorMessage}`,
          },
        });
      } catch (transitionErr) {
        logger?.error?.(
          `Failed to transition request ${req.id} to ERROR status`,
          transitionErr
        );
      }
    }
  }

  return {
    checkedCount: stuckRequests.length,
    recoveredCount,
    failedCount,
  };
}
