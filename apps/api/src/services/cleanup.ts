import fs from 'node:fs';
import path from 'node:path';
import { eq, and, isNull, isNotNull, lte, asc } from 'drizzle-orm';
import { AppDatabase, systemConfig, downloadRequests, DownloadRequest, users, requestCoRequesters } from '../db';
import { IQBittorrentService } from './qbittorrent';
import { IJellyfinService } from './jellyfin';
import { INotificationService } from './notifications';
import { IFileSystemService } from './fileSystem';

export interface SpaceCheckResult {
  sufficient: boolean;
  percentFree: number;
  threshold: number;
}

export interface ICleanupService {
  isSpaceSufficient(targetPath?: string): SpaceCheckResult;
  getPercentFree?(targetPath?: string): number;
  getFreeDiskBytes?(targetPath?: string): number;
  isHostDiskSafe?(targetPath?: string): boolean;
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
    private diskFreePercentProvider?: () => number,
    private diskFreeBytesProvider?: () => number,
    private fileSystemService?: IFileSystemService,
    private storageFootprintProvider?: () => number
  ) {}

  getFreeDiskBytes(customPath?: string): number {
    if (this.diskFreeBytesProvider) {
      return this.diskFreeBytesProvider();
    }
    const target = customPath || this.mediaPath || process.env.MEDIA_PATH || process.cwd();
    try {
      const checkPath = fs.existsSync(target) ? target : process.cwd();
      const statfs = fs.statfsSync(checkPath);
      return Number(BigInt(statfs.bavail) * BigInt(statfs.bsize));
    } catch {
      return 100 * 1024 * 1024 * 1024;
    }
  }

  isHostDiskSafe(customPath?: string): boolean {
    const MIN_HOST_FREE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
    const freeBytes = this.getFreeDiskBytes(customPath);
    return freeBytes >= MIN_HOST_FREE_BYTES;
  }

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
    const hostSafe = this.isHostDiskSafe(customPath);

    return {
      sufficient: percentFree >= threshold && hostSafe,
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
    const hostSafe = this.isHostDiskSafe(customPath);

    // Check storage quota threshold (80% usage triggers cleanup warning per Spec #3)
    const quotaRow = this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'storage_quota_gb'))
      .get();

    const storageQuotaGb = quotaRow
      ? parseInt(quotaRow.value, 10)
      : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
    const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
    const footprintBytes = this.fileSystemService?.getStorageFootprintBytes
      ? this.fileSystemService.getStorageFootprintBytes()
      : this.storageFootprintProvider
        ? this.storageFootprintProvider()
        : 0;

    const isQuotaWarnExceeded =
      storageQuotaBytes > 0 && footprintBytes / storageQuotaBytes >= 0.8;
    const isDiskSpaceLow = percentFree < warnThreshold || !hostSafe;

    if (!isQuotaWarnExceeded && !isDiskSpaceLow) {
      return [];
    }

    // Free space is below warn threshold or storage quota >= 80%!
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
          mediaType: item.mediaType,
          year: item.year,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
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

      this.db
        .delete(requestCoRequesters)
        .where(eq(requestCoRequesters.requestId, item.id))
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
          mediaType: item.mediaType,
          year: item.year,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
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
    let torrentHashToRemove = request.qbTorrentHash;
    if (!torrentHashToRemove && this.qbittorrent.getAllTorrents && request.title) {
      try {
        const allTorrents = await this.qbittorrent.getAllTorrents();
        const reqCleanTitle = request.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = allTorrents.find((t) => {
          const tCleanName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return tCleanName.includes(reqCleanTitle) || reqCleanTitle.includes(tCleanName);
        });
        if (matched) {
          torrentHashToRemove = matched.hash;
        }
      } catch {
        // Silently continue
      }
    }

    if (torrentHashToRemove) {
      try {
        await this.qbittorrent.removeTorrent(torrentHashToRemove, true);
      } catch {
        // Silently log or continue
      }
    }

    // 2. Remove library files if path exists
    let libraryPath = request.jellyfinPath;
    if (!libraryPath && this.mediaPath && request.title) {
      const yearSuffix = request.year ? ` (${request.year})` : '';
      const candidateDir = path.join(this.mediaPath, request.mediaType === 'movie' ? 'movies' : 'shows', `${request.title}${yearSuffix}`);
      if (fs.existsSync(candidateDir)) {
        libraryPath = candidateDir;
      }
    }

    if (libraryPath && fs.existsSync(libraryPath)) {
      try {
        fs.rmSync(libraryPath, { recursive: true, force: true });
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

    this.db
      .delete(requestCoRequesters)
      .where(eq(requestCoRequesters.requestId, requestId))
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
        mediaType: request.mediaType,
        year: request.year,
        seasonNumber: request.seasonNumber,
        episodeNumber: request.episodeNumber,
        requestedBy,
        path: request.jellyfinPath ?? undefined,
      });
    }
  }
}