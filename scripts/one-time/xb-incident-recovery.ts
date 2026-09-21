/**
 * Historical one-time incident recovery script for the 'xb (2026)' corrupted archive deployment.
 * Preserved for audit trail and manual execution if needed.
 * No longer connected to server startup.
 */

import path from 'node:path';
import fs from 'node:fs';
import { eq, like, or } from 'drizzle-orm';
import { AppDatabase, downloadRequests } from '../../apps/api/src/db';
import { IUnarchiveService } from '../../apps/api/src/services/unarchive';
import { IFileSystemService } from '../../apps/api/src/services/fileSystem';
import { IJellyfinService } from '../../apps/api/src/services/jellyfin';
import { extractDnFromMagnet } from '../../apps/api/src/services/unarchiveRecovery';

export interface XbIncidentRecoveryOptions {
  db: AppDatabase;
  unarchiveService: IUnarchiveService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  stagingPath?: string;
  mediaPath?: string;
}

export async function runXbIncidentRecovery(options: XbIncidentRecoveryOptions): Promise<{
  recoveredCount: number;
  removedInvalidPath: boolean;
}> {
  const { db, unarchiveService, fileSystem, jellyfin } = options;
  const stagingPath = options.stagingPath || process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads/staging');
  const mediaBasePath = options.mediaPath || process.env.MEDIA_PATH || path.resolve(process.cwd(), 'media');

  let removedInvalidPath = false;
  let recoveredCount = 0;

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

    if (archivePath && fs.existsSync(archivePath)) {
      const destPath = await unarchiveService.extractAndDeployMedia(archivePath, req, {
        fileSystem,
        stagingPath,
        disambiguator: releaseCode,
        mediaBasePath,
      });

      const sizeBytes = fs.existsSync(destPath) ? fs.statSync(destPath).size : (req.sizeBytes ?? 0);
      db.update(downloadRequests)
        .set({
          jellyfinPath: destPath,
          status: 'seeding' as any,
          sizeBytes,
          errorMessage: null,
        })
        .where(eq(downloadRequests.id, req.id))
        .run();

      recoveredCount++;
    }
  }

  // Remove invalid directory /media/private/xb (2026)/xb (2026).mkv
  const possibleInvalidDirs = [
    path.join(mediaBasePath, 'private', 'xb (2026)', 'xb (2026).mkv'),
    path.join(mediaBasePath, 'private', 'xb', 'xb.mkv'),
  ];

  for (const invDir of possibleInvalidDirs) {
    if (fs.existsSync(invDir) && fs.statSync(invDir).isDirectory()) {
      fs.rmSync(invDir, { recursive: true, force: true });
      removedInvalidPath = true;
      const parentDir = path.dirname(invDir);
      if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
        fs.rmdirSync(parentDir);
      }
    }
  }

  if (recoveredCount > 0 || removedInvalidPath) {
    await jellyfin.safeRefresh?.();
  }

  return { recoveredCount, removedInvalidPath };
}
