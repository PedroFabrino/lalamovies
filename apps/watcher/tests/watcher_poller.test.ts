import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initWatcherDatabase } from '../src/db';
import { watchRequests } from '../src/db/schema';
import { WatcherProwlarrService } from '../src/services/prowlarr';
import { WatcherPoller } from '../src/jobs/watcherPoller';
import { eq } from 'drizzle-orm';

describe('WatcherPoller & Quality Gate (Ticket 04)', () => {
  it('ignores non-checking entries and only polls checking entries', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
    const searchSpy = vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([]);

    const now = new Date().toISOString();
    db.insert(watchRequests).values([
      {
        id: 'entry-pending',
        userId: 'u1',
        mediaType: 'movie',
        metadataId: '1',
        metadataSource: 'tmdb',
        title: 'Pending Movie',
        status: 'pending_release',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'entry-notified',
        userId: 'u1',
        mediaType: 'movie',
        metadataId: '2',
        metadataSource: 'tmdb',
        title: 'Already Notified Movie',
        status: 'notified',
        createdAt: now,
        updatedAt: now,
      },
    ]).run();

    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
    });

    const result = await poller.pollOnce();
    expect(result.polled).toBe(0);
    expect(result.notified).toBe(0);
    expect(searchSpy).not.toHaveBeenCalled();

    sqlite.close();
  });

  it('rejects releases below quality gate (score < 100, seeders < 10, or CAM) and leaves entry checking', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });

    // Returns candidates that fail quality gate
    vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([
      {
        guid: 'c1',
        title: 'Low Score 720p',
        sizeBytes: 1000000000,
        formattedSize: '1 GB',
        seeders: 20,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:lowscore',
        indexer: 'Tracker',
        resolution: '720p',
        codec: 'x264',
        source: 'web',
        score: 70, // < 100
        isLowHealth: false,
      },
      {
        guid: 'c2',
        title: 'Low Seeders 1080p',
        sizeBytes: 3000000000,
        formattedSize: '3 GB',
        seeders: 4, // < 10
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:lowseeders',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x265',
        source: 'bluray',
        score: 125,
        isLowHealth: true,
      },
      {
        guid: 'c3',
        title: 'CAMRip Bad Movie 1080p',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 50,
        leechers: 10,
        downloadUrl: 'magnet:?xt=urn:btih:cam',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'cam', // CAM
        score: -50,
        isLowHealth: false,
      },
      {
        guid: 'c4',
        title: 'Movie Title 1080p HDTS TELESYNC',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 50,
        leechers: 10,
        downloadUrl: 'magnet:?xt=urn:btih:telesync',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 130, // Score could be high but title contains TELESYNC (CAM_REGEX)
        isLowHealth: false,
      },
    ]);

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-1',
      userId: 'u1',
      mediaType: 'movie',
      metadataId: 'm1',
      metadataSource: 'tmdb',
      title: 'Dune 3',
      status: 'checking',
      createdAt: now,
      updatedAt: now,
    }).run();

    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
    });

    const result = await poller.pollOnce();
    expect(result.polled).toBe(1);
    expect(result.notified).toBe(0);

    const entry = db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-1')).get();
    expect(entry?.status).toBe('checking');
    expect(entry?.prowlarrReleaseMagnet).toBeNull();

    sqlite.close();
  });

  it('selects highest-scoring qualifying release (score >= 100, seeders >= 10) and transitions entry to notified', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });

    vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([
      {
        guid: 'good-1',
        title: 'Dune Part Three 2026 1080p WEB-DL x264',
        sizeBytes: 4000000000,
        formattedSize: '4 GB',
        seeders: 15,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:dune-1080p-web',
        indexer: 'TrackerA',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 135,
        isLowHealth: false,
      },
      {
        guid: 'best-1',
        title: 'Dune Part Three 2026 1080p BluRay x265',
        sizeBytes: 5000000000,
        formattedSize: '5 GB',
        seeders: 45,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:dune-1080p-bluray-best',
        indexer: 'TrackerB',
        resolution: '1080p',
        codec: 'x265',
        source: 'bluray',
        score: 175,
        isLowHealth: false,
      },
    ]);

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-win',
      userId: 'u1',
      mediaType: 'movie',
      metadataId: 'm100',
      metadataSource: 'tmdb',
      title: 'Dune Part Three',
      year: 2026,
      status: 'checking',
      createdAt: now,
      updatedAt: now,
    }).run();

    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
    });

    const result = await poller.pollOnce();
    expect(result.polled).toBe(1);
    expect(result.notified).toBe(1);

    const updated = db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-win')).get();
    expect(updated?.status).toBe('notified');
    expect(updated?.prowlarrReleaseTitle).toBe('Dune Part Three 2026 1080p BluRay x265');
    expect(updated?.prowlarrReleaseMagnet).toBe('magnet:?xt=urn:btih:dune-1080p-bluray-best');
    expect(updated?.prowlarrReleaseScore).toBe(175);
    expect(updated?.notifyAt).toBeDefined();

    sqlite.close();
  });

  it('correctly constructs queries for movies and TV episodes in ProwlarrService', async () => {
    const prowlarr = new WatcherProwlarrService({
      prowlarrUrl: 'http://localhost:9696',
      apiKey: 'test-api-key',
    });

    const originalFetch = global.fetch;
    const requestedUrls: string[] = [];
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrls.push(url);
      return {
        ok: true,
        json: async () => [],
      } as any;
    });

    try {
      // 1. Movie search
      await prowlarr.searchForEntry({
        mediaType: 'movie',
        title: 'Gladiator 2',
        year: 2024,
      });
      expect(requestedUrls[0]).toContain('query=Gladiator%202%202024');
      expect(requestedUrls[0]).toContain('categories=2000');

      // 2. TV episodic search
      await prowlarr.searchForEntry({
        mediaType: 'tv_show',
        title: 'Special Ops: Lioness',
        seasonNumber: 1,
        targetEpisode: 6,
      });
      expect(requestedUrls[1]).toContain('query=Special%20Ops%3A%20Lioness%20S01E06');
      expect(requestedUrls[1]).toContain('categories=5000');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('guards against overlapping poll cycles', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });

    let resolveSearch: () => void;
    vi.spyOn(mockProwlarr, 'searchForEntry').mockImplementation(() => {
      return new Promise((res) => {
        resolveSearch = () => res([]);
      });
    });

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-overlap',
      userId: 'u1',
      mediaType: 'movie',
      metadataId: 'm1',
      metadataSource: 'tmdb',
      title: 'Overlap Test',
      status: 'checking',
      createdAt: now,
      updatedAt: now,
    }).run();

    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
    });

    // Start first poll (hangs awaiting resolveSearch)
    const p1 = poller.pollOnce();

    // Start second poll while first is still running
    const res2 = await poller.pollOnce();
    expect(res2.polled).toBe(0);
    expect(res2.notified).toBe(0);

    // Resolve first search
    resolveSearch!();
    const res1 = await p1;
    expect(res1.polled).toBe(1);

    sqlite.close();
  });
});