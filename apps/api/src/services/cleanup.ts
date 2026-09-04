import fs from 'node:fs';
import { eq, and, isNull, isNotNull, lte, asc } from 'drizzle-orm';
import { AppDatabase, systemConfig, downloadRequests, DownloadRequest, users } from '../db';
import { IQBittorrentService } from './qbittorrent';
import { IJellyfinService } from './jellyfin';
import { INotificationService } from './notifications';

export interface SpaceCheckResult {
  sufficient: boolean;
  percentFree: number;
  threshold: number;
}

export interface ICleanupService {
  isSpaceSufficient(targetPath?: string): SpaceCheckResult;
  getPercentFree?(targetPath?: string): number;
  checkDiskAndClean?(targetPath?: string): Promise<DownloadRequest[]>;
  executePendingCleanups?(): Promise<DownloadRequest[]>;
  cleanItem(requestId: string): Promise<void>;
  getCandidates?(): Promise<DownloadRequest[]>;
}

export class CleanupService implements ICleanupService {
  constructor(
    private db: AppDatabase,
    private qbittorrent: IQBittorrentService,
    private jellyfin?: IJellyfinService,
    private notificationService?: INotificationService,
    private mediaPath?: string,
    private diskFreePercentProvider?: () => number
  ) {}

  getPercentFree(customPath?: string): number {
    if (this.diskFreePercentProvider) {
      return this.diskFreePercentProvider();
    }
    const target = customPath || this.mediaPath || process.env.MEDIA_PATH || process.cwd();
    try {
      const checkPath = fs.existsSync(target) ? target : process.cwd();
      const statfs = fs.statfsSync(checkPath);
      if (statfs.blocks > 0) {
        return Math.round((statfs.bavail / statfs.blocks) * 100);
      }
    } catch {
      return 100;
    }
    return 100;
  }

