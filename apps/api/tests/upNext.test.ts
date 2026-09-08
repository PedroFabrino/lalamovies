import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { UpNextService, matchesTarget, groupShowRequests, normalizeShowTitle } from '../src/services/upNext';
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
  allSearchOptions: SearchReleasesOptions[] = [];
  candidatesToReturn: ReleaseCandidate[] = [];
  customSearchHandler?: (options: SearchReleasesOptions) => ReleaseCandidate[];

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
    this.allSearchOptions.push(options);
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
    const candidates = this.customSearchHandler
      ? this.customSearchHandler(options)
      : [...this.candidatesToReturn];
    const healthy = candidates.find((c) => c.seeders >= 5 && c.score > 0) || null;
    return {
      recommended: healthy,
      candidates,
      totalFound: candidates.length,
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

  it('isolates up-next recommendations strictly per user', async () => {
    const otherUserId = 'user-2';
    db.insert(users).values({
      id: otherUserId,
      username: 'alexandre',
      role: 'user',
      jellyfinUserId: 'jf_alexandre',
      createdAt: new Date().toISOString(),
    }).run();

    // Alexandre requested Severance S01
    db.insert(downloadRequests).values({
      id: 'req-alexandre',
      userId: otherUserId,
      magnetLink: 'magnet:?xt=urn:btih:sev',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '95396',
      metadataSource: 'tmdb',
      title: 'Severance',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Fabrino requested nothing
    const fabrinoResult = await service.getUpNext(testUserId);
    expect(fabrinoResult.available).toBe(true);
    expect(fabrinoResult.items).toHaveLength(0);

    // Alexandre gets Severance
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
    const alexandreResult = await service.getUpNext(otherUserId);
    expect(alexandreResult.items).toHaveLength(1);
    expect(alexandreResult.items[0].showTitle).toBe('Severance');
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

  it('rejects releases matching wrong season when Prowlarr returns season 1 for season 2 query', async () => {
    // Hell Mode had Season 1 pack downloaded
    db.insert(downloadRequests).values({
      id: 'req-hellmode',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:hm1',
      mediaType: 'anime',
      status: 'done',
      metadataId: 'hell-1',
      metadataSource: 'anilist',
      title: 'Hell Mode',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Prowlarr returns Season 1 releases for both S02 pack and S02E01 queries
    prowlarr.candidatesToReturn = [
      {
        guid: 'hm-s1-pack',
        title: '[SubsPlease] Hell Mode S01 (1080p)',
        sizeBytes: 8000000000,
        formattedSize: '8 GB',
        seeders: 40,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:hm_s1',
        indexer: 'Nyaa',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 120,
        isLowHealth: false,
      },
      {
        guid: 'hm-s1-ep1',
        title: '[SubsPlease] Hell Mode S01E01 (1080p)',
        sizeBytes: 1200000000,
        formattedSize: '1.2 GB',
        seeders: 50,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:hm_s1e1',
        indexer: 'Nyaa',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 110,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(testUserId);
    expect(result.available).toBe(true);
    // S01 releases should be rejected because targetSeason is 2
    expect(result.items).toHaveLength(0);
  });

  it('rejects individual episode releases when targeting a full season pack', async () => {
    db.insert(downloadRequests).values({
      id: 'req-lioness-s2',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:lioness2',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '232553',
      metadataSource: 'tmdb',
      title: 'Lioness',
      seasonNumber: 2,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Prowlarr indexer returns an episode (S03E06) when queried for S03
    prowlarr.candidatesToReturn = [
      {
        guid: 'lioness-s3-e6',
        title: 'Lioness S03E06 1080p WEB H264-EDITH',
        sizeBytes: 1800000000,
        formattedSize: '1.8 GB',
        seeders: 30,
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:l3e6',
        indexer: 'LimeTorrents',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 120,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(testUserId);
    expect(result.available).toBe(true);
    // S03E06 should be rejected for both S03 pack (has episode number) and S03E01 fallback (episode 6 != 1)
    expect(result.items).toHaveLength(0);
  });

  it('falls back to S(max+1)E01 when full season pack is unavailable for next season', async () => {
    db.insert(downloadRequests).values({
      id: 'req-show-pack',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:s1pack',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-1',
      metadataSource: 'tmdb',
      title: 'Weekly Drama',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.customSearchHandler = (options) => {
      // If queried for Season 2 pack (episodeNumber is null), return no candidates
      if (options.seasonNumber === 2 && options.episodeNumber === null) {
        return [];
      }
      // If queried for Season 2 Episode 1, return episode candidate
      if (options.seasonNumber === 2 && options.episodeNumber === 1) {
        return [
          {
            guid: 'wd-s2-e1',
            title: 'Weekly.Drama.S02E01.1080p.WEB',
            sizeBytes: 1500000000,
            formattedSize: '1.5 GB',
            seeders: 35,
            leechers: 2,
            downloadUrl: 'magnet:?xt=urn:btih:wds2e1',
            indexer: 'Tracker',
            resolution: '1080p',
            codec: 'x264',
            source: 'web',
            score: 130,
            isLowHealth: false,
          },
        ];
      }
      return [];
    };

    const result = await service.getUpNext(testUserId);
    expect(result.available).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].seasonNumber).toBe(2);
    expect(result.items[0].episodeNumber).toBe(1);
    expect(result.items[0].releaseTitle).toBe('Weekly.Drama.S02E01.1080p.WEB');
  });

  it('deduplicates requests for the same show across different metadata IDs and supersedes individual episodes with season pack', async () => {
    // Like in the reported Lioness bug:
    // Request 1: Season 2 pack under TMDB 232553
    db.insert(downloadRequests).values({
      id: 'req-lioness-pack',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:lpack',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '232553',
      metadataSource: 'tmdb',
      title: 'Lioness',
      seasonNumber: 2,
      episodeNumber: null,
      requestedAt: new Date(Date.now() - 5000).toISOString(),
    }).run();

    // Request 2: Season 2 Episode 1 under TMDB 113962
    db.insert(downloadRequests).values({
      id: 'req-lioness-ep1',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:lep1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '113962',
      metadataSource: 'tmdb',
      title: 'Lioness',
      seasonNumber: 2,
      episodeNumber: 1,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.customSearchHandler = (options) => {
      // If queried for Season 3 pack, return a valid S03 pack candidate
      if (options.seasonNumber === 3 && options.episodeNumber === null) {
        return [
          {
            guid: 'lioness-s3-pack',
            title: 'Lioness.S03.1080p.WEB-DL',
            sizeBytes: 15000000000,
            formattedSize: '15 GB',
            seeders: 45,
            leechers: 3,
            downloadUrl: 'magnet:?xt=urn:btih:l3pack',
            indexer: 'Tracker',
            resolution: '1080p',
            codec: 'x264',
            source: 'web',
            score: 140,
            isLowHealth: false,
          },
        ];
      }
      return [];
    };

    const result = await service.getUpNext(testUserId);
    expect(result.available).toBe(true);
    // Crucial: Must only return ONE item for Lioness, targeting Season 3!
    // It must NOT recommend S02E02 because Season 2 pack was downloaded.
    expect(result.items).toHaveLength(1);
    expect(result.items[0].showTitle).toBe('Lioness');
    expect(result.items[0].seasonNumber).toBe(3);
    expect(result.items[0].episodeNumber).toBeNull();
  });
});

describe('UpNext Semantic Matching & Grouping Helpers', () => {
  it('matchesTarget correctly validates season packs', () => {
    expect(matchesTarget('Severance.S02.1080p.WEB-DL', 2, null)).toBe(true);
    expect(matchesTarget('Severance Season 2 Complete', 2, null)).toBe(true);
    expect(matchesTarget('Hell.Mode.S01.1080p', 2, null)).toBe(false); // wrong season
    expect(matchesTarget('Lioness.S03E06.1080p', 3, null)).toBe(false); // is episode, not pack
    expect(matchesTarget('Movie.Title.2024.1080p', 2, null)).toBe(false); // no season
  });

  it('matchesTarget correctly validates individual episodes', () => {
    expect(matchesTarget('Succession.S01E06.1080p.WEB', 1, 6)).toBe(true);
    expect(matchesTarget('Succession.S01E06.1080p.WEB', 1, 5)).toBe(false); // wrong episode
    expect(matchesTarget('Succession.S02E06.1080p.WEB', 1, 6)).toBe(false); // wrong season
    expect(matchesTarget('[SubsPlease] Mushoku Tensei - 11 (1080p)', 1, 11)).toBe(true);
    expect(matchesTarget('[SubsPlease] Mushoku Tensei - 11 (1080p)', 1, 10)).toBe(false);
    expect(matchesTarget('[SubsPlease] Mushoku Tensei - 01 (1080p)', 2, 1)).toBe(false); // unindicated season defaults to S1
  });

  it('groupShowRequests merges requests by normalized title and metadata ID', () => {
    const requests = [
      {
        id: '1',
        userId: 'u1',
        magnetLink: 'm1',
        title: 'Lioness',
        mediaType: 'tv_show',
        status: 'done',
        metadataId: '232553',
        metadataSource: 'tmdb',
        seasonNumber: 1,
        episodeNumber: null,
        requestedAt: '2026-01-01',
      },
      {
        id: '2',
        userId: 'u1',
        magnetLink: 'm2',
        title: 'Lioness',
        mediaType: 'tv_show',
        status: 'done',
        metadataId: '113962',
        metadataSource: 'tmdb',
        seasonNumber: 2,
        episodeNumber: 1,
        requestedAt: '2026-01-02',
      },
      {
        id: '3',
        userId: 'u1',
        magnetLink: 'm3',
        title: 'Severance',
        mediaType: 'tv_show',
        status: 'done',
        metadataId: '95396',
        metadataSource: 'tmdb',
        seasonNumber: 1,
        episodeNumber: null,
        requestedAt: '2026-01-03',
      },
    ] as any;

    const groups = groupShowRequests(requests);
    // Should produce 2 groups: Lioness (merged 1 and 2) and Severance (3)
    expect(groups).toHaveLength(2);
    const lionessGroup = groups.find((g) => g.some((r) => r.id === '1'));
    expect(lionessGroup).toHaveLength(2);
    expect(lionessGroup?.map((r) => r.id).sort()).toEqual(['1', '2']);
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
