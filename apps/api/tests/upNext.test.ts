import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { UpNextService } from '../src/services/upNext';
import { IProwlarrService, ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult } from '../src/services/prowlarr';
import { IMetadataService, MetadataCandidate } from '../src/services/metadata';
import { IJellyfinService } from '../src/services/jellyfin';
import { downloadRequests, users } from '../src/db/schema';
import { initDatabase, AppDatabase } from '../src/db';

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
  lastSearchOptions: SearchReleasesOptions | null = null;
  candidatesToReturn: ReleaseCandidate[] = [];

  isConfigured(): boolean {
    return this.configured;
  }
  async checkHealth(): Promise<boolean> {
    return this.reachable;
  }
  parseReleaseTitle() {
    return { resolution: '1080p' as const, codec: 'x264' as const, source: 'web' as const };
  }
  scoreRelease(candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>) {
    return { score: 100, isLowHealth: candidate.seeders < 5 };
  }
  async searchMovieReleases(): Promise<SearchReleasesResult> {
    return { recommended: null, candidates: [], totalFound: 0, isConfigured: true, isReachable: true, hasHealthyReleases: false };
  }
  async searchReleases(options: SearchReleasesOptions): Promise<SearchReleasesResult> {
    this.lastSearchOptions = options;
    if (!this.reachable) {
      return {
        recommended: null,
        candidates: [],
        totalFound: 0,
        isConfigured: true,
        isReachable: false,
        hasHealthyReleases: false,
        error: 'Prowlarr offline',
      };
    }
    const healthy = this.candidatesToReturn.find((c) => c.seeders >= 5 && c.score > 0) || null;
    return {
      recommended: healthy,
      candidates: [...this.candidatesToReturn],
      totalFound: this.candidatesToReturn.length,
      isConfigured: true,
      isReachable: true,
      hasHealthyReleases: Boolean(healthy),
    };
  }
  async searchLatestByCategory(): Promise<{ candidates: ReleaseCandidate[]; isReachable: boolean; error?: string }> {
    return { candidates: [], isReachable: true };
  }
}

class MockMetadataService implements IMetadataService {
  extractTitleFromMagnet(magnetLink: string): string {
    return magnetLink;
  }
  async searchTMDB(query: string): Promise<MetadataCandidate[]> {
    return [
      {
        id: 'tmdb-99',
        source: 'tmdb',
        title: query,
        year: 2024,
        posterUrl: 'https://image.tmdb.org/t/p/w500/show.jpg',
        overview: 'TV Show overview for ' + query,
        rating: 8.7,
      },
    ];
  }
  async searchAniList(query: string): Promise<MetadataCandidate[]> {
    return [
      {
        id: 'ani-88',
        source: 'anilist',
        title: query,
        year: 2024,
        posterUrl: 'https://anilist.co/cover_anime.jpg',
        overview: 'Anime overview for ' + query,
        rating: 9.1,
      },
    ];
  }
}

