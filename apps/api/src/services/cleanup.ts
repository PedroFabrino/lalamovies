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
  getCandidates?(): Promise<(DownloadRequest & { isFullyConsumed?: boolean })[]>;
  isFullyConsumed?(requestId: string): boolean;
}

export class CleanupService implements ICleanupService {
  private fullyConsumedRequestIds = new Set<string>();

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

  isFullyConsumed(requestId: string): boolean {
    return this.fullyConsumedRequestIds.has(requestId);
  }

  private sortCandidates(candidates: DownloadRequest[]): DownloadRequest[] {
    const tier1: DownloadRequest[] = [];
    const tier2: DownloadRequest[] = [];

    for (const item of candidates) {
      if (this.fullyConsumedRequestIds.has(item.id)) {
        tier1.push(item);
      } else {
        tier2.push(item);
      }
    }

    const comparator = (a: DownloadRequest, b: DownloadRequest): number => {
      if (a.lastPlayedAt && b.lastPlayedAt) {
        const timeDiff = new Date(a.lastPlayedAt).getTime() - new Date(b.lastPlayedAt).getTime();
        if (timeDiff !== 0) return timeDiff;
      } else if (!a.lastPlayedAt && b.lastPlayedAt) {
        return -1;
      } else if (a.lastPlayedAt && !b.lastPlayedAt) {
        return 1;
      }

      return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
    };

    tier1.sort(comparator);
    tier2.sort(comparator);

    return [...tier1, ...tier2];
  }

  async refreshPlayHistory(): Promise<void> {
    if (!this.jellyfin?.getPlayHistory) return;

    try {
      const seedingRequests = this.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.status, 'seeding'))
        .all();

      if (seedingRequests.length === 0) {
        this.fullyConsumedRequestIds.clear();
        return;
      }

      const allCoReqs = this.db.select().from(requestCoRequesters).all();
      const coReqMap = new Map<string, string[]>();
      for (const cr of allCoReqs) {
        if (!coReqMap.has(cr.requestId)) {
          coReqMap.set(cr.requestId, []);
        }
        coReqMap.get(cr.requestId)!.push(cr.userId);
      }

      const allUserIds = new Set<string>();
      for (const req of seedingRequests) {
        if (req.userId) allUserIds.add(req.userId);
        const coReqs = coReqMap.get(req.id) || [];
        for (const uid of coReqs) {
          allUserIds.add(uid);
        }
      }

      const allUsers = this.db.select().from(users).all();
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      type UserHistoryResult = { accountExists: boolean; history: Record<string, string> };
      const historyCache = new Map<string, UserHistoryResult>();

      for (const uid of allUserIds) {
        const u = userMap.get(uid);
        if (!u || !u.jellyfinUserId) {
          historyCache.set(uid, { accountExists: false, history: {} });
          continue;
        }

        const jfUid = u.jellyfinUserId;
        const cached = historyCache.get(jfUid);
        if (cached) {
          historyCache.set(uid, cached);
          continue;
        }

        try {
          const userHistory = await this.jellyfin.getPlayHistory(jfUid);
          const res: UserHistoryResult = {
            accountExists: true,
            history: userHistory || {},
          };
          historyCache.set(jfUid, res);
          historyCache.set(uid, res);
        } catch (err: any) {
          const statusCode = err?.statusCode || err?.status;
          const msg = String(err?.message || err).toLowerCase();
          const isNotFound = statusCode === 404 || msg.includes('404') || msg.includes('not found');
          if (isNotFound) {
            const res: UserHistoryResult = { accountExists: false, history: {} };
            historyCache.set(jfUid, res);
            historyCache.set(uid, res);
          } else {
            const res: UserHistoryResult = { accountExists: true, history: {} };
            historyCache.set(jfUid, res);
            historyCache.set(uid, res);
          }
        }
      }

      if (allUserIds.size === 0) {
        try {
          const globalHistory = await this.jellyfin.getPlayHistory();
          historyCache.set('__global__', { accountExists: true, history: globalHistory || {} });
        } catch {
          // ignore
        }
      }

      const newFullyConsumed = new Set<string>();

      for (const req of seedingRequests) {
        if (!req.jellyfinPath) continue;

        const normReq = req.jellyfinPath.replace(/\\/g, '/').toLowerCase();
        const reqUserIds = new Set<string>();
        if (req.userId) reqUserIds.add(req.userId);
        const coReqs = coReqMap.get(req.id) || [];
        for (const c of coReqs) reqUserIds.add(c);

        let allRequestersWatched = reqUserIds.size > 0;
        let latestPlayed: string | null = null;

        for (const rUid of reqUserIds) {
          const userRes = historyCache.get(rUid);
          if (!userRes || !userRes.accountExists) {
            continue;
          }

          let requesterWatched = false;
          for (const [itemPath, playedDate] of Object.entries(userRes.history)) {
            const normItem = itemPath.replace(/\\/g, '/').toLowerCase();
            if (normItem === normReq || normItem.startsWith(normReq.endsWith('/') ? normReq : normReq + '/')) {
              requesterWatched = true;
              if (!latestPlayed || new Date(playedDate) > new Date(latestPlayed)) {
                latestPlayed = playedDate;
              }
            }
          }

          if (!requesterWatched) {
            allRequestersWatched = false;
          }
        }

        if (allRequestersWatched) {
          newFullyConsumed.add(req.id);
        }

        for (const userRes of historyCache.values()) {
          if (!userRes.accountExists) continue;
          for (const [itemPath, playedDate] of Object.entries(userRes.history)) {
            const normItem = itemPath.replace(/\\/g, '/').toLowerCase();
            if (normItem === normReq || normItem.startsWith(normReq.endsWith('/') ? normReq : normReq + '/')) {
              if (!latestPlayed || new Date(playedDate) > new Date(latestPlayed)) {
                latestPlayed = playedDate;
              }
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

      this.fullyConsumedRequestIds = newFullyConsumed;
    } catch {
      // Silently continue if Jellyfin call fails
    }
  }

  async getCandidates(): Promise<(DownloadRequest & { isFullyConsumed?: boolean })[]> {
    await this.refreshPlayHistory();

    const candidates = this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.status, 'seeding'),
          eq(downloadRequests.keepFlag, false)
        )
      )
      .all();

    const sorted = this.sortCandidates(candidates);
    return sorted.map((c) => ({
      ...c,
      isFullyConsumed: this.fullyConsumedRequestIds.has(c.id),
    }));
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
    // 1. Refresh play history from Jellyfin and evaluate Fully Consumed tier
    await this.refreshPlayHistory();

    // 2. Select candidates (status='seeding', keepFlag=false, scheduledDeleteAt is null)
    // Priority: Tier 1 (Fully Consumed) first, then Tier 2 (remaining requests).
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
      .all();

    const sortedCandidates = this.sortCandidates(candidates);

    const scheduledDeleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduled: DownloadRequest[] = [];

    for (const item of sortedCandidates) {
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

      this.fullyConsumedRequestIds.delete(item.id);
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
        const parentDir = path.dirname(libraryPath);
        if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
          fs.rmdirSync(parentDir);
        }
      } catch {
        // Continue
      }
    }

    if (this.fileSystemService?.invalidateFootprintCache) {
      this.fileSystemService.invalidateFootprintCache();
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

    this.fullyConsumedRequestIds.delete(requestId);

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