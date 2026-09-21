import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { initDatabase, AppDatabase, users, downloadRequests, systemConfig, requestCoRequesters } from '../src/db';
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

import { MockQBittorrent } from './fixtures/mockQBittorrent';
import { MockJellyfin } from './fixtures/mockJellyfin';

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

    it('triggers cleanup when storage quota usage reaches 80% even if physical disk has plenty of space', async () => {
      // Configure 100 GB storage quota
      dbInstance.db
        .insert(systemConfig)
        .values({
          key: 'storage_quota_gb',
          value: '100',
        })
        .onConflictDoUpdate({ target: systemConfig.key, set: { value: '100' } })
        .run();

      // Free physical space is 90% (well above 20% warn threshold), but footprint is 80 GB (80% of 100 GB quota)
      const mockFileSystem = {
        buildLibraryPath: () => '',
        hardlink: () => {},
        hardlinkDirectory: () => {},
        getStorageFootprintBytes: async () => 80 * 1024 * 1024 * 1024,
      };

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 90, // 90% physical free
        () => 500 * 1024 * 1024 * 1024, // 500 GB free
        mockFileSystem
      );

      dbInstance.db.insert(downloadRequests).values({
        id: 'req_quota_candidate',
        userId,
        magnetLink: 'magnet:?xt=urn:btih:quota1',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'Quota Candidate Movie',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: null,
      }).run();

      const scheduled = await cleanup.checkDiskAndClean();
      expect(scheduled.length).toBe(1);
      expect(scheduled[0].id).toBe('req_quota_candidate');
      expect(mockNotifications.sentEvents.length).toBe(1);
      expect(mockNotifications.sentEvents[0].event).toBe('cleanup.scheduled');
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

  describe('Co-requester cleanup cascade and keep flag immunity (Ticket 08)', () => {
    let otherUser1: string;
    let otherUser2: string;

    beforeEach(() => {
      otherUser1 = 'user_bob';
      otherUser2 = 'user_charlie';

      dbInstance.db.insert(users).values([
        {
          id: otherUser1,
          jellyfinUserId: 'jf_bob',
          username: 'bob',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
        {
          id: otherUser2,
          jellyfinUserId: 'jf_charlie',
          username: 'charlie',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      ]).run();
    });

    it('cleanItem full path removes media files, updates status, and removes co-requester rows', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const folder = path.join(tempDir, 'Dune (2021)');
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, 'movie.mkv'), 'dummy movie content');

      const reqId = 'req_dune_coreq';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:dune',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '438631',
        metadataSource: 'tmdb',
        title: 'Dune',
        year: 2021,
        jellyfinPath: folder,
        qbTorrentHash: 'hash_dune',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: null,
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: reqId, userId: otherUser1, addedAt: '2026-01-01T01:00:00Z' },
        { requestId: reqId, userId: otherUser2, addedAt: '2026-01-01T02:00:00Z' },
      ]).run();

      // Assert co-requesters exist before cleanup
      const coReqsBefore = dbInstance.db
        .select()
        .from(requestCoRequesters)
        .where(eq(requestCoRequesters.requestId, reqId))
        .all();
      expect(coReqsBefore).toHaveLength(2);

      // Run cleanItem
      await cleanup.cleanItem(reqId);

      // Verify media file removed from disk
      expect(fs.existsSync(folder)).toBe(false);

      // Verify torrent removed from qB
      expect(mockQb.removedTorrents).toContainEqual({
        hash: 'hash_dune',
        deleteFiles: true,
      });

      // Verify Jellyfin refreshed
      expect(mockJf.refreshed).toBe(true);

      // Verify canonical row marked deleted
      const row = dbInstance.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, reqId))
        .get();
      expect(row?.status).toBe('deleted');

      // Verify all co-requester rows removed
      const coReqsAfter = dbInstance.db
        .select()
        .from(requestCoRequesters)
        .where(eq(requestCoRequesters.requestId, reqId))
        .all();
      expect(coReqsAfter).toHaveLength(0);

      // Notification sent
      expect(mockNotifications.sentEvents).toContainEqual(
        expect.objectContaining({
          event: 'cleanup.done',
          payload: expect.objectContaining({ title: 'Dune' }),
        })
      );
    });

    it('SQLite ON DELETE CASCADE removes co-requester rows on hard delete', () => {
      const reqId = 'req_hard_del_coreq';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:hard_del',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '99999',
        metadataSource: 'tmdb',
        title: 'Hard Delete Movie',
        requestedAt: '2026-01-01T00:00:00Z',
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: reqId, userId: otherUser1, addedAt: '2026-01-01T01:00:00Z' },
      ]).run();

      expect(
        dbInstance.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, reqId)).all()
      ).toHaveLength(1);

      // Perform hard delete on download_requests
      dbInstance.db.delete(downloadRequests).where(eq(downloadRequests.id, reqId)).run();

      // SQLite foreign key cascade removes child rows
      expect(
        dbInstance.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, reqId)).all()
      ).toHaveLength(0);
    });

    it('executePendingCleanups removes co-requester rows when deleting expired pending items', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const folder = path.join(tempDir, 'Expired Item');
      fs.mkdirSync(folder, { recursive: true });

      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const reqId = 'req_expired_coreq';

      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:expired',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '88888',
        metadataSource: 'tmdb',
        title: 'Expired Item',
        jellyfinPath: folder,
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: pastTime,
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: reqId, userId: otherUser1, addedAt: '2026-01-01T01:00:00Z' },
        { requestId: reqId, userId: otherUser2, addedAt: '2026-01-01T02:00:00Z' },
      ]).run();

      const deleted = await cleanup.executePendingCleanups!();
      expect(deleted.some((d) => d.id === reqId)).toBe(true);
      expect(fs.existsSync(folder)).toBe(false);

      const coReqs = dbInstance.db
        .select()
        .from(requestCoRequesters)
        .where(eq(requestCoRequesters.requestId, reqId))
        .all();
      expect(coReqs).toHaveLength(0);
    });

    it('keepFlag immunity: request with multiple co-requesters is not removed by auto-cleanup', async () => {
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 5 // Low disk space to trigger candidate scheduling
      );

      const reqId = 'req_protected_keep';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:keep_protected',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '77777',
        metadataSource: 'tmdb',
        title: 'Protected Movie',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: true, // Keep flag set
        scheduledDeleteAt: null,
      }).run();

      // Has 2 co-requesters
      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: reqId, userId: otherUser1, addedAt: '2026-01-01T01:00:00Z' },
        { requestId: reqId, userId: otherUser2, addedAt: '2026-01-01T02:00:00Z' },
      ]).run();

      // Trigger auto-cleanup check
      const candidates = await cleanup.checkDiskAndClean!();

      // Should not be in candidates scheduled for deletion
      expect(candidates.some((c) => c.id === reqId)).toBe(false);

      const row = dbInstance.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, reqId))
        .get();
      expect(row?.scheduledDeleteAt).toBeNull();
      expect(row?.status).toBe('seeding');

      // Even if scheduledDeleteAt was somehow previously set and keepFlag is true, executePendingCleanups clears it
      dbInstance.db.update(downloadRequests).set({
        scheduledDeleteAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      }).where(eq(downloadRequests.id, reqId)).run();

      await cleanup.executePendingCleanups!();

      const rowAfter = dbInstance.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, reqId))
        .get();
      expect(rowAfter?.scheduledDeleteAt).toBeNull();
      expect(rowAfter?.status).toBe('seeding');

      // Co-requesters remain intact
      const coReqs = dbInstance.db
        .select()
        .from(requestCoRequesters)
        .where(eq(requestCoRequesters.requestId, reqId))
        .all();
      expect(coReqs).toHaveLength(2);
    });

    it('auto-cleanup LRU priority evaluates canonical row lastPlayedAt updated by Jellyfin history', async () => {
      const path1 = path.join(tempDir, 'Show A');
      const path2 = path.join(tempDir, 'Show B');
      fs.mkdirSync(path1, { recursive: true });
      fs.mkdirSync(path2, { recursive: true });

      // req1 requested earlier, but played recently by co-requester in Jellyfin
      const req1Id = 'req_show_a';
      dbInstance.db.insert(downloadRequests).values({
        id: req1Id,
        userId,
        magnetLink: 'magnet:show_a',
        mediaType: 'tv',
        status: 'seeding',
        metadataId: 'show_a_meta',
        metadataSource: 'tvdb',
        title: 'Show A',
        jellyfinPath: path1,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: req1Id, userId: otherUser1, addedAt: '2026-01-01T01:00:00Z' },
      ]).run();

      // req2 requested later, but never played
      const req2Id = 'req_show_b';
      dbInstance.db.insert(downloadRequests).values({
        id: req2Id,
        userId,
        magnetLink: 'magnet:show_b',
        mediaType: 'tv',
        status: 'seeding',
        metadataId: 'show_b_meta',
        metadataSource: 'tvdb',
        title: 'Show B',
        jellyfinPath: path2,
        requestedAt: '2026-01-05T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      // Co-requester watched Show A recently, but primary requester did not (partially consumed -> Tier 2)
      mockJf.userPlayHistories = {
        jf_alice: {},
        jf_bob: {
          [path1]: '2026-02-01T12:00:00Z',
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
      // req2 (never played) should be candidate #1 for deletion before req1 (played recently)
      expect(candidates[0].id).toBe(req2Id);
      expect(candidates[1].id).toBe(req1Id);
    });
  });

  describe('ADR 0014 — Fully Consumed Tier in Cleanup Priority', () => {
    let userBob: string;
    let userCharlie: string;

    beforeEach(() => {
      userBob = 'user_bob_fc';
      userCharlie = 'user_charlie_fc';

      dbInstance.db.insert(users).values([
        {
          id: userBob,
          jellyfinUserId: 'jf_bob_fc',
          username: 'bob_fc',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
        {
          id: userCharlie,
          jellyfinUserId: 'jf_charlie_fc',
          username: 'charlie_fc',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      ]).run();
    });

    it('identifies single requester watched media as fully consumed (Tier 1)', async () => {
      const moviePath = path.join(tempDir, 'Inception (2010)');
      fs.mkdirSync(moviePath, { recursive: true });

      const reqId = 'req_fc_single_watched';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:inception',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '27205',
        metadataSource: 'tmdb',
        title: 'Inception',
        jellyfinPath: moviePath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(moviePath, 'Inception.mkv')]: '2026-04-01T12:00:00Z',
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
      expect(candidates[0].id).toBe(reqId);
      expect(candidates[0].isFullyConsumed).toBe(true);
      expect(candidates[0].lastPlayedAt).toBe('2026-04-01T12:00:00Z');
    });

    it('identifies single requester unwatched media as not fully consumed (Tier 2)', async () => {
      const moviePath = path.join(tempDir, 'Tenet (2020)');
      fs.mkdirSync(moviePath, { recursive: true });

      const reqId = 'req_fc_single_unwatched';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:tenet',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '577922',
        metadataSource: 'tmdb',
        title: 'Tenet',
        jellyfinPath: moviePath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      mockJf.userPlayHistories = {
        jf_alice: {},
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
      expect(candidates[0].id).toBe(reqId);
      expect(candidates[0].isFullyConsumed).toBe(false);
      expect(candidates[0].lastPlayedAt).toBeNull();
    });

    it('requires all requesters (primary + co-requesters) to have watched for fully consumed status', async () => {
      const showPath = path.join(tempDir, 'Breaking Bad');
      fs.mkdirSync(showPath, { recursive: true });

      const reqId = 'req_bb';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId, // Alice
        magnetLink: 'magnet:bb',
        mediaType: 'tv',
        status: 'seeding',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        jellyfinPath: showPath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: reqId, userId: userBob, addedAt: '2026-01-01T01:00:00Z' },
      ]).run();

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      // Scenario A: Only Alice has watched -> NOT fully consumed
      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(showPath, 'Season 1', 'bb_s01e01.mkv')]: '2026-02-01T10:00:00Z',
        },
        jf_bob_fc: {},
      };

      let candidates = await cleanup.getCandidates!();
      expect(candidates[0].isFullyConsumed).toBe(false);

      // Scenario B: Bob also watched -> NOW fully consumed!
      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(showPath, 'Season 1', 'bb_s01e01.mkv')]: '2026-02-01T10:00:00Z',
        },
        jf_bob_fc: {
          [path.join(showPath, 'Season 1', 'bb_s01e02.mkv')]: '2026-02-05T15:00:00Z',
        },
      };

      candidates = await cleanup.getCandidates!();
      expect(candidates[0].isFullyConsumed).toBe(true);
      // Canonical row lastPlayedAt updated to latest play timestamp
      expect(candidates[0].lastPlayedAt).toBe('2026-02-05T15:00:00Z');
    });

    it('treats requester whose Jellyfin account no longer exists (404) as having watched', async () => {
      const moviePath = path.join(tempDir, 'Oppenheimer (2023)');
      fs.mkdirSync(moviePath, { recursive: true });

      const reqId = 'req_oppenheimer';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId, // Alice
        magnetLink: 'magnet:oppenheimer',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '872585',
        metadataSource: 'tmdb',
        title: 'Oppenheimer',
        jellyfinPath: moviePath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: reqId, userId: userCharlie, addedAt: '2026-01-01T01:00:00Z' },
      ]).run();

      // Alice watched it
      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(moviePath, 'Oppenheimer.mkv')]: '2026-03-01T12:00:00Z',
        },
      };

      // Charlie's Jellyfin account was deleted (returns 404)
      mockJf.deletedUserIds.add('jf_charlie_fc');

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      const candidates = await cleanup.getCandidates!();
      expect(candidates).toHaveLength(1);
      // Treated as fully consumed because Charlie has no account (no access, no objection to deletion)
      expect(candidates[0].isFullyConsumed).toBe(true);
    });

    it('orders Fully Consumed (Tier 1) candidates ahead of unwatched (Tier 2) candidates', async () => {
      const consumedPath = path.join(tempDir, 'Watched Movie');
      const unwatchedPath = path.join(tempDir, 'Unwatched Movie');
      fs.mkdirSync(consumedPath, { recursive: true });
      fs.mkdirSync(unwatchedPath, { recursive: true });

      // Item 1: Fully consumed (watched Jan 20)
      const reqConsumed = 'req_tier1_consumed';
      dbInstance.db.insert(downloadRequests).values({
        id: reqConsumed,
        userId,
        magnetLink: 'magnet:consumed',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '1001',
        metadataSource: 'tmdb',
        title: 'Watched Movie',
        jellyfinPath: consumedPath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      // Item 2: Unwatched, requested even earlier (Dec 2025)
      const reqUnwatched = 'req_tier2_unwatched';
      dbInstance.db.insert(downloadRequests).values({
        id: reqUnwatched,
        userId,
        magnetLink: 'magnet:unwatched',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '1002',
        metadataSource: 'tmdb',
        title: 'Unwatched Movie',
        jellyfinPath: unwatchedPath,
        requestedAt: '2025-12-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(consumedPath, 'movie.mkv')]: '2026-01-20T12:00:00Z',
        },
      };

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 10 // Low disk space triggers auto-cleanup
      );

      // Check candidate ordering via getCandidates()
      const candidates = await cleanup.getCandidates!();
      expect(candidates).toHaveLength(2);
      expect(candidates[0].id).toBe(reqConsumed);
      expect(candidates[0].isFullyConsumed).toBe(true);
      expect(candidates[1].id).toBe(reqUnwatched);
      expect(candidates[1].isFullyConsumed).toBe(false);

      // Check candidate scheduling via checkDiskAndClean()
      const scheduled = await cleanup.checkDiskAndClean!();
      expect(scheduled).toHaveLength(2);
      expect(scheduled[0].id).toBe(reqConsumed);
      expect(scheduled[1].id).toBe(reqUnwatched);
    });

    it('orders candidates within Tier 1 by lastPlayedAt ASC (oldest watched first)', async () => {
      const pathOld = path.join(tempDir, 'Old Consumed');
      const pathNew = path.join(tempDir, 'Recent Consumed');
      fs.mkdirSync(pathOld, { recursive: true });
      fs.mkdirSync(pathNew, { recursive: true });

      const reqOld = 'req_fc_old';
      dbInstance.db.insert(downloadRequests).values({
        id: reqOld,
        userId,
        magnetLink: 'magnet:old',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '2001',
        metadataSource: 'tmdb',
        title: 'Old Consumed',
        jellyfinPath: pathOld,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      const reqNew = 'req_fc_new';
      dbInstance.db.insert(downloadRequests).values({
        id: reqNew,
        userId,
        magnetLink: 'magnet:new',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '2002',
        metadataSource: 'tmdb',
        title: 'Recent Consumed',
        jellyfinPath: pathNew,
        requestedAt: '2026-01-02T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(pathOld, 'old.mkv')]: '2026-02-01T00:00:00Z', // Played earlier
          [path.join(pathNew, 'new.mkv')]: '2026-08-01T00:00:00Z', // Played later
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
      expect(candidates[0].id).toBe(reqOld);
      expect(candidates[1].id).toBe(reqNew);
    });

    it('queries getPlayHistory(jellyfinUserId) once per unique requester during refreshPlayHistory', async () => {
      const pathA = path.join(tempDir, 'Item A');
      const pathB = path.join(tempDir, 'Item B');
      fs.mkdirSync(pathA, { recursive: true });
      fs.mkdirSync(pathB, { recursive: true });

      // Request 1 has Alice & Bob
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_multi_1',
        userId, // Alice
        magnetLink: 'magnet:m1',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '3001',
        metadataSource: 'tmdb',
        title: 'Item A',
        jellyfinPath: pathA,
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: 'req_multi_1', userId: userBob, addedAt: '2026-01-01T01:00:00Z' },
      ]).run();

      // Request 2 also has Alice & Bob
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_multi_2',
        userId, // Alice
        magnetLink: 'magnet:m2',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '3002',
        metadataSource: 'tmdb',
        title: 'Item B',
        jellyfinPath: pathB,
        requestedAt: '2026-01-02T00:00:00Z',
        keepFlag: false,
      }).run();

      dbInstance.db.insert(requestCoRequesters).values([
        { requestId: 'req_multi_2', userId: userBob, addedAt: '2026-01-02T01:00:00Z' },
      ]).run();

      mockJf.queriedUserIds = [];

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      await cleanup.getCandidates!();

      // Exactly 1 call for jf_alice and 1 call for jf_bob_fc, despite appearing on multiple requests
      expect(mockJf.queriedUserIds.filter((id) => id === 'jf_alice')).toHaveLength(1);
      expect(mockJf.queriedUserIds.filter((id) => id === 'jf_bob_fc')).toHaveLength(1);
    });

    it('clears isFullyConsumed status when item is manually cleaned or auto-deleted', async () => {
      const moviePath = path.join(tempDir, 'Clean Target');
      fs.mkdirSync(moviePath, { recursive: true });

      const reqId = 'req_clean_target';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId,
        magnetLink: 'magnet:cleantarget',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '4001',
        metadataSource: 'tmdb',
        title: 'Clean Target',
        jellyfinPath: moviePath,
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
      }).run();

      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(moviePath, 'movie.mkv')]: '2026-05-01T00:00:00Z',
        },
      };

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      let candidates = await cleanup.getCandidates!();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].isFullyConsumed).toBe(true);

      // Clean item
      await cleanup.cleanItem(reqId);
      candidates = await cleanup.getCandidates!();
      expect(candidates.find((c) => c.id === reqId)).toBeUndefined();
    });

    it('quota-bounded scheduling only schedules Tier 1 when deficit is satisfied, sparing Tier 2', async () => {
      const consumedPath = path.join(tempDir, 'Watched Big Movie');
      const unwatchedPath = path.join(tempDir, 'Unwatched Movie');
      fs.mkdirSync(consumedPath, { recursive: true });
      fs.mkdirSync(unwatchedPath, { recursive: true });

      // Tier 1 item: 10 GB
      const reqConsumed = 'req_tier1_10gb';
      dbInstance.db.insert(downloadRequests).values({
        id: reqConsumed,
        userId,
        magnetLink: 'magnet:consumed',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '5001',
        metadataSource: 'tmdb',
        title: 'Watched Big Movie',
        jellyfinPath: consumedPath,
        sizeBytes: 10 * 1024 * 1024 * 1024,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      // Tier 2 item: 5 GB
      const reqUnwatched = 'req_tier2_5gb';
      dbInstance.db.insert(downloadRequests).values({
        id: reqUnwatched,
        userId,
        magnetLink: 'magnet:unwatched',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '5002',
        metadataSource: 'tmdb',
        title: 'Unwatched Movie',
        jellyfinPath: unwatchedPath,
        sizeBytes: 5 * 1024 * 1024 * 1024,
        requestedAt: '2025-12-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(consumedPath, 'movie.mkv')]: '2026-01-20T12:00:00Z',
        },
      };

      // Set storage quota to 100 GB. Footprint at 85 GB (85% > 80% warn threshold).
      // Deficit: 85 - 80 + 1 = 6 GB.
      // Candidate 1 (Tier 1) reclaims 10 GB >= 6 GB deficit, so Candidate 2 (Tier 2) must be spared!
      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir,
        () => 50, // 50% physical free (healthy disk)
        () => 500 * 1024 * 1024 * 1024, // plenty of free bytes
        {
          buildLibraryPath: () => '',
          hardlink: () => {},
          hardlinkDirectory: () => {},
          getStorageFootprintBytes: async () => 85 * 1024 * 1024 * 1024, // 85 GB footprint
        }
      );

      // Configure storage_quota_gb = 100 in DB
      dbInstance.db
        .insert(systemConfig)
        .values({
          key: 'storage_quota_gb',
          value: '100',
        })
        .onConflictDoUpdate({ target: systemConfig.key, set: { value: '100' } })
        .run();

      const scheduled = await cleanup.checkDiskAndClean!();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].id).toBe(reqConsumed);

      // Verify Tier 2 item was NOT scheduled
      const unwatchedRow = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, reqUnwatched)).get();
      expect(unwatchedRow?.scheduledDeleteAt).toBeNull();
    });

    it('server-wide play history updates lastPlayedAt for non-requester viewer', async () => {
      const moviePath = path.join(tempDir, 'Shared Movie');
      fs.mkdirSync(moviePath, { recursive: true });

      const reqId = 'req_non_requester_view';
      dbInstance.db.insert(downloadRequests).values({
        id: reqId,
        userId, // Alice requested
        magnetLink: 'magnet:shared',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '6001',
        metadataSource: 'tmdb',
        title: 'Shared Movie',
        jellyfinPath: moviePath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: null,
        keepFlag: false,
      }).run();

      // Dave (not a requester) watched the movie on Jellyfin
      mockJf.playHistory = {
        [path.join(moviePath, 'movie.mkv')]: '2026-05-15T20:00:00Z',
      };
      // Alice (requester) has NOT watched it
      mockJf.userPlayHistories = {
        jf_alice: {},
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
      expect(candidates[0].id).toBe(reqId);
      // Not fully consumed because Alice (requester) hasn't watched
      expect(candidates[0].isFullyConsumed).toBe(false);
      // But lastPlayedAt is updated from server-wide play history
      expect(candidates[0].lastPlayedAt).toBe('2026-05-15T20:00:00Z');

      const updatedRow = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, reqId)).get();
      expect(updatedRow?.lastPlayedAt).toBe('2026-05-15T20:00:00Z');
    });

    it('executePendingCleanups deletes expired items in priority order (Tier 1 before Tier 2)', async () => {
      const consumedPath = path.join(tempDir, 'Delete Tier 1');
      const unwatchedPath = path.join(tempDir, 'Delete Tier 2');
      fs.mkdirSync(consumedPath, { recursive: true });
      fs.mkdirSync(unwatchedPath, { recursive: true });

      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();

      const reqTier1 = 'req_del_tier1';
      dbInstance.db.insert(downloadRequests).values({
        id: reqTier1,
        userId,
        magnetLink: 'magnet:d1',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '7001',
        metadataSource: 'tmdb',
        title: 'Delete Tier 1',
        jellyfinPath: consumedPath,
        requestedAt: '2026-01-01T00:00:00Z',
        lastPlayedAt: '2026-02-01T00:00:00Z',
        scheduledDeleteAt: pastDate,
        keepFlag: false,
      }).run();

      const reqTier2 = 'req_del_tier2';
      dbInstance.db.insert(downloadRequests).values({
        id: reqTier2,
        userId,
        magnetLink: 'magnet:d2',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '7002',
        metadataSource: 'tmdb',
        title: 'Delete Tier 2',
        jellyfinPath: unwatchedPath,
        requestedAt: '2025-12-01T00:00:00Z',
        lastPlayedAt: null,
        scheduledDeleteAt: pastDate,
        keepFlag: false,
      }).run();

      mockJf.userPlayHistories = {
        jf_alice: {
          [path.join(consumedPath, 'movie.mkv')]: '2026-02-01T00:00:00Z',
        },
      };

      const cleanup = new CleanupService(
        dbInstance.db,
        mockQb,
        mockJf,
        mockNotifications,
        tempDir
      );

      // Populate fullyConsumedRequestIds cache first
      await cleanup.getCandidates!();

      const deleted = await cleanup.executePendingCleanups!();
      expect(deleted).toHaveLength(2);
      // Tier 1 deleted first, Tier 2 second
      expect(deleted[0].id).toBe(reqTier1);
      expect(deleted[1].id).toBe(reqTier2);
    });
  });
});
