import fs from 'node:fs';
import path from 'node:path';
import { eq, and, isNull, isNotNull, lte, asc } from 'drizzle-orm';
import { AppDatabase, systemConfig, downloadRequests, DownloadRequest, users, requestCoRequesters } from '../db';
import { IQBittorrentService } from './qbittorrent';
import { IJellyfinService } from './jellyfin';
import { INotificationService } from './notifications';
import { IFileSystemService } from './fileSystem';
import { IRequestStateMachine, RequestStateMachine, RequestStatus } from './requestStateMachine';
import { RequestsRepository } from './requestsRepository';

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
}

export function matchesLibraryPath(itemPath: string, parentPath: string): boolean {
  const normReq = parentPath.replace(/\\/g, '/').toLowerCase();
  const normItem = itemPath.replace(/\\/g, '/').toLowerCase();
  return normItem === normReq || normItem.startsWith(normReq.endsWith('/') ? normReq : normReq + '/');
}

export class CleanupService implements ICleanupService {
  private fullyConsumedRequestIds = new Set<string>();
  private stateMachine?: IRequestStateMachine;

  constructor(
    private db: AppDatabase,
    private qbittorrent: IQBittorrentService,
    private jellyfin?: IJellyfinService,
    private notificationService?: INotificationService,
    private mediaPath?: string,
    private diskFreePercentProvider?: () => number,
    private diskFreeBytesProvider?: () => number,
    private fileSystemService?: IFileSystemService,
    private storageFootprintProvider?: () => number,
    stateMachine?: IRequestStateMachine
  ) {
    this.stateMachine =
      stateMachine ||
      new RequestStateMachine(
        new RequestsRepository(db),
        undefined,
        jellyfin,
        notificationService
      );
  }

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

