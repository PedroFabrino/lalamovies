import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { initDatabase, AppDatabase, users, downloadRequests, systemConfig } from '../src/db';
import { CleanupService } from '../src/services/cleanup';
import { CleanupCron } from '../src/jobs/cleanupCron';
import {
  DiscordNotifier,
  ResendNotifier,
  NotificationService,
  INotificationService,
  NotificationEvent,
  NotificationPayload,
} from '../src/services/notifications';
import { IJellyfinService, JellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';

class MockQBittorrent implements IQBittorrentService {
  public removedTorrents: { hash: string; deleteFiles?: boolean }[] = [];

  async addTorrent(): Promise<string> {
    return 'qb_hash_1';
  }
  async getActiveTorrentCount(): Promise<number> {
    return 0;
  }
  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    return {
      hash,
      name: 'test',
      progress: 1,
      dlspeed: 0,
      eta: 0,
      state: 'seeding',
      size: 1000,
    };
  }
  async removeTorrent(hash: string, deleteFiles?: boolean): Promise<void> {
    this.removedTorrents.push({ hash, deleteFiles });
  }
}

class MockJellyfin implements IJellyfinService {
  public refreshed = false;
  public playHistory: Record<string, string> = {};

  async authenticateUser() {
    return { accessToken: 'token', userId: 'jf_u1', username: 'alice', isAdmin: true };
  }
  async createUser() {
    return 'jf_u2';
  }
  async deleteUser() {}

  async refreshLibrary(): Promise<void> {
    this.refreshed = true;
  }

  async getPlayHistory(): Promise<Record<string, string>> {
    return this.playHistory;
  }
}

class MockNotificationService implements INotificationService {
  public sentEvents: { event: NotificationEvent; payload: NotificationPayload }[] = [];

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    this.sentEvents.push({ event, payload });
  }
}

