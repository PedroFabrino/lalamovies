import path from 'node:path';
import fs from 'node:fs';
import { eq, like, or } from 'drizzle-orm';
import { AppDatabase, downloadRequests } from '../db';
import { IUnarchiveService, UnarchiveService } from './unarchive';
import { IFileSystemService } from './fileSystem';
import { IJellyfinService } from './jellyfin';
import { IRequestStateMachine, RequestStatus } from './requestStateMachine';
import { PollerLogger } from '../jobs/downloadPoller';

export interface RecoveryOptions {
  db: AppDatabase;
  unarchiveService: IUnarchiveService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  stateMachine?: IRequestStateMachine;
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

export async function runCompressedDownloadsRecovery(options: RecoveryOptions): Promise<RecoveryResult> {
  const { db, unarchiveService, fileSystem, jellyfin, logger } = options;
  const stagingPath = options.stagingPath || process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads/staging');
  const mediaBasePath =
    options.mediaPath ||
    (fileSystem.getMediaBasePath ? fileSystem.getMediaBasePath() : null) ||
    process.env.MEDIA_PATH ||
    path.resolve(process.cwd(), 'media');

  const recoveredPaths: string[] = [];
  let removedInvalidPath = false;

  // Find candidate requests with corrupted/shared xb path or containing .rar
  const candidates = db
    .select()
    .from(downloadRequests)
    .where(
      or(
        like(downloadRequests.jellyfinPath, '%xb (2026).mkv%'),
        like(downloadRequests.jellyfinPath, '%.rar%'),
        eq(downloadRequests.title, 'xb')
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
      !req.jellyfinPath.toLowerCase().endsWith('.rar') &&
      !req.jellyfinPath.includes('xb (2026).mkv')
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

    const extractAndDeploy =
      typeof unarchiveService.extractAndDeployMedia === 'function'
        ? unarchiveService.extractAndDeployMedia.bind(unarchiveService)
        : UnarchiveService.prototype.extractAndDeployMedia.bind(unarchiveService);

    const destPath = await extractAndDeploy(archivePath, req, {
      fileSystem,
      stagingPath,
      disambiguator: releaseCode,
      mediaBasePath,
      logger,
    });

    const sizeBytes = fs.existsSync(destPath) ? fs.statSync(destPath).size : (req.sizeBytes ?? 0);

    // Update database record
    if (options.stateMachine) {
      await options.stateMachine.transition(req.id, RequestStatus.SEEDING, {
        broadcast: false,
        extraFields: {
          jellyfinPath: destPath,
          sizeBytes,
          errorMessage: null,
        },
      });
    } else {
      db.update(downloadRequests)
        .set({
          jellyfinPath: destPath,
          status: RequestStatus.SEEDING,
          sizeBytes,
          errorMessage: null,
        })
        .where(eq(downloadRequests.id, req.id))
        .run();
    }

    recoveredPaths.push(destPath);
    logger?.info?.(`Recovery: restored ${releaseCode} to ${destPath}`);
  }

  // Remove invalid directory /media/private/xb (2026)/xb (2026).mkv
  const possibleInvalidDirs = [
    path.join(mediaBasePath, 'private', 'xb (2026)', 'xb (2026).mkv'),
    path.join(mediaBasePath, 'private', 'xb', 'xb.mkv'),
  ];

  for (const invDir of possibleInvalidDirs) {
    if (fs.existsSync(invDir) && fs.statSync(invDir).isDirectory()) {
      try {
        fs.rmSync(invDir, { recursive: true, force: true });
        removedInvalidPath = true;
        logger?.info?.(`Recovery: removed invalid archive directory ${invDir}`);

        // Remove parent directory if now empty
        const parentDir = path.dirname(invDir);
        if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
          fs.rmdirSync(parentDir);
          logger?.info?.(`Recovery: removed empty parent directory ${parentDir}`);
        }
      } catch (rmErr) {
        logger?.error?.(`Failed to remove invalid directory ${invDir}`, rmErr);
      }
    }
  }

  // Trigger Jellyfin library refresh (non-fatal, only if changes were made)
  if (recoveredPaths.length > 0 || removedInvalidPath) {
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
    removedInvalidPath,
    recoveredPaths,
  };
}
