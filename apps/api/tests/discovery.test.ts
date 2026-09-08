import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { DiscoveryService, IDiscoveryService } from '../src/services/discovery';
import { IProwlarrService, ReleaseCandidate, SearchReleasesResult } from '../src/services/prowlarr';
import { IMetadataService, MetadataCandidate } from '../src/services/metadata';
import { IJellyfinService } from '../src/services/jellyfin';

class DummyJellyfinService implements IJellyfinService {
  async authenticateUser(username: string) {
    return { accessToken: 'token', userId: 'uid', username, isAdmin: true };
  }
  async createUser() {
    return 'new_uid';
  }
  async deleteUser() {}
}

class MockProwlarrService implements IProwlarrService {
  configured = true;
  reachable = true;
  candidates: ReleaseCandidate[] = [];
  lastCategoriesSearched: number[] = [];

  isConfigured(): boolean {
    return this.configured;
  }
  async checkHealth(): Promise<boolean> {
    return this.reachable;
  }
  parseReleaseTitle(title: string) {
    return { resolution: '1080p' as const, codec: 'x264' as const, source: 'web' as const };
  }
  scoreRelease(candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>) {
    return { score: 100, isLowHealth: candidate.seeders < 5 };
  }
  async searchMovieReleases(): Promise<SearchReleasesResult> {
    return { recommended: null, candidates: [], totalFound: 0, isConfigured: true, isReachable: true, hasHealthyReleases: false };
  }
  async searchReleases(): Promise<SearchReleasesResult> {
    return { recommended: null, candidates: [], totalFound: 0, isConfigured: true, isReachable: true, hasHealthyReleases: false };
  }
  async searchLatestByCategory(categories: number[]): Promise<{ candidates: ReleaseCandidate[]; isReachable: boolean; error?: string }> {
    this.lastCategoriesSearched = categories;
    if (!this.reachable) {
      return { candidates: [], isReachable: false, error: 'Prowlarr offline' };
    }
    return { candidates: [...this.candidates], isReachable: true };
  }
}

class MockMetadataService implements IMetadataService {
  extractTitleFromMagnet(magnetLink: string): string {
    return magnetLink;
  }
  async searchTMDB(query: string, mediaType: 'movie' | 'tv_show'): Promise<MetadataCandidate[]> {
    return [
      {
        id: 'tmdb-123',
        source: 'tmdb',
        title: query,
        year: 2024,
        posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        overview: 'Overview for ' + query,
        rating: 8.5,
      },
    ];
  }
  async searchAniList(query: string): Promise<MetadataCandidate[]> {
    return [
      {
        id: 'ani-456',
        source: 'anilist',
        title: query,
        year: 2024,
        posterUrl: 'https://anilist.co/cover.jpg',
        overview: 'Anime overview',
        rating: 8.8,
      },
    ];
  }
}

