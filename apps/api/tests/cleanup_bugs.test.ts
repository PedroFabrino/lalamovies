import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { initDatabase, AppDatabase, users, downloadRequests, systemConfig } from '../src/db';
import { CleanupService } from '../src/services/cleanup';
import { IJellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService } from '../src/services/qbittorrent';
import { INotificationService } from '../src/services/notifications';

class MockQBittorrent implements IQBittorrentService {
  async addTorrent(): Promise<string> { return 'hash'; }
  async getActiveTorrentCount(): Promise<number> { return 0; }
  async getTorrentStatus(): Promise<any> { return null; }
  async removeTorrent(): Promise<void> {}
}

class MockNotifications implements INotificationService {
  async send(): Promise<void> {}
}

class MockJellyfin implements IJellyfinService {
  public userPlayHistories: Record<string, Record<string, string>> = {};
  public globalPlayHistory: Record<string, string> = {};

  async authenticateUser(): Promise<any> { return null; }
  async createUser(): Promise<string> { return ''; }
  async deleteUser(): Promise<void> {}
  async refreshLibrary(): Promise<void> {}

  async getPlayHistory(userId?: string): Promise<Record<string, string>> {
    if (userId) {
      return this.userPlayHistories[userId] || {};
    }
    return this.globalPlayHistory;
  }
}

