import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpNextService } from '../src/services/upNext';
import { initDatabase, downloadRequests, users } from '../src/db';
import { FastifyInstance } from 'fastify';
import { buildWatcherApp } from '../../watcher/src/app';
import { IProwlarrService } from '../src/services/prowlarr';
import { IMetadataService } from '../src/services/metadata';

describe('UpNextService active-episodic suppression', () => {
  let watcherApp: FastifyInstance;
  let watcherUrl: string;
  const SERVICE_KEY = 'test-key-upnext';

  const mockProwlarr: IProwlarrService = {
    isConfigured: () => true,
    testConnection: async () => ({ isReachable: true }),
    searchReleases: async () => ({
      isReachable: true,
      candidates: [
        {
          guid: 'candidate-1',
          indexer: 'TestIndexer',
          title: 'Special Ops Lioness S01E02 1080p WEB-DL x265',
          sizeBytes: 1000000000,
          downloadUrl: 'magnet:?xt=urn:btih:lioness2',
          seeders: 25,
          score: 120,
          resolution: '1080p',
          source: 'web',
          isLowHealth: false,
          detectedMediaType: 'tv_show',
        },
      ],
    }),
    searchLatestByCategory: async () => [],
  };

  const mockMetadata: IMetadataService = {
    searchTMDB: async () => [],
    searchAniList: async () => [],
  };

  beforeEach(async () => {
    watcherApp = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: SERVICE_KEY });
    await watcherApp.listen({ port: 0, host: '127.0.0.1' });
    const port = (watcherApp.server.address() as any).port;
    watcherUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await watcherApp?.close();
  });

  it('suppresses series from Up Next when active episodic waitlist entry exists', async () => {
    const { db, sqlite } = initDatabase(':memory:');

    // 0. Seed user
    db.insert(users).values({
      id: 'user-123',
      username: 'testuser',
      jellyfinUserId: 'jf-123',
      createdAt: new Date().toISOString(),
    }).run();

    // 1. Seed a past download request for Lioness S01E01
    db.insert(downloadRequests).values({
      id: 'req-1',
      userId: 'user-123',
      magnetLink: 'magnet:?xt=urn:btih:lioness1',
      mediaType: 'tv_show',
      status: 'seeding',
      metadataId: 'lioness-tmdb-1',
      metadataSource: 'tmdb',
      title: 'Special Ops: Lioness',
      seasonNumber: 1,
      episodeNumber: 1,
      requestedAt: new Date().toISOString(),
    }).run();

    // 2. UpNextService WITHOUT waitlist entry -> series is returned
    const upNextWithoutWaitlist = new UpNextService({
      db,
      prowlarr: mockProwlarr,
      metadata: mockMetadata,
      watcherUrl,
      serviceApiKey: SERVICE_KEY,
    });

    const res1 = await upNextWithoutWaitlist.getUpNext('user-123');
    expect(res1.items.length).toBe(1);
    expect(res1.items[0].showTitle).toBe('Special Ops: Lioness');

    // 3. Add active episodic waitlist entry on watcher for user-123
    await watcherApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': SERVICE_KEY,
        'x-user-id': 'user-123',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: 'lioness-tmdb-1',
        metadataSource: 'tmdb',
        title: 'Special Ops: Lioness',
        seasonNumber: 1,
      },
    });

    // 4. Clear cache and run UpNextService WITH waitlist entry -> series is suppressed
    upNextWithoutWaitlist.clearCache();
    const res2 = await upNextWithoutWaitlist.getUpNext('user-123');
    expect(res2.items.length).toBe(0);

    sqlite.close();
  });

  it('suppresses series from Up Next when waitlist entry is pending_release', async () => {
    const { db, sqlite } = initDatabase(':memory:');

    db.insert(users).values({
      id: 'user-456',
      username: 'testuser2',
      jellyfinUserId: 'jf-456',
      createdAt: new Date().toISOString(),
    }).run();

    db.insert(downloadRequests).values({
      id: 'req-lioness-6',
      userId: 'user-456',
      magnetLink: 'magnet:?xt=urn:btih:lioness6',
      mediaType: 'tv_show',
      status: 'seeding',
      metadataId: '113962',
      metadataSource: 'tmdb',
      title: 'Lioness',
      seasonNumber: 3,
      episodeNumber: 6,
      requestedAt: new Date().toISOString(),
    }).run();

    // Add entry with status: 'pending_release'
    await watcherApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': SERVICE_KEY,
        'x-user-id': 'user-456',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '113962',
        metadataSource: 'tmdb',
        title: 'Lioness',
        seasonNumber: 3,
        targetEpisode: 7,
        status: 'pending_release',
        tmdbReleaseDate: '2026-09-13',
      },
    });

    const upNext = new UpNextService({
      db,
      prowlarr: mockProwlarr,
      metadata: mockMetadata,
      watcherUrl,
      serviceApiKey: SERVICE_KEY,
    });

    const res = await upNext.getUpNext('user-456');
    expect(res.items.length).toBe(0);

    sqlite.close();
  });

  it('degrades gracefully when watcher is unreachable', async () => {
    const { db, sqlite } = initDatabase(':memory:');

    db.insert(users).values({
      id: 'user-123',
      username: 'testuser',
      jellyfinUserId: 'jf-123',
      createdAt: new Date().toISOString(),
    }).run();

    db.insert(downloadRequests).values({
      id: 'req-2',
      userId: 'user-123',
      magnetLink: 'magnet:?xt=urn:btih:lioness1',
      mediaType: 'tv_show',
      status: 'seeding',
      metadataId: 'lioness-tmdb-1',
      metadataSource: 'tmdb',
      title: 'Special Ops: Lioness',
      seasonNumber: 1,
      episodeNumber: 1,
      requestedAt: new Date().toISOString(),
    }).run();

    const warnMock = vi.fn();
    const upNextBrokenWatcher = new UpNextService({
      db,
      prowlarr: mockProwlarr,
      metadata: mockMetadata,
      watcherUrl: 'http://127.0.0.1:59999', // nothing listening
      serviceApiKey: SERVICE_KEY,
      logger: { warn: warnMock },
    });

    const res = await upNextBrokenWatcher.getUpNext('user-123');
    expect(res.items.length).toBe(1);
    expect(warnMock).toHaveBeenCalled();

    sqlite.close();
  });
});