  private getCandidateReclaimBytes(item: DownloadRequest): number {
    if (item.sizeBytes && item.sizeBytes > 0) {
      return item.sizeBytes;
    }
    if (item.jellyfinPath && fs.existsSync(item.jellyfinPath)) {
      try {
        const stat = fs.statSync(item.jellyfinPath);
        if (!stat.isDirectory()) {
          return stat.size;
        }
      } catch {
        // continue
      }
    }
    return 2 * 1024 * 1024 * 1024; // 2 GB nominal fallback
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
        .where(eq(downloadRequests.status, RequestStatus.SEEDING))
        .all();

      if (seedingRequests.length === 0) {
        this.fullyConsumedRequestIds.clear();
        return;
      }

      // 1. Fetch server-wide play history and merge all known users' play histories
      let globalHistory: Record<string, string> = {};
      try {
        globalHistory = { ...((await this.jellyfin.getPlayHistory()) || {}) };
      } catch {
        // Continue if server-wide history call fails
      }

      // 2. Fetch per-user play history for all registered Jellyfin users
      const allCoReqs = this.db.select().from(requestCoRequesters).all();
      const coReqMap = new Map<string, string[]>();
      for (const cr of allCoReqs) {
        if (!coReqMap.has(cr.requestId)) {
          coReqMap.set(cr.requestId, []);
        }
        coReqMap.get(cr.requestId)!.push(cr.userId);
      }

      const allUsers = this.db.select().from(users).all();
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      type UserHistoryResult = { accountExists: boolean; history: Record<string, string> };
      const requesterHistoryCache = new Map<string, UserHistoryResult>();

      for (const u of allUsers) {
        if (!u.jellyfinUserId) continue;
        const jfUid = u.jellyfinUserId;
        if (!requesterHistoryCache.has(jfUid)) {
          try {
            const userHistory = await this.jellyfin.getPlayHistory(jfUid);
            requesterHistoryCache.set(jfUid, {
              accountExists: true,
              history: userHistory || {},
            });
            // Merge into globalHistory to maintain canonical lastPlayedAt across all viewers
            for (const [itemPath, playedDate] of Object.entries(userHistory || {})) {
              if (!globalHistory[itemPath] || new Date(playedDate) > new Date(globalHistory[itemPath])) {
                globalHistory[itemPath] = playedDate;
              }
            }
          } catch (err: any) {
            const statusCode = err?.statusCode || err?.status;
            const msg = String(err?.message || err).toLowerCase();
            const isNotFound = statusCode === 404 || msg.includes('404') || msg.includes('not found');
            requesterHistoryCache.set(jfUid, {
              accountExists: !isNotFound,
              history: {},
            });
          }
        }
      }

      for (const req of seedingRequests) {
        if (!req.jellyfinPath) continue;
        let latestPlayed = req.lastPlayedAt || null;

        for (const [itemPath, playedDate] of Object.entries(globalHistory)) {
          if (matchesLibraryPath(itemPath, req.jellyfinPath)) {
            const validDate = playedDate && !isNaN(new Date(playedDate).getTime())
              ? playedDate
              : '1970-01-01T00:00:00.000Z';
            if (!latestPlayed || new Date(validDate) > new Date(latestPlayed)) {
              latestPlayed = validDate;
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

      const newFullyConsumed = new Set<string>();

      for (const req of seedingRequests) {
        if (!req.jellyfinPath) continue;

        const reqUserIds = new Set<string>();
        if (req.userId) reqUserIds.add(req.userId);
        const coReqs = coReqMap.get(req.id) || [];
        for (const c of coReqs) reqUserIds.add(c);

        let allRequestersWatched = reqUserIds.size > 0;
        let latestRequesterPlay: string | null = null;

        for (const rUid of reqUserIds) {
          const u = userMap.get(rUid);
          const cacheKey = u?.jellyfinUserId || rUid;
          const userRes = requesterHistoryCache.get(cacheKey);

          if (!userRes || !userRes.accountExists) {
            continue;
          }

          let requesterWatched = false;
          for (const [itemPath, playedDate] of Object.entries(userRes.history)) {
            if (matchesLibraryPath(itemPath, req.jellyfinPath)) {
              requesterWatched = true;
              const validDate = playedDate && !isNaN(new Date(playedDate).getTime())
                ? playedDate
                : '1970-01-01T00:00:00.000Z';
              if (!latestRequesterPlay || new Date(validDate) > new Date(latestRequesterPlay)) {
                latestRequesterPlay = validDate;
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

        if (latestRequesterPlay && (!req.lastPlayedAt || new Date(latestRequesterPlay) > new Date(req.lastPlayedAt))) {
          this.db
            .update(downloadRequests)
            .set({ lastPlayedAt: latestRequesterPlay })
            .where(eq(downloadRequests.id, req.id))
            .run();
          req.lastPlayedAt = latestRequesterPlay;
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
          eq(downloadRequests.status, RequestStatus.SEEDING),
          eq(downloadRequests.keepFlag, false),
          isNull(downloadRequests.scheduledDeleteAt)
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

    const hasFootprintTracking = Boolean(
      this.fileSystemService?.getStorageFootprintBytes || this.storageFootprintProvider
    );

    const isQuotaWarnExceeded =
      hasFootprintTracking &&
      storageQuotaBytes > 0 &&
      footprintBytes / storageQuotaBytes >= 0.8;

    // When storage quota footprint is tracked (production), quota usage governs (CONTEXT.md line 107).
    // Physical disk space only triggers cleanup if host disk is critically unsafe (!hostSafe, < 10 GB free).
    // If storage quota footprint is not tracked (legacy unit tests), physical disk percentFree < warnThreshold governs.
    const isDiskSpaceLow = hasFootprintTracking
      ? !hostSafe
      : (percentFree < warnThreshold || !hostSafe);

    if (!isQuotaWarnExceeded && !isDiskSpaceLow) {
      return [];
    }

    // Free space is below warn threshold or storage quota >= 80%!
    // Calculate bytes needed to recover
    let quotaDeficitBytes = 0;
    if (isQuotaWarnExceeded) {
      quotaDeficitBytes = Math.max(1, footprintBytes - (storageQuotaBytes * 0.8) + (1024 * 1024 * 1024));
    }

    let diskDeficitBytes = 0;
    if (isDiskSpaceLow) {
      if (hasFootprintTracking && !hostSafe) {
        const freeBytes = this.getFreeDiskBytes(customPath);
        const MIN_HOST_FREE_BYTES = 10 * 1024 * 1024 * 1024;
        diskDeficitBytes = Math.max(1, MIN_HOST_FREE_BYTES + (1024 * 1024 * 1024) - freeBytes);
      } else {
        const freeBytes = this.getFreeDiskBytes(customPath);
        const totalBytes = percentFree > 0 ? (freeBytes / (percentFree / 100)) : (freeBytes + 20 * 1024 * 1024 * 1024);
        const targetFreeBytes = totalBytes * (warnThreshold / 100);
        diskDeficitBytes = Math.max(1, targetFreeBytes - freeBytes);
      }
    }

    const deficitBytes = Math.max(quotaDeficitBytes, diskDeficitBytes);

    // 1. Refresh play history from Jellyfin and evaluate Fully Consumed tier
    await this.refreshPlayHistory();

    // 2. Select candidates (status='seeding', keepFlag=false, scheduledDeleteAt is null)
    // Priority: Tier 1 (Fully Consumed) first, then Tier 2 (remaining requests).
    const candidates = this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.status, RequestStatus.SEEDING),
          eq(downloadRequests.keepFlag, false),
          isNull(downloadRequests.scheduledDeleteAt)
        )
      )
      .all();

    const sortedCandidates = this.sortCandidates(candidates);

    const scheduledDeleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduled: DownloadRequest[] = [];
    let reclaimedBytes = 0;

    for (const item of sortedCandidates) {
      if (deficitBytes > 0 && reclaimedBytes >= deficitBytes) {
        break;
      }

      this.db
        .update(downloadRequests)
        .set({ scheduledDeleteAt })
        .where(eq(downloadRequests.id, item.id))
        .run();

      item.scheduledDeleteAt = scheduledDeleteAt;
      scheduled.push(item);
      reclaimedBytes += this.getCandidateReclaimBytes(item);

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
    // 5-minute tolerance window to handle cron execution timing jitter
    const nowIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const pending = this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.status, RequestStatus.SEEDING),
          isNotNull(downloadRequests.scheduledDeleteAt),
          lte(downloadRequests.scheduledDeleteAt, nowIso)
        )
      )
      .all();

    const sortedPending = this.sortCandidates(pending);
    const deleted: DownloadRequest[] = [];

    for (const item of sortedPending) {
      // If user enabled keepFlag during the 24h grace period, cancel cleanup
      if (item.keepFlag) {
        this.db
          .update(downloadRequests)
          .set({ scheduledDeleteAt: null })
          .where(eq(downloadRequests.id, item.id))
          .run();
        continue;
      }

      // 1. Remove torrent from qBittorrent and delete files from staging
      if (item.qbTorrentHash) {
        try {
          await this.qbittorrent.removeTorrent(item.qbTorrentHash, true);
        } catch {
          // Continue even if qB removal fails
        }
      }

      // 2. Delete media file/folder from Jellyfin library
      if (item.jellyfinPath && fs.existsSync(item.jellyfinPath)) {
        try {
          fs.rmSync(item.jellyfinPath, { recursive: true, force: true });
        } catch {
          // Continue
        }
      }

      // 3 & 4. Trigger Jellyfin refresh and update status to deleted
      if (this.stateMachine) {
        await this.stateMachine.transition(item.id, RequestStatus.DELETED, {
          refreshJellyfin: true,
          broadcast: false,
          extraFields: { scheduledDeleteAt: null },
        });
      } else {
        if (typeof this.jellyfin?.safeRefresh === 'function') {
          await this.jellyfin.safeRefresh();
        } else if (typeof this.jellyfin?.refreshLibrary === 'function') {
          try {
            await this.jellyfin.refreshLibrary();
          } catch {
            // Continue
          }
        }

        this.db
          .update(downloadRequests)
          .set({
            status: RequestStatus.DELETED,
            scheduledDeleteAt: null,
          })
          .where(eq(downloadRequests.id, item.id))
          .run();
      }

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

    // 3 & 4. Trigger Jellyfin refresh and mark status deleted
    if (this.stateMachine) {
      await this.stateMachine.transition(requestId, RequestStatus.DELETED, {
        refreshJellyfin: true,
        broadcast: false,
        extraFields: { scheduledDeleteAt: null },
      });
    } else {
      if (typeof this.jellyfin?.safeRefresh === 'function') {
        await this.jellyfin.safeRefresh();
      } else if (typeof this.jellyfin?.refreshLibrary === 'function') {
        try {
          await this.jellyfin.refreshLibrary();
        } catch {
          // Continue
        }
      }

      this.db
        .update(downloadRequests)
        .set({
          status: RequestStatus.DELETED,
          scheduledDeleteAt: null,
        })
        .where(eq(downloadRequests.id, requestId))
        .run();
    }

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