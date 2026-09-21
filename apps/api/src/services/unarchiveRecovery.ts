import path from 'node:path';
import fs from 'node:fs';
import { like, or } from 'drizzle-orm';
import { AppDatabase, downloadRequests } from '../db';
import { IUnarchiveService } from './unarchive';
import { IFileSystemService } from './fileSystem';
import { IJellyfinService } from './jellyfin';
import { IRequestStateMachine, RequestStatus, RequestStatusValue } from './requestStateMachine';
import { PollerLogger } from '../jobs/downloadPoller';

export interface RecoveryOptions {
  db: AppDatabase;
  unarchiveService: IUnarchiveService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  stateMachine: IRequestStateMachine;
  stagingPath?: string;
  mediaPath?: string;
  logger?: PollerLogger;
}

export interface RecoveryResult {
  recoveredCount: number;
  removedInvalidPath: boolean;
  recoveredPaths: string[];
}

export function extractDnFromMagnet(magnet?: string | null): string | null {
  if (!magnet) return null;
  const match = magnet.match(/[?&]dn=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function runCorruptedArchiveRecovery(options: RecoveryOptions): Promise<RecoveryResult> {
  const { db, unarchiveService, fileSystem, jellyfin, stateMachine, logger } = options;
  const stagingPath = options.stagingPath || process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads/staging');
  const mediaBasePath =
    options.mediaPath ||
    (fileSystem.getMediaBasePath ? fileSystem.getMediaBasePath() : null) ||
    process.env.MEDIA_PATH ||
    path.resolve(process.cwd(), 'media');

  const recoveredPaths: string[] = [];

  // Find candidate requests whose jellyfinPath ends in or contains an archive extension
  const candidates = db
    .select()
    .from(downloadRequests)
    .where(
      or(
        like(downloadRequests.jellyfinPath, '%.rar'),
        like(downloadRequests.jellyfinPath, '%.zip'),
        like(downloadRequests.jellyfinPath, '%.7z'),
        like(downloadRequests.jellyfinPath, '%.tar'),
        like(downloadRequests.jellyfinPath, '%.rar%')
      )
    )
    .all();

  for (const req of candidates) {
    const dn = extractDnFromMagnet(req.magnetLink);
    const releaseCode = dn || req.title;

    // Check if request already has a valid clean video file destination
    if (
      req.jellyfinPath &&
      fs.existsSync(req.jellyfinPath) &&
      !fs.statSync(req.jellyfinPath).isDirectory() &&
      !unarchiveService.isArchiveFile(req.jellyfinPath)
    ) {
      continue;
    }

    // Locate archive in staging area
    let archivePath: string | null = null;
    const candidatesToCheck = [
      path.join(stagingPath, releaseCode),
      path.join(stagingPath, req.title),
    ];

    for (const dir of candidatesToCheck) {
      if (fs.existsSync(dir)) {
        if (fs.statSync(dir).isDirectory()) {
          const files = fs.readdirSync(dir);
          const rar = unarchiveService.findHeadArchive(files);
          if (rar) {
            archivePath = path.join(dir, rar);
            break;
          }
        } else if (unarchiveService.isArchiveFile(dir)) {
          archivePath = dir;
          break;
        }
      }
    }

    if (!archivePath && fs.existsSync(stagingPath)) {
      const entries = fs.readdirSync(stagingPath);
      const matched = entries.find((e) => e.toLowerCase().includes(releaseCode.toLowerCase()));
      if (matched) {
        const full = path.join(stagingPath, matched);
        if (fs.statSync(full).isDirectory()) {
          const subFiles = fs.readdirSync(full);
          const rar = unarchiveService.findHeadArchive(subFiles);
          if (rar) archivePath = path.join(full, rar);
        } else if (unarchiveService.isArchiveFile(full)) {
          archivePath = full;
        }
      }
    }

    if (!archivePath || !fs.existsSync(archivePath)) {
      logger?.warn?.(`Recovery: archive not found in staging for request ${req.title} (${req.id}, release ${releaseCode})`);
      continue;
    }

    const destPath = await unarchiveService.extractAndDeployMedia(archivePath, req, {
      fileSystem,
      stagingPath,
      disambiguator: releaseCode,
      mediaBasePath,
      logger,
    });

    const sizeBytes = fs.existsSync(destPath) ? fs.statSync(destPath).size : (req.sizeBytes ?? 0);

    const currentStatus = req.status as RequestStatusValue;
    if (currentStatus === RequestStatus.DOWNLOADING) {
      await stateMachine.transition(req.id, RequestStatus.UNARCHIVING, { broadcast: false });
    }

    // Transition state strictly through central RequestStateMachine
    await stateMachine.transition(req.id, RequestStatus.SEEDING, {
      broadcast: false,
      extraFields: {
        jellyfinPath: destPath,
        sizeBytes,
        errorMessage: null,
      },
    });

    recoveredPaths.push(destPath);
    logger?.info?.(`Recovery: restored ${releaseCode} to ${destPath}`);
  }

  // Trigger Jellyfin library refresh (non-fatal, only if changes were made)
  if (recoveredPaths.length > 0) {
    if (typeof jellyfin.safeRefresh === 'function') {
      await jellyfin.safeRefresh();
    } else if (typeof jellyfin.refreshLibrary === 'function') {
      try {
        await jellyfin.refreshLibrary();
      } catch (jellyErr) {
        logger?.error?.('Jellyfin library refresh failed during recovery:', jellyErr);
      }
    }
  }

  return {
    recoveredCount: recoveredPaths.length,
    removedInvalidPath: false,
    recoveredPaths,
  };
}

export const runCompressedDownloadsRecovery = runCorruptedArchiveRecovery;
