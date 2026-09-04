import fs from 'node:fs';
import { eq } from 'drizzle-orm';
import { AppDatabase, systemConfig, downloadRequests } from '../db';
import { IQBittorrentService } from './qbittorrent';

export interface SpaceCheckResult {
  sufficient: boolean;
  percentFree: number;
  threshold: number;
}

export interface ICleanupService {
  isSpaceSufficient(targetPath?: string): SpaceCheckResult;
  cleanItem(requestId: string): Promise<void>;
}

export class CleanupService implements ICleanupService {
  constructor(
    private db: AppDatabase,
    private qbittorrent: IQBittorrentService,
    private mediaPath?: string
  ) {}

  isSpaceSufficient(customPath?: string): SpaceCheckResult {
    const configRow = this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'disk_reject_threshold'))
      .get();

    const threshold = configRow ? parseInt(configRow.value, 10) : 15;
    const target = customPath || this.mediaPath || process.env.MEDIA_PATH || process.cwd();

    let percentFree = 100;
    try {
      const checkPath = fs.existsSync(target) ? target : process.cwd();
      const statfs = fs.statfsSync(checkPath);
      if (statfs.blocks > 0) {
        percentFree = Math.round((statfs.bavail / statfs.blocks) * 100);
      }
    } catch {
      percentFree = 100;
    }

    return {
      sufficient: percentFree >= threshold,
      percentFree,
      threshold,
    };
  }

  async cleanItem(requestId: string): Promise<void> {
    const request = this.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, requestId))
      .get();

    if (!request) return;

    // 1. Remove torrent from qBittorrent and delete staging files
    if (request.qbTorrentHash) {
      try {
        await this.qbittorrent.removeTorrent(request.qbTorrentHash, true);
      } catch (err) {
        // Silently log or continue
      }
    }

    // 2. Remove library files if path exists
    if (request.jellyfinPath && fs.existsSync(request.jellyfinPath)) {
      try {
        fs.rmSync(request.jellyfinPath, { recursive: true, force: true });
      } catch {
        // Continue
      }
    }

    // 3. Mark status deleted
    this.db
      .update(downloadRequests)
      .set({
        status: 'deleted',
      })
      .where(eq(downloadRequests.id, requestId))
      .run();
  }
}