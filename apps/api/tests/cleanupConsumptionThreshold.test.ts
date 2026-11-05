import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initDatabase, AppDatabase, users, downloadRequests } from '../src/db';
import { CleanupService } from '../src/services/cleanup';
import { EpisodesRepository } from '../src/services/episodesRepository';
import { RequestsRepository } from '../src/services/requestsRepository';
import { INotificationService } from '../src/services/notifications';
import { MockQBittorrent } from './fixtures/mockQBittorrent';
import { MockJellyfin } from './fixtures/mockJellyfin';
import { PlayHistoryEntry } from '../src/utils/playbackConsumption';

class MockNotifications implements INotificationService {
  async send(): Promise<void> {}
}

describe('90% Playback Consumption Threshold in CleanupService', () => {
  let dbInstance: { db: AppDatabase; sqlite: { close: () => void } };
  let mockQb: MockQBittorrent;
  let mockJf: MockJellyfin;
  let mockNotifications: INotificationService;
  let tempDir: string;
  let userId: string;

  beforeEach(() => {
    dbInstance = initDatabase(':memory:', true);
    mockQb = new MockQBittorrent();
    mockJf = new MockJellyfin();
    mockNotifications = new MockNotifications();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-threshold-test-'));

    userId = 'user_viewer';
    dbInstance.db.insert(users).values({
      id: userId,
      jellyfinUserId: 'jf_viewer',
      username: 'viewer',
      role: 'user',
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
    dbInstance.sqlite.close();
  });

  it('updates lastPlayedAt but does not mark item as fully consumed when watched below 90%', async () => {
    const movieDir = path.join(tempDir, 'Partially Watched Movie (2026)');
    fs.mkdirSync(movieDir, { recursive: true });
    const movieFile = path.join(movieDir, 'movie.mkv');
    fs.writeFileSync(movieFile, 'fake movie content');

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_partial',
      userId,
      magnetLink: 'magnet:partial',
      mediaType: 'movie',
      status: 'seeding',
      metadataId: '501',
      metadataSource: 'tmdb',
      title: 'Partially Watched Movie',
      jellyfinPath: movieDir,
      sizeBytes: 5 * 1024 * 1024 * 1024,
      requestedAt: '2026-08-01T00:00:00Z',
      lastPlayedAt: null,
      keepFlag: false,
    }).run();

    // User paused movie at 30% (isFullyConsumed = false)
    mockJf.userPlayHistories = {
      jf_viewer: {
        [movieFile]: {
          lastPlayedDate: '2026-09-15T20:00:00.000Z',
          isFullyConsumed: false,
        } as unknown as string,
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

    // Activity timestamp is recorded
    expect(candidates[0].lastPlayedAt).toBe('2026-09-15T20:00:00.000Z');
    // But it is NOT marked as fully consumed!
    expect(candidates[0].isFullyConsumed).toBe(false);
  });

  it('marks movie as fully consumed when watched >= 90% or played=true', async () => {
    const movieDir = path.join(tempDir, 'Finished Movie (2026)');
    fs.mkdirSync(movieDir, { recursive: true });
    const movieFile = path.join(movieDir, 'movie.mkv');
    fs.writeFileSync(movieFile, 'fake movie content');

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_finished',
      userId,
      magnetLink: 'magnet:finished',
      mediaType: 'movie',
      status: 'seeding',
      metadataId: '502',
      metadataSource: 'tmdb',
      title: 'Finished Movie',
      jellyfinPath: movieDir,
      sizeBytes: 5 * 1024 * 1024 * 1024,
      requestedAt: '2026-08-01T00:00:00Z',
      lastPlayedAt: null,
      keepFlag: false,
    }).run();

    // User watched >= 90% (isFullyConsumed = true)
    mockJf.userPlayHistories = {
      jf_viewer: {
        [movieFile]: {
          lastPlayedDate: '2026-09-20T21:30:00.000Z',
          isFullyConsumed: true,
        } as unknown as string,
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

    expect(candidates[0].lastPlayedAt).toBe('2026-09-20T21:30:00.000Z');
    expect(candidates[0].isFullyConsumed).toBe(true);
  });

  it('requires all episodes to be fully consumed (>=90%) for season pack to be fully consumed', async () => {
    const showDir = path.join(tempDir, 'Anime Show (2026)');
    fs.mkdirSync(showDir, { recursive: true });
    const ep1File = path.join(showDir, 'S01E01.mkv');
    const ep2File = path.join(showDir, 'S01E02.mkv');
    fs.writeFileSync(ep1File, 'ep1');
    fs.writeFileSync(ep2File, 'ep2');

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_show',
      userId,
      magnetLink: 'magnet:show',
      mediaType: 'anime',
      status: 'seeding',
      metadataId: '601',
      metadataSource: 'anilist',
      title: 'Anime Show',
      jellyfinPath: showDir,
      sizeBytes: 2 * 1024 * 1024 * 1024,
      requestedAt: '2026-08-01T00:00:00Z',
      lastPlayedAt: null,
      keepFlag: false,
    }).run();

    const episodesRepo = new EpisodesRepository(dbInstance.db);
    const requestsRepo = new RequestsRepository(dbInstance.db);

    episodesRepo.create({
      requestId: 'req_show',
      seasonNumber: 1,
      episodeNumber: 1,
      fileIndex: 0,
      relativePath: 'S01E01.mkv',
      jellyfinPath: ep1File,
      sizeBytes: 1024 * 1024 * 1024,
    });

    episodesRepo.create({
      requestId: 'req_show',
      seasonNumber: 1,
      episodeNumber: 2,
      fileIndex: 1,
      relativePath: 'S01E02.mkv',
      jellyfinPath: ep2File,
      sizeBytes: 1024 * 1024 * 1024,
    });

    // Ep 1 is finished (>= 90%), but Ep 2 is only paused at 20%
    mockJf.userPlayHistories = {
      jf_viewer: {
        [ep1File]: {
          lastPlayedDate: '2026-09-10T10:00:00.000Z',
          isFullyConsumed: true,
        } as unknown as string,
        [ep2File]: {
          lastPlayedDate: '2026-09-11T11:00:00.000Z',
          isFullyConsumed: false,
        } as unknown as string,
      },
    };

    const cleanup = new CleanupService({
      db: dbInstance.db,
      requestsRepo,
      episodesRepo,
      qbittorrent: mockQb,
      jellyfin: mockJf,
      notificationService: mockNotifications,
      mediaPath: tempDir,
    });

    let candidates = await cleanup.getCandidates!();
    expect(candidates).toHaveLength(1);
    // Not fully consumed yet because Ep 2 is incomplete
    expect(candidates[0].isFullyConsumed).toBe(false);

    // Now user finishes Ep 2 as well
    mockJf.userPlayHistories.jf_viewer[ep2File] = {
      lastPlayedDate: '2026-09-12T12:00:00.000Z',
      isFullyConsumed: true,
    } as unknown as string;

    candidates = await cleanup.getCandidates!();
    expect(candidates).toHaveLength(1);
    // Now both episodes are finished -> Whole request is fully consumed
    expect(candidates[0].isFullyConsumed).toBe(true);
    expect(candidates[0].lastPlayedAt).toBe('2026-09-12T12:00:00.000Z');
  });

  it('reads media_consumption_threshold from system_config and forwards it to JellyfinService', async () => {
    const { systemConfig } = await import('../src/db');
    // Set consumption threshold to 75%
    dbInstance.db.insert(systemConfig).values({
      key: 'media_consumption_threshold',
      value: '75',
    }).run();

    // Insert a seeding request so refreshPlayHistory executes
    dbInstance.db.insert(downloadRequests).values({
      id: 'req_threshold_check',
      userId,
      magnetLink: 'magnet:check',
      mediaType: 'movie',
      status: 'seeding',
      metadataId: '701',
      metadataSource: 'tmdb',
      title: 'Threshold Check Movie',
      jellyfinPath: path.join(tempDir, 'movie.mkv'),
      requestedAt: '2026-08-01T00:00:00Z',
    }).run();

    let capturedThreshold: number | undefined;
    mockJf.getPlayHistory = async (
      _userId?: string,
      threshold?: number
    ): Promise<Record<string, string | PlayHistoryEntry>> => {
      capturedThreshold = threshold;
      return {};
    };

    const cleanup = new CleanupService(
      dbInstance.db,
      mockQb,
      mockJf,
      mockNotifications,
      tempDir
    );

    await cleanup.getCandidates!();
    // 75% was parsed and passed as 0.75
    expect(capturedThreshold).toBe(0.75);
  });
});