describe('UpNextService - Unit Tests', () => {
  let db: AppDatabase;
  let prowlarr: MockProwlarrService;
  let metadata: MockMetadataService;
  let service: UpNextService;
  const testUserId = 'user-1';

  beforeEach(() => {
    const dbInit = initDatabase(':memory:', true);
    db = dbInit.db;

    // Seed test user
    db.insert(users).values({
      id: testUserId,
      username: 'testuser',
      role: 'user',
      jellyfinUserId: 'jf_test_user',
      createdAt: new Date().toISOString(),
    }).run();

    prowlarr = new MockProwlarrService();
    metadata = new MockMetadataService();
    service = new UpNextService({
      db,
      prowlarr,
      metadata,
      ttlMs: 60 * 1000,
    });
  });

  it('computes E(max + 1) for episodic show and queries Prowlarr', async () => {
    // Insert download request for Episode 10
    db.insert(downloadRequests).values({
      id: 'req-1',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:1',
      mediaType: 'anime',
      status: 'done',
      metadataId: '127549',
      metadataSource: 'anilist',
      title: 'Mushoku Tensei',
      seasonNumber: 1,
      episodeNumber: 10,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'mt-11',
        title: '[SubsPlease] Mushoku Tensei - 11 (1080p)',
        sizeBytes: 1400000000,
        formattedSize: '1.4 GB',
        seeders: 35,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:mt11',
        indexer: 'Nyaa',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 130,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(testUserId);
    expect(result.available).toBe(true);
    expect(result.items).toHaveLength(1);

    const item = result.items[0];
    expect(item.showTitle).toBe('Mushoku Tensei');
    expect(item.seasonNumber).toBe(1);
    expect(item.episodeNumber).toBe(11);
    expect(item.seeders).toBe(35);
    expect(item.posterUrl).toBe('https://anilist.co/cover_anime.jpg');

    // Verify Prowlarr queried with episode 11
    expect(prowlarr.lastSearchOptions).toMatchObject({
      mediaType: 'anime',
      seasonNumber: 1,
      episodeNumber: 11,
    });
  });

  it('targets next season pack when previous season was a full pack (episodeNumber is null)', async () => {
    db.insert(downloadRequests).values({
      id: 'req-pack',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:pack',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '95396',
      metadataSource: 'tmdb',
      title: 'Severance',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'sev-s2',
        title: 'Severance.S02.1080p.WEB-DL',
        sizeBytes: 15000000000,
        formattedSize: '15 GB',
        seeders: 50,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:sevs2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 140,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(testUserId);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].seasonNumber).toBe(2);
    expect(result.items[0].episodeNumber).toBeNull();

    expect(prowlarr.lastSearchOptions).toMatchObject({
      mediaType: 'tv_show',
      seasonNumber: 2,
      episodeNumber: null,
    });
  });

  it('ignores requests older than 90 days', async () => {
    const oldDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString();
    db.insert(downloadRequests).values({
      id: 'req-old',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:old',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '100',
      metadataSource: 'tmdb',
      title: 'Old Show',
      seasonNumber: 1,
      episodeNumber: 5,
      requestedAt: oldDate,
    }).run();

    const result = await service.getUpNext(testUserId);
    expect(result.items).toHaveLength(0);
    expect(prowlarr.lastSearchOptions).toBeNull();
  });

  it('ignores requests with status deleted', async () => {
    db.insert(downloadRequests).values({
      id: 'req-deleted',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:del',
      mediaType: 'tv_show',
      status: 'deleted',
      metadataId: '101',
      metadataSource: 'tmdb',
      title: 'Deleted Show',
      seasonNumber: 1,
      episodeNumber: 3,
      requestedAt: new Date().toISOString(),
    }).run();

    const result = await service.getUpNext(testUserId);
    expect(result.items).toHaveLength(0);
  });

  it('strictly filters candidate releases with seeders < 10 or score <= 0 or CAM', async () => {
    db.insert(downloadRequests).values({
      id: 'req-filter',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:filter',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '102',
      metadataSource: 'tmdb',
      title: 'Active Show',
      seasonNumber: 1,
      episodeNumber: 1,
      requestedAt: new Date().toISOString(),
    }).run();

    // Candidates have < 10 seeders or CAM
    prowlarr.candidatesToReturn = [
      {
        guid: 'c-low',
        title: 'Active.Show.S01E02.1080p',
        sizeBytes: 1000000000,
        formattedSize: '1 GB',
        seeders: 8,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:c_low',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 100,
        isLowHealth: false,
      },
      {
        guid: 'c-cam',
        title: 'Active.Show.S01E02.CAMRip',
        sizeBytes: 800000000,
        formattedSize: '800 MB',
        seeders: 30,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:c_cam',
        indexer: 'Tracker',
        resolution: 'unknown',
        codec: 'xvid',
        source: 'cam',
        score: 50,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(testUserId);
    // Neither candidate qualifies
    expect(result.items).toHaveLength(0);
  });

  it('returns exactly one recommended candidate per show', async () => {
    db.insert(downloadRequests).values({
      id: 'req-show',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:show',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '103',
      metadataSource: 'tmdb',
      title: 'Single Candidate Show',
      seasonNumber: 1,
      episodeNumber: 2,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'c-720',
        title: 'Single.Candidate.Show.S01E03.720p',
        sizeBytes: 800000000,
        formattedSize: '800 MB',
        seeders: 20,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:720',
        indexer: 'Tracker',
        resolution: '720p',
        codec: 'x264',
        source: 'web',
        score: 80,
        isLowHealth: false,
      },
      {
        guid: 'c-1080',
        title: 'Single.Candidate.Show.S01E03.1080p',
        sizeBytes: 1500000000,
        formattedSize: '1.5 GB',
        seeders: 45,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:1080',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 130,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(testUserId);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('c-1080');
  });

  it('returns available: false when Prowlarr is unconfigured or offline', async () => {
    prowlarr.configured = false;
    const unconf = await service.getUpNext(testUserId);
    expect(unconf.available).toBe(false);

    db.insert(downloadRequests).values({
      id: 'req-unreach',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:unreach',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '999',
      metadataSource: 'tmdb',
      title: 'Show',
      seasonNumber: 1,
      episodeNumber: 1,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.configured = true;
    prowlarr.reachable = false;
    service.clearCache();
    const unreach = await service.getUpNext(testUserId);
    expect(unreach.available).toBe(false);
  });
});

describe('GET /discovery/up-next - HTTP Integration', () => {
  let app: FastifyInstance;
  let prowlarr: MockProwlarrService;
  let metadata: MockMetadataService;
  let token: string;
  let loggedInUserId: string;

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

    // Login user
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'upnextuser', password: 'password123' },
    });
    token = loginRes.cookies[0].value;

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { token },
    });
    loggedInUserId = JSON.parse(meRes.body).user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/discovery/up-next',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 with Up Next items for authenticated user', async () => {
    // Insert request for logged in user
    app.db.insert(downloadRequests).values({
      id: 'req-http-1',
      userId: loggedInUserId,
      magnetLink: 'magnet:?xt=urn:btih:http1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '500',
      metadataSource: 'tmdb',
      title: 'Succession',
      seasonNumber: 1,
      episodeNumber: 5,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'succ-s01e06',
        title: 'Succession.S01E06.1080p.WEB',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 30,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:succ6',
        indexer: 'TorrentGalaxy',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 120,
        isLowHealth: false,
      },
    ];

    const res = await app.inject({
      method: 'GET',
      url: '/discovery/up-next',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.available).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].showTitle).toBe('Succession');
    expect(body.items[0].seasonNumber).toBe(1);
    expect(body.items[0].episodeNumber).toBe(6);
  });
});