  isSpaceSufficient(customPath?: string): SpaceCheckResult {
    const configRow = this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'disk_reject_threshold'))
      .get();

    const threshold = configRow ? parseInt(configRow.value, 10) : 15;
    const percentFree = this.getPercentFree(customPath);

    return {
      sufficient: percentFree >= threshold,
      percentFree,
      threshold,
    };
  }

  async refreshPlayHistory(): Promise<void> {
    if (!this.jellyfin?.getPlayHistory) return;

    try {
      const history = await this.jellyfin.getPlayHistory();
      const seedingRequests = this.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.status, 'seeding'))
        .all();

      for (const req of seedingRequests) {
        if (!req.jellyfinPath) continue;
        let latestPlayed: string | null = null;
        const normReq = req.jellyfinPath.replace(/\\/g, '/').toLowerCase();

        for (const [itemPath, playedDate] of Object.entries(history)) {
          const normItem = itemPath.replace(/\\/g, '/').toLowerCase();
          if (normItem === normReq || normItem.startsWith(normReq.endsWith('/') ? normReq : normReq + '/')) {
            if (!latestPlayed || new Date(playedDate) > new Date(latestPlayed)) {
              latestPlayed = playedDate;
            }
          }
        }

        if (latestPlayed && latestPlayed !== req.lastPlayedAt) {
          this.db
            .update(downloadRequests)
            .set({ lastPlayedAt: latestPlayed })
            .where(eq(downloadRequests.id, req.id))
            .run();
          req.lastPlayedAt = latestPlayed;
        }
      }
    } catch {
      // Silently continue if Jellyfin call fails
    }
  }

  async getCandidates(): Promise<DownloadRequest[]> {
    await this.refreshPlayHistory();

    return this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.status, 'seeding'),
          eq(downloadRequests.keepFlag, false)
        )
      )
      .orderBy(asc(downloadRequests.lastPlayedAt), asc(downloadRequests.requestedAt))
      .all();
  }

  async checkDiskAndClean(customPath?: string): Promise<DownloadRequest[]> {
    const configRow = this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'disk_warn_threshold'))
      .get();

    const warnThreshold = configRow ? parseInt(configRow.value, 10) : 20;
    const percentFree = this.getPercentFree(customPath);

    if (percentFree >= warnThreshold) {
      return [];
    }

    // Free space is below warn threshold!
    // 1. Refresh play history from Jellyfin
    await this.refreshPlayHistory();

    // 2. Select candidates (status='seeding', keepFlag=false, scheduledDeleteAt is null)
    // Priority: least-recently-played first (nulls first in SQLite ASC), then oldest request
    const candidates = this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.status, 'seeding'),
          eq(downloadRequests.keepFlag, false),
          isNull(downloadRequests.scheduledDeleteAt)
        )
      )
      .orderBy(asc(downloadRequests.lastPlayedAt), asc(downloadRequests.requestedAt))
      .all();

    const scheduledDeleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduled: DownloadRequest[] = [];

    for (const item of candidates) {
      this.db
        .update(downloadRequests)
        .set({ scheduledDeleteAt })
        .where(eq(downloadRequests.id, item.id))
        .run();

      item.scheduledDeleteAt = scheduledDeleteAt;
      scheduled.push(item);

      if (this.notificationService) {
        await this.notificationService.send('cleanup.scheduled', {
          title: item.title,
          requestId: item.id,
          scheduledDeleteAt,
          path: item.jellyfinPath ?? undefined,
        });
      }
    }

    return scheduled;
  }

  async executePendingCleanups(): Promise<DownloadRequest[]> {
    const nowIso = new Date().toISOString();
    const pending = this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.status, 'seeding'),
          isNotNull(downloadRequests.scheduledDeleteAt),
          lte(downloadRequests.scheduledDeleteAt, nowIso)
        )
      )
      .all();

    const deleted: DownloadRequest[] = [];

    for (const item of pending) {
      // If user enabled keepFlag during the 24h grace period, cancel cleanup
      if (item.keepFlag) {
        this.db
          .update(downloadRequests)
          .set({ scheduledDeleteAt: null })
          .where(eq(downloadRequests.id, item.id))
          .run();
        continue;
      }

      // 1. Remove torrent from qBittorrent
      if (item.qbTorrentHash) {
        try {
          await this.qbittorrent.removeTorrent(item.qbTorrentHash, true);
        } catch {
          // Continue
        }
      }

      // 2. Remove files from Library
      if (item.jellyfinPath && fs.existsSync(item.jellyfinPath)) {
        try {
          fs.rmSync(item.jellyfinPath, { recursive: true, force: true });
        } catch {
          // Continue
        }
      }

      // 3. Trigger Jellyfin refresh
      if (this.jellyfin?.refreshLibrary) {
        try {
          await this.jellyfin.refreshLibrary();
        } catch {
          // Continue
        }
      }

      // 4. Update status in database
      this.db
        .update(downloadRequests)
        .set({
          status: 'deleted',
          scheduledDeleteAt: null,
        })
        .where(eq(downloadRequests.id, item.id))
        .run();

      item.status = 'deleted';
      item.scheduledDeleteAt = null;
      deleted.push(item);

      let requestedBy: string | undefined;
      if (item.userId) {
        const u = this.db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, item.userId))
          .get();
        requestedBy = u?.username;
      }

      // 5. Send notification
      if (this.notificationService) {
        await this.notificationService.send('cleanup.done', {
          title: item.title,
          requestId: item.id,
          requestedBy,
          path: item.jellyfinPath ?? undefined,
        });
      }
    }

    return deleted;
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
      } catch {
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

    // 3. Trigger Jellyfin refresh
    if (this.jellyfin?.refreshLibrary) {
      try {
        await this.jellyfin.refreshLibrary();
      } catch {
        // Continue
      }
    }

    // 4. Mark status deleted
    this.db
      .update(downloadRequests)
      .set({
        status: 'deleted',
        scheduledDeleteAt: null,
      })
      .where(eq(downloadRequests.id, requestId))
      .run();

    let requestedBy: string | undefined;
    if (request.userId) {
      const u = this.db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, request.userId))
        .get();
      requestedBy = u?.username;
    }

    // 5. Send notification
    if (this.notificationService) {
      await this.notificationService.send('cleanup.done', {
        title: request.title,
        requestId: request.id,
        requestedBy,
        path: request.jellyfinPath ?? undefined,
      });
    }
  }
}