describe('DiscoveryService - Unit Tests', () => {
  let prowlarr: MockProwlarrService;
  let metadata: MockMetadataService;
  let service: DiscoveryService;

  beforeEach(() => {
    prowlarr = new MockProwlarrService();
    metadata = new MockMetadataService();
    service = new DiscoveryService({
      prowlarr,
      metadata,
      ttlMs: 60 * 60 * 1000,
    });
  });

  it('filters out releases with seeders < 10', async () => {
    prowlarr.candidates = [
      {
        guid: 'g1',
        title: 'Movie A 2024 1080p',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 9,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:1',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 120,
        isLowHealth: false,
      },
      {
        guid: 'g2',
        title: 'Movie B 2024 1080p',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 10,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 120,
        isLowHealth: false,
      },
    ];

    const result = await service.getFeed('movies');
    expect(result.available).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('g2');
  });

  it('filters out releases with score <= 0', async () => {
    prowlarr.candidates = [
      {
        guid: 'g1',
        title: 'Movie A 2024 1080p',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 50,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:1',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 0,
        isLowHealth: false,
      },
      {
        guid: 'g2',
        title: 'Movie B 2024 1080p',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 50,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 110,
        isLowHealth: false,
      },
    ];

    const result = await service.getFeed('movies');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('g2');
  });

  it('strictly filters out CAM, Telesync, and Workprint releases by regex or source', async () => {
    prowlarr.candidates = [
      {
        guid: 'c1',
        title: 'Gladiator.II.2024.CAM.XviD-CAM',
        sizeBytes: 1500000000,
        formattedSize: '1.5 GB',
        seeders: 40,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:c1',
        indexer: 'Tracker',
        resolution: 'unknown',
        codec: 'xvid',
        source: 'cam',
        score: 50,
        isLowHealth: false,
      },
      {
        guid: 'c2',
        title: 'Deadpool.2024.TELESYNC.1080p',
        sizeBytes: 1500000000,
        formattedSize: '1.5 GB',
        seeders: 40,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:c2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 50,
        isLowHealth: false,
      },
      {
        guid: 'c3',
        title: 'Wicked.2024.HDCAM.x264',
        sizeBytes: 1500000000,
        formattedSize: '1.5 GB',
        seeders: 40,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:c3',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 50,
        isLowHealth: false,
      },
      {
        guid: 'c4',
        title: 'Secret.Project.WORKPRINT.x264',
        sizeBytes: 1500000000,
        formattedSize: '1.5 GB',
        seeders: 40,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:c4',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 50,
        isLowHealth: false,
      },
      {
        guid: 'good1',
        title: 'Gladiator.II.2024.1080p.WEB-DL.x264',
        sizeBytes: 2500000000,
        formattedSize: '2.5 GB',
        seeders: 40,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:good1',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 120,
        isLowHealth: false,
      },
    ];

    const result = await service.getFeed('movies');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('good1');
  });

  it('deduplicates identical media keeping the highest-scoring release', async () => {
    prowlarr.candidates = [
      {
        guid: 'dune-720p',
        title: 'Dune.Part.Two.2024.720p.WEB-DL',
        sizeBytes: 1500000000,
        formattedSize: '1.5 GB',
        seeders: 20,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:dune720',
        indexer: 'Tracker A',
        resolution: '720p',
        codec: 'x264',
        source: 'web',
        score: 80,
        isLowHealth: false,
      },
      {
        guid: 'dune-1080p',
        title: 'Dune.Part.Two.2024.1080p.WEB-DL',
        sizeBytes: 3000000000,
        formattedSize: '3 GB',
        seeders: 30,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:dune1080',
        indexer: 'Tracker B',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 130,
        isLowHealth: false,
      },
    ];

    const result = await service.getFeed('movies');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('dune-1080p');
    expect(result.items[0].resolution).toBe('1080p');
  });

  it('maps categories correctly to Prowlarr Torznab categories', async () => {
    prowlarr.candidates = [
      {
        guid: 'm1',
        title: 'Movie Title 2024',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 15,
        leechers: 0,
        downloadUrl: 'magnet:?xt=urn:btih:m1',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 100,
        isLowHealth: false,
      },
    ];

    await service.getFeed('movies');
    expect(prowlarr.lastCategoriesSearched).toEqual([2000]);

    service.clearCache();
    await service.getFeed('tv');
    expect(prowlarr.lastCategoriesSearched).toEqual([5000]);

    service.clearCache();
    await service.getFeed('anime');
    expect(prowlarr.lastCategoriesSearched).toEqual([5070, 2070]);
  });

  it('caches results for 60 minutes and does not re-query Prowlarr', async () => {
    const searchSpy = vi.spyOn(prowlarr, 'searchLatestByCategory');
    prowlarr.candidates = [
      {
        guid: 'm1',
        title: 'Cached Movie 2024',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 15,
        leechers: 0,
        downloadUrl: 'magnet:?xt=urn:btih:m1',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 100,
        isLowHealth: false,
      },
    ];

    const res1 = await service.getFeed('movies');
    expect(res1.items).toHaveLength(1);
    expect(searchSpy).toHaveBeenCalledTimes(1);

    // Immediate second call should hit cache
    const res2 = await service.getFeed('movies');
    expect(res2.items).toHaveLength(1);
    expect(searchSpy).toHaveBeenCalledTimes(1);
  });

  it('deduplicates in-flight concurrent requests with mutex/promise', async () => {
    const searchSpy = vi.spyOn(prowlarr, 'searchLatestByCategory').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        candidates: [
          {
            guid: 'concurrent-1',
            title: 'Concurrent Movie 2024',
            sizeBytes: 2000000000,
            formattedSize: '2 GB',
            seeders: 20,
            leechers: 0,
            downloadUrl: 'magnet:?xt=urn:btih:c1',
            indexer: 'Tracker',
            resolution: '1080p',
            codec: 'x264',
            source: 'web',
            score: 100,
            isLowHealth: false,
          },
        ],
        isReachable: true,
      };
    });

    const [res1, res2] = await Promise.all([
      service.getFeed('movies'),
      service.getFeed('movies'),
    ]);

    expect(res1.items).toHaveLength(1);
    expect(res2.items).toHaveLength(1);
    expect(searchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns available: false when Prowlarr is unconfigured or offline', async () => {
    prowlarr.configured = false;
    const unconfiguredRes = await service.getFeed('movies');
    expect(unconfiguredRes.available).toBe(false);
    expect(unconfiguredRes.items).toEqual([]);

    prowlarr.configured = true;
    prowlarr.reachable = false;
    const unreachableRes = await service.getFeed('movies');
    expect(unreachableRes.available).toBe(false);
    expect(unreachableRes.items).toEqual([]);
  });

  it('enriches items with metadata and rating from TMDB or AniList', async () => {
    prowlarr.candidates = [
      {
        guid: 'anime-1',
        title: '[SubsPlease] Frieren - Beyond Journeys End - 28 (1080p)',
        sizeBytes: 1400000000,
        formattedSize: '1.4 GB',
        seeders: 55,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:ani1',
        indexer: 'Nyaa',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 120,
        isLowHealth: false,
      },
    ];

    const result = await service.getFeed('anime');
    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.posterUrl).toBe('https://anilist.co/cover.jpg');
    expect(item.rating).toBe(8.8);
    expect(item.metadataSource).toBe('anilist');
  });
});