describe('CleanupService, Notifiers & Cron (Ticket 09)', () => {
  let dbInstance: { db: AppDatabase; sqlite: any };
  let mockQb: MockQBittorrent;
  let mockJf: MockJellyfin;
  let mockNotifications: MockNotificationService;
  let tempDir: string;
  let userId: string;

  beforeEach(() => {
    dbInstance = initDatabase(':memory:', true);
    mockQb = new MockQBittorrent();
    mockJf = new MockJellyfin();
    mockNotifications = new MockNotificationService();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdm-cleanup-test-'));

    userId = 'user_alice';
    dbInstance.db.insert(users).values({
      id: userId,
      jellyfinUserId: 'jf_alice',
      username: 'alice',
      role: 'admin',
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    dbInstance.sqlite.close();
  });

  describe('Notifiers', () => {
    it('DiscordNotifier silently no-ops when webhook URL is missing', async () => {
      const notifier = new DiscordNotifier('');
      await expect(
        notifier.send('cleanup.scheduled', { title: 'Test Movie' })
      ).resolves.toBeUndefined();
    });

    it('DiscordNotifier sends POST request when webhook URL is configured', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const notifier = new DiscordNotifier('https://discord.com/api/webhooks/123/abc');
      await notifier.send('cleanup.scheduled', {
        title: 'The Matrix',
        requestId: 'req_123',
        scheduledDeleteAt: '2026-09-05T02:00:00Z',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://discord.com/api/webhooks/123/abc');
      expect((options as any).method).toBe('POST');
      const body = JSON.parse((options as any).body);
      expect(body.embeds[0].title).toContain('Cleanup Warning');
      expect(body.embeds[0].description).toContain('The Matrix');

      fetchSpy.mockRestore();
    });

    it('ResendNotifier no-ops without API key and logs when key is present', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const noKeyNotifier = new ResendNotifier('');
      await noKeyNotifier.send('download.completed', { title: 'Inception' });
      expect(consoleSpy).not.toHaveBeenCalled();

      const keyNotifier = new ResendNotifier('re_test_123');
      await keyNotifier.send('download.completed', { title: 'Inception' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ResendNotifier] download.completed: Inception')
      );
      consoleSpy.mockRestore();
    });

    it('NotificationService broadcasts to all registered notifiers', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const service = new NotificationService('https://discord.mock');
      await service.send('download.completed', { title: 'Dune' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
    });
  });

  describe('JellyfinService.getPlayHistory', () => {
    it('fetches play history and returns a map of path to LastPlayedDate', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          Items: [
            {
              Path: '/media/movies/Inception.mkv',
              UserData: {
                LastPlayedDate: '2026-09-01T12:00:00.000Z',
                Played: true,
              },
            },
            {
              Path: '/media/movies/Unplayed.mkv',
              UserData: {
                Played: false,
              },
            },
          ],
        }),
      } as Response);

      const service = new JellyfinService('http://localhost:8096', 'mock_api_key');
      const history = await service.getPlayHistory();

      expect(history['/media/movies/Inception.mkv']).toBe('2026-09-01T12:00:00.000Z');
      expect(history['/media/movies/Unplayed.mkv']).toBeUndefined();

      fetchSpy.mockRestore();
    });
  });

  describe('Cleanup candidate selection and LRU priority', () => {
    it('does not schedule cleanups if disk space is at or above warn threshold', async () => {
      // Free space is 25% (warn threshold is 20%)
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 25
      );

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_1',
        userId,
        magnetLink: 'magnet:?xt=urn:btih:1',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '1',
        metadataSource: 'tmdb',
        title: 'Movie 1',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: null,
      }).run();

      const scheduled = await cleanup.checkDiskAndClean();
      expect(scheduled.length).toBe(0);
      expect(mockNotifications.sentEvents.length).toBe(0);

      const row = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_1')).get();
      expect(row?.scheduledDeleteAt).toBeNull();
    });

    it('selects candidates in priority order (least-recently-played first, then oldest request) and respects keepFlag', async () => {
      // Free space is 10% (below 20% warn threshold)
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 10
      );

      // Populate 5 requests:
      // 1. req_keep: keepFlag = true (should be excluded completely)
      // 2. req_downloading: status = 'downloading' (should be excluded, only seeding eligible)
      // 3. req_unplayed_old: unplayed (lastPlayedAt null), requested 2026-01-01
      // 4. req_unplayed_newer: unplayed (lastPlayedAt null), requested 2026-02-01
      // 5. req_played_old: played 2026-03-01
      // 6. req_played_recent: played 2026-08-01

      dbInstance.db.insert(downloadRequests).values([
        {
          id: 'req_keep',
          userId,
          magnetLink: 'magnet:keep',
          mediaType: 'movie',
          status: 'seeding',
          metadataId: '10',
          metadataSource: 'tmdb',
          title: 'Immune Keep Movie',
          requestedAt: '2025-01-01T00:00:00Z',
          lastPlayedAt: '2025-01-02T00:00:00Z',
          keepFlag: true,
          scheduledDeleteAt: null,
        },
        {
          id: 'req_downloading',
          userId,
          magnetLink: 'magnet:dl',
          mediaType: 'movie',
          status: 'downloading',
          metadataId: '11',
          metadataSource: 'tmdb',
          title: 'Active Download Movie',
          requestedAt: '2025-01-01T00:00:00Z',
          keepFlag: false,
          scheduledDeleteAt: null,
        },
        {
          id: 'req_unplayed_newer',
          userId,
          magnetLink: 'magnet:unplayed2',
          mediaType: 'movie',
          status: 'seeding',
          metadataId: '12',
          metadataSource: 'tmdb',
          title: 'Unplayed Newer',
          requestedAt: '2026-02-01T00:00:00Z',
          lastPlayedAt: null,
          keepFlag: false,
          scheduledDeleteAt: null,
        },
        {
          id: 'req_unplayed_old',
          userId,
          magnetLink: 'magnet:unplayed1',
          mediaType: 'movie',
          status: 'seeding',
          metadataId: '13',
          metadataSource: 'tmdb',
          title: 'Unplayed Oldest',
          requestedAt: '2026-01-01T00:00:00Z',
          lastPlayedAt: null,
          keepFlag: false,
          scheduledDeleteAt: null,
        },
        {
          id: 'req_played_recent',
          userId,
          magnetLink: 'magnet:played_rec',
          mediaType: 'movie',
          status: 'seeding',
          metadataId: '14',
          metadataSource: 'tmdb',
          title: 'Played Recently',
          requestedAt: '2026-01-01T00:00:00Z',
          lastPlayedAt: '2026-08-01T00:00:00Z',
          keepFlag: false,
          scheduledDeleteAt: null,
        },
        {
          id: 'req_played_old',
          userId,
          magnetLink: 'magnet:played_old',
          mediaType: 'movie',
          status: 'seeding',
          metadataId: '15',
          metadataSource: 'tmdb',
          title: 'Played Long Ago',
          requestedAt: '2026-01-01T00:00:00Z',
          lastPlayedAt: '2026-03-01T00:00:00Z',
          keepFlag: false,
          scheduledDeleteAt: null,
        },
      ]).run();

      const scheduled = await cleanup.checkDiskAndClean();

      // Expected order:
      // 1. req_unplayed_old (null lastPlayedAt, requested Jan 1)
      // 2. req_unplayed_newer (null lastPlayedAt, requested Feb 1)
      // 3. req_played_old (lastPlayedAt March 1)
      // 4. req_played_recent (lastPlayedAt Aug 1)
      expect(scheduled.map((s) => s.id)).toEqual([
        'req_unplayed_old',
        'req_unplayed_newer',
        'req_played_old',
        'req_played_recent',
      ]);

      // All scheduled should have scheduledDeleteAt set ~24h ahead
      for (const item of scheduled) {
        expect(item.scheduledDeleteAt).toBeTruthy();
        const diffMs = new Date(item.scheduledDeleteAt!).getTime() - Date.now();
        expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
        expect(diffMs).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
      }

      // Notifications should have been sent for each candidate
      expect(mockNotifications.sentEvents.length).toBe(4);
      expect(mockNotifications.sentEvents[0].event).toBe('cleanup.scheduled');
      expect(mockNotifications.sentEvents[0].payload.title).toBe('Unplayed Oldest');

      // req_keep should NOT be scheduled
      const keepRow = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_keep')).get();
      expect(keepRow?.scheduledDeleteAt).toBeNull();
    });

    it('refreshes lastPlayedAt from Jellyfin play history before selecting candidates', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 10
      );

      const moviePath = path.join(tempDir, 'Avatar (2009)', 'Avatar (2009).mkv');
      mockJf.playHistory = {
        [moviePath]: '2026-09-02T10:00:00Z',
      };

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_avatar',
        userId,
        magnetLink: 'magnet:avatar',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '19995',
        metadataSource: 'tmdb',
        title: 'Avatar',
        jellyfinPath: moviePath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
        scheduledDeleteAt: null,
      }).run();

      await cleanup.checkDiskAndClean();

      const updated = dbInstance.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, 'req_avatar'))
        .get();

      expect(updated?.lastPlayedAt).toBe('2026-09-02T10:00:00Z');
      expect(updated?.scheduledDeleteAt).toBeTruthy();
    });
  });

  describe('executePendingCleanups', () => {
    it('executes cleanups when 24h has elapsed, deletes files, removes torrent, refreshes Jellyfin', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      // Create a dummy library directory and file
      const movieFolder = path.join(tempDir, 'Gladiator (2000)');
      fs.mkdirSync(movieFolder, { recursive: true });
      const movieFile = path.join(movieFolder, 'Gladiator (2000).mkv');
      fs.writeFileSync(movieFile, 'video-data');

      // Scheduled 25 hours ago
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_gladiator',
        userId,
        magnetLink: 'magnet:gladiator',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '98',
        metadataSource: 'tmdb',
        title: 'Gladiator',
        jellyfinPath: movieFolder,
        qbTorrentHash: 'hash_gladiator',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: pastTime,
      }).run();

      const deleted = await cleanup.executePendingCleanups();

      expect(deleted.length).toBe(1);
      expect(deleted[0].id).toBe('req_gladiator');
      expect(deleted[0].status).toBe('deleted');

      // File removed from disk
      expect(fs.existsSync(movieFolder)).toBe(false);

      // Torrent removed from qBittorrent
      expect(mockQb.removedTorrents).toContainEqual({
        hash: 'hash_gladiator',
        deleteFiles: true,
      });

      // Jellyfin refreshed
      expect(mockJf.refreshed).toBe(true);

      // cleanup.done notification sent
      expect(mockNotifications.sentEvents).toContainEqual(
        expect.objectContaining({
          event: 'cleanup.done',
          payload: expect.objectContaining({ title: 'Gladiator', requestId: 'req_gladiator' }),
        })
      );

      // Database status updated
      const row = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_gladiator')).get();
      expect(row?.status).toBe('deleted');
      expect(row?.scheduledDeleteAt).toBeNull();
    });

    it('does not clean up items whose 24h grace period has NOT yet elapsed', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      // Scheduled 10 hours in the future
      const futureTime = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_future',
        userId,
        magnetLink: 'magnet:future',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '99',
        metadataSource: 'tmdb',
        title: 'Future Movie',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: futureTime,
      }).run();

      const deleted = await cleanup.executePendingCleanups();
      expect(deleted.length).toBe(0);

      const row = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_future')).get();
      expect(row?.status).toBe('seeding');
      expect(row?.scheduledDeleteAt).toBe(futureTime);
    });

    it('cancels scheduled deletion if user turned on keepFlag during 24h window', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_rescued',
        userId,
        magnetLink: 'magnet:rescued',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'Rescued Movie',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: true, // User saved it by flipping keepFlag!
        scheduledDeleteAt: pastTime,
      }).run();

      const deleted = await cleanup.executePendingCleanups();
      expect(deleted.length).toBe(0);

      const row = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_rescued')).get();
      expect(row?.status).toBe('seeding');
      expect(row?.scheduledDeleteAt).toBeNull(); // scheduledDeleteAt cleared
      expect(mockQb.removedTorrents.length).toBe(0);
    });
  });

  describe('cleanItem (manual admin cleanup)', () => {
    it('immediately deletes an item without 24h wait', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const folder = path.join(tempDir, 'Interstellar (2014)');
      fs.mkdirSync(folder, { recursive: true });

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_interstellar',
        userId,
        magnetLink: 'magnet:interstellar',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '157336',
        metadataSource: 'tmdb',
        title: 'Interstellar',
        jellyfinPath: folder,
        qbTorrentHash: 'hash_interstellar',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: null,
      }).run();

      await cleanup.cleanItem('req_interstellar');

      expect(fs.existsSync(folder)).toBe(false);
      expect(mockQb.removedTorrents).toContainEqual({
        hash: 'hash_interstellar',
        deleteFiles: true,
      });
      expect(mockJf.refreshed).toBe(true);

      const row = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_interstellar')).get();
      expect(row?.status).toBe('deleted');
      expect(mockNotifications.sentEvents).toContainEqual(
        expect.objectContaining({
          event: 'cleanup.done',
          payload: expect.objectContaining({ title: 'Interstellar' }),
        })
      );
    });
  });

  describe('CleanupCron', () => {
    it('runOnce executes pending cleanups then checks disk and schedules', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 10 // Disk low
      );

      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      // Pending item to delete
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_pending',
        userId,
        magnetLink: 'magnet:pending',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '1',
        metadataSource: 'tmdb',
        title: 'Pending Deletion',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: pastTime,
      }).run();

      // New candidate to schedule
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_new_cand',
        userId,
        magnetLink: 'magnet:new_cand',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '2',
        metadataSource: 'tmdb',
        title: 'New Candidate',
        requestedAt: '2026-02-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: null,
      }).run();

      const cronJob = new CleanupCron({
        cleanupService: cleanup,
      });

      await cronJob.runOnce();

      // Pending item should now be deleted
      const pendingRow = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_pending')).get();
      expect(pendingRow?.status).toBe('deleted');

      // Candidate item should now be scheduled
      const candRow = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_new_cand')).get();
      expect(candRow?.scheduledDeleteAt).toBeTruthy();
    });

    it('start and stop control the scheduled task lifecycle', () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const cronJob = new CleanupCron({
        cleanupService: cleanup,
        schedule: '0 2 * * *',
      });

      cronJob.start();
      expect((cronJob as any).task).not.toBeNull();
      cronJob.stop();
      expect((cronJob as any).task).toBeNull();
    });
  });
});
