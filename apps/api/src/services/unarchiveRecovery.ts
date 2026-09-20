import path from 'node:path';
import fs from 'node:fs';
import { eq, like, or } from 'drizzle-orm';
import { AppDatabase, downloadRequests } from '../db';
import { IUnarchiveService } from './unarchive';
import { IFileSystemService } from './fileSystem';
import { IJellyfinService } from './jellyfin';
import { PollerLogger } from '../jobs/downloadPoller';

export interface RecoveryOptions {
  db: AppDatabase;
  unarchiveService: IUnarchiveService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
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

    // Decompress into scratch directory
    const scratchDir = path.join(stagingPath, '.scratch_recovery', req.id);
    try {
      logger?.info?.(`Recovery: extracting ${archivePath} for ${releaseCode}...`);
      await unarchiveService.extractArchive({
        archivePath,
        destinationDir: scratchDir,
      });

      const media = unarchiveService.filterPlayableMedia(scratchDir);
      const primaryVideo = media.primaryVideo;
      const ext = path.extname(primaryVideo.name).replace(/^\./, '') || 'mp4';

      const destPath = fileSystem.buildLibraryPath({
        mediaType: req.mediaType,
        title: req.title,
        year: req.year,
        seasonNumber: req.seasonNumber,
        episodeNumber: req.episodeNumber,
        ext,
        disambiguator: releaseCode,
        mediaBasePath,
      });

      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true, mode: 0o777 });
      }

      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }

      try {
        fs.renameSync(primaryVideo.path, destPath);
      } catch {
        fs.copyFileSync(primaryVideo.path, destPath);
        fs.unlinkSync(primaryVideo.path);
      }

      // Move any subtitle files
      for (const sub of media.subtitles) {
        const subExt = path.extname(sub.name);
        const baseName = path.basename(destPath, path.extname(destPath));
        const subDest = path.join(destDir, `${baseName}${subExt}`);
        try {
          if (fs.existsSync(subDest)) fs.unlinkSync(subDest);
          fs.copyFileSync(sub.path, subDest);
          fs.unlinkSync(sub.path);
        } catch {
          // non-fatal
        }
      }

      // Update database record
      db.update(downloadRequests)
        .set({
          jellyfinPath: destPath,
          status: 'seeding',
          sizeBytes: primaryVideo.size,
          errorMessage: null,
        })
        .where(eq(downloadRequests.id, req.id))
        .run();

      recoveredPaths.push(destPath);
      logger?.info?.(`Recovery: restored ${releaseCode} to ${destPath}`);
    } finally {
      try {
        if (fs.existsSync(scratchDir)) {
          fs.rmSync(scratchDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    }
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
  if (jellyfin.refreshLibrary && (recoveredPaths.length > 0 || removedInvalidPath)) {
    try {
      await jellyfin.refreshLibrary();
    } catch (jellyErr) {
      logger?.error?.('Jellyfin library refresh failed during recovery:', jellyErr);
    }
  }

  return {
    recoveredCount: recoveredPaths.length,
    removedInvalidPath,
    recoveredPaths,
  };
}