describe('Cleanup Bug Reproduction - Issue: full library marked for deletion without taking watch status into account', () => {
  let dbInstance: { db: AppDatabase; sqlite: any };
  let mockQb: MockQBittorrent;
  let mockJf: MockJellyfin;
  let mockNotifications: MockNotifications;
  let tempDir: string;
  let userId: string;

  beforeEach(() => {
    dbInstance = initDatabase(':memory:', true);
    mockQb = new MockQBittorrent();
    mockJf = new MockJellyfin();
    mockNotifications = new MockNotifications();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-bugs-test-'));

    userId = 'user_admin';
    dbInstance.db.insert(users).values({
      id: userId,
      jellyfinUserId: 'jf_admin',
      username: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    dbInstance.sqlite.close();
  });

  describe('Bug A: Ordering of watched vs unwatched items in candidate selection', () => {
    it('schedules watched/consumed media before unwatched media, NOT unwatched before watched', async () => {
      const watchedPath = path.join(tempDir, 'Watched Movie (2020)');
      const unwatchedPath = path.join(tempDir, 'Unwatched Movie (2026)');
      fs.mkdirSync(watchedPath, { recursive: true });
      fs.mkdirSync(unwatchedPath, { recursive: true });

      // Unwatched item requested 2 months ago
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_unwatched',
        userId,
        magnetLink: 'magnet:unwatched',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '101',
        metadataSource: 'tmdb',
        title: 'Unwatched Movie',
        jellyfinPath: unwatchedPath,
        sizeBytes: 10 * 1024 * 1024 * 1024,
        requestedAt: '2026-07-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      // Partially played item (watched 1 month ago)
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_watched',
        userId,
        magnetLink: 'magnet:watched',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '102',
        metadataSource: 'tmdb',
        title: 'Watched Movie',
        jellyfinPath: watchedPath,
        sizeBytes: 10 * 1024 * 1024 * 1024,
        requestedAt: '2026-08-01T00:00:00Z',
        lastPlayedAt: '2026-08-15T00:00:00Z',
        keepFlag: false,
      }).run();

      const watchedFile = path.join(watchedPath, 'movie.mkv');
      fs.writeFileSync(watchedFile, 'test');

      mockJf.userPlayHistories = {
        jf_admin: {
          [watchedFile]: '2026-08-15T00:00:00Z',
        },
      };

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const candidates = await cleanup.getCandidates!();
      expect(candidates).toHaveLength(2);

      // Watched content must be scheduled for deletion BEFORE unwatched content!
      // A user should NOT lose movies they haven't watched yet while movies they've already watched remain untouched!
      expect(candidates[0].id).toBe('req_watched');
      expect(candidates[1].id).toBe('req_unwatched');
    });
  });

  describe('Bug B: Storage Quota vs Physical Disk', () => {
    it('does not trigger cleanup when storage quota usage is healthy (<80%) even if physical host disk free % is low, as long as host disk is safe (>10GB free)', async () => {
      // Configure storage quota = 350 GB
      dbInstance.db.insert(systemConfig).values({
        key: 'storage_quota_gb',
        value: '350',
      }).onConflictDoUpdate({ target: systemConfig.key, set: { value: '350' } }).run();
      dbInstance.db.insert(systemConfig).values({
        key: 'disk_warn_threshold',
        value: '20',
      }).onConflictDoUpdate({ target: systemConfig.key, set: { value: '20' } }).run();

      // Footprint is 192 GB (55% of 350 GB quota - perfectly healthy!)
      const mockFs = {
        buildLibraryPath: () => '',
        hardlink: () => {},
        hardlinkDirectory: () => {},
        getStorageFootprintBytes: () => 192 * 1024 * 1024 * 1024,
      };

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 17, // Physical host disk reports 17% free (< 20% warn threshold)
        () => 340 * 1024 * 1024 * 1024, // But has 340 GB free (> 10 GB host safe threshold!)
        mockFs
      );

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_anime_ep1',
        userId,
        magnetLink: 'magnet:anime1',
        mediaType: 'anime',
        status: 'seeding',
        metadataId: '201',
        metadataSource: 'tmdb',
        title: 'Anime Episode 1',
        sizeBytes: 1500000000,
        requestedAt: '2026-09-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      const scheduled = await cleanup.checkDiskAndClean!();
      // Storage quota is at 55% (<80%) and host disk has 340 GB free (>10 GB safe floor).
      // Automatic cleanup should NOT trigger and should NOT schedule deletions!
      expect(scheduled).toHaveLength(0);
    });
  });

  describe('Bug C: Cron Timing Jitter in executePendingCleanups', () => {
    it('executes cleanups scheduled ~24h ago even if cron fires a few seconds before the exact millisecond', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      // Suppose item was scheduled 23 hours, 59 minutes, and 57 seconds ago (3 seconds short of exact 24h)
      // because the previous night's cron ran at 02:00:03.196Z and tonight's cron ran at 02:00:00.000Z.
      const scheduledDeleteAt = new Date(Date.now() + 3000).toISOString(); // 3 seconds in the future

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_almost_elapsed',
        userId,
        magnetLink: 'magnet:almost',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '301',
        metadataSource: 'tmdb',
        title: 'Almost Elapsed Movie',
        requestedAt: '2026-09-01T00:00:00Z',
        scheduledDeleteAt,
        keepFlag: false,
      }).run();

      const deleted = await cleanup.executePendingCleanups!();
      // Items due within a reasonable tolerance window (e.g. 1-5 minutes) of the nightly cron run should be executed,
      // avoiding skipping them and re-triggering new candidate scheduling!
      expect(deleted).toHaveLength(1);
      expect(deleted[0].id).toBe('req_almost_elapsed');
    });
  });

  describe('Bug D: Jellyfin Play History matching', () => {
    it('recognizes media as watched even if Jellyfin returns Played=true with undefined LastPlayedDate', async () => {
      const moviePath = path.join(tempDir, 'Series or Movie (2026)');
      fs.mkdirSync(moviePath, { recursive: true });

      const reqId = 'req_played_without_date';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:nodate',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '401',
        metadataSource: 'tmdb',
        title: 'Played Without Date Movie',
        jellyfinPath: moviePath,
        requestedAt: '2026-09-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      // Jellyfin has Played=true, but LastPlayedDate is missing/undefined
      mockJf.userPlayHistories = {
        jf_admin: {
          [path.join(moviePath, 'movie.mkv')]: '', // empty string or mapped from Played=true
        },
      };

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const candidates = await cleanup.getCandidates!();
      expect(candidates).toHaveLength(1);
      // Should be recognized as played / fully consumed by the requester!
      expect(candidates[0].isFullyConsumed).toBe(true);
      expect(candidates[0].lastPlayedAt).toBeTruthy();
    });
  });
});