describe('GET /discovery/feed - HTTP Integration', () => {
  let app: FastifyInstance;
  let prowlarr: MockProwlarrService;
  let metadata: MockMetadataService;
  let token: string;

  beforeEach(async () => {
    prowlarr = new MockProwlarrService();
    metadata = new MockMetadataService();
    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jellyfinService: new DummyJellyfinService(),
      prowlarrService: prowlarr,
      metadataService: metadata,
      startPoller: false,
      startCleanupCron: false,
    });

    await app.ready();

    // Generate auth via /auth/login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'testuser', password: 'password123' },
    });
    token = loginRes.cookies[0].value;
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/discovery/feed?category=movies',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 Bad Request when category is missing or invalid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/discovery/feed',
      cookies: { token },
    });
    expect(res.statusCode).toBe(400);

    const invalidRes = await app.inject({
      method: 'GET',
      url: '/discovery/feed?category=music',
      cookies: { token },
    });
    expect(invalidRes.statusCode).toBe(400);
  });

  it('returns 200 with feed items when category is valid', async () => {
    prowlarr.candidates = [
      {
        guid: 'feed-1',
        title: 'Alien.Romulus.2024.1080p.WEB-DL',
        sizeBytes: 2500000000,
        formattedSize: '2.5 GB',
        seeders: 25,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:alien',
        indexer: 'TorrentGalaxy',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 110,
        isLowHealth: false,
      },
    ];

    const res = await app.inject({
      method: 'GET',
      url: '/discovery/feed?category=movies',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.available).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('Alien Romulus');
    expect(body.items[0].posterUrl).toBeTruthy();
    expect(body.items[0].rating).toBe(8.5);
  });

  it('returns available: false gracefully when Prowlarr is offline', async () => {
    prowlarr.reachable = false;

    const res = await app.inject({
      method: 'GET',
      url: '/discovery/feed?category=movies',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.available).toBe(false);
    expect(body.items).toEqual([]);
  });
});
