import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { UpNextService, matchesTarget, groupShowRequests, normalizeShowTitle } from '../src/services/upNext';
import { IProwlarrService, ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult } from '../src/services/prowlarr';
import { IMetadataService, MetadataCandidate } from '../src/services/metadata';
import { IJellyfinService } from '../src/services/jellyfin';
import { downloadRequests, users, requestCoRequesters } from '../src/db/schema';
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

describe('UpNext Cross-User Suppression & Co-Requester Tests', () => {
  let db: AppDatabase;
  let prowlarr: MockProwlarrService;
  let metadata: MockMetadataService;
  let service: UpNextService;
  const aliceId = 'user-alice';
  const bobId = 'user-bob';

  beforeEach(() => {
    const dbInit = initDatabase(':memory:', true);
    db = dbInit.db;

    db.insert(users).values([
      {
        id: aliceId,
        username: 'alice',
        role: 'user',
        jellyfinUserId: 'jf_alice',
        createdAt: new Date().toISOString(),
      },
      {
        id: bobId,
        username: 'bob',
        role: 'user',
        jellyfinUserId: 'jf_bob',
        createdAt: new Date().toISOString(),
      },
    ]).run();

    prowlarr = new MockProwlarrService();
    metadata = new MockMetadataService();
    service = new UpNextService({
      db,
      prowlarr,
      metadata,
      ttlMs: 60 * 1000,
    });
  });

  it('cross-user season pack suppression: Bob requests S2 -> Alice does not get S2 in Up Next', async () => {
    // Alice requested S1 season pack
    db.insert(downloadRequests).values({
      id: 'req-alice-s1',
      userId: aliceId,
      magnetLink: 'magnet:?xt=urn:btih:alice1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-100',
      metadataSource: 'tmdb',
      title: 'Severance',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Bob requested S2 season pack
    db.insert(downloadRequests).values({
      id: 'req-bob-s2',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bob2',
      mediaType: 'tv_show',
      status: 'downloading',
      metadataId: 'show-100',
      metadataSource: 'tmdb',
      title: 'Severance',
      seasonNumber: 2,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'sev-s02',
        title: 'Severance.S02.1080p.WEB-DL',
        sizeBytes: 8000000000,
        formattedSize: '8 GB',
        seeders: 50,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:sev2',
        indexer: 'TorrentGalaxy',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 150,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(aliceId);
    expect(result.available).toBe(true);
    // S2 is already requested by Bob -> suppressed from Alice's Up Next
    expect(result.items).toHaveLength(0);
  });

  it('cross-user single episode suppression: Bob requests S1E2 -> Alice does not get S1E2', async () => {
    // Alice requested S1E1
    db.insert(downloadRequests).values({
      id: 'req-alice-e1',
      userId: aliceId,
      magnetLink: 'magnet:?xt=urn:btih:alice-e1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-200',
      metadataSource: 'tmdb',
      title: 'Succession',
      seasonNumber: 1,
      episodeNumber: 1,
      requestedAt: new Date().toISOString(),
    }).run();

    // Bob requested S1E2
    db.insert(downloadRequests).values({
      id: 'req-bob-e2',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bob-e2',
      mediaType: 'tv_show',
      status: 'downloading',
      metadataId: 'show-200',
      metadataSource: 'tmdb',
      title: 'Succession',
      seasonNumber: 1,
      episodeNumber: 2,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'succ-s01e02',
        title: 'Succession.S01E02.1080p.WEB',
        sizeBytes: 2000000000,
        formattedSize: '2 GB',
        seeders: 40,
        leechers: 2,
        downloadUrl: 'magnet:?xt=urn:btih:succ2',
        indexer: 'TorrentGalaxy',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 130,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(aliceId);
    expect(result.available).toBe(true);
    // S1E2 was requested by Bob -> suppressed for Alice
    expect(result.items).toHaveLength(0);
  });

  it('season pack asymmetry: Bob requests S2 season pack -> suppresses Alice candidate S2E1', async () => {
    // Alice requested S1 pack. S2 pack candidate not found, fallback to S2E1 candidate.
    db.insert(downloadRequests).values({
      id: 'req-alice-s1',
      userId: aliceId,
      magnetLink: 'magnet:?xt=urn:btih:alice-s1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-300',
      metadataSource: 'tmdb',
      title: 'The Bear',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Bob requested S2 season pack!
    db.insert(downloadRequests).values({
      id: 'req-bob-s2',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bob-s2',
      mediaType: 'tv_show',
      status: 'downloading',
      metadataId: 'show-300',
      metadataSource: 'tmdb',
      title: 'The Bear',
      seasonNumber: 2,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Prowlarr custom handler: returns nothing for S2 pack, but returns S2E1 for episode search
    prowlarr.customSearchHandler = (options) => {
      if (options.episodeNumber === 1) {
        return [
          {
            guid: 'bear-s02e01',
            title: 'The Bear S02E01 1080p',
            sizeBytes: 1500000000,
            formattedSize: '1.5 GB',
            seeders: 35,
            leechers: 1,
            downloadUrl: 'magnet:?xt=urn:btih:bear21',
            indexer: 'Tracker',
            resolution: '1080p',
            codec: 'x264',
            source: 'web',
            score: 120,
            isLowHealth: false,
          },
        ];
      }
      return [];
    };

    const result = await service.getUpNext(aliceId);
    expect(result.available).toBe(true);
    // Bob's S2 season pack covers S2E1 -> suppressed!
    expect(result.items).toHaveLength(0);
  });

  it('season pack asymmetry: Bob requests S2E1 -> does NOT suppress Alice S2 season pack candidate', async () => {
    // Alice requested S1 pack. Target is S2 pack.
    db.insert(downloadRequests).values({
      id: 'req-alice-s1',
      userId: aliceId,
      magnetLink: 'magnet:?xt=urn:btih:alice-s1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-400',
      metadataSource: 'tmdb',
      title: 'Fargo',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Bob only requested S2E1 (single episode)
    db.insert(downloadRequests).values({
      id: 'req-bob-s2e1',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bob-s2e1',
      mediaType: 'tv_show',
      status: 'downloading',
      metadataId: 'show-400',
      metadataSource: 'tmdb',
      title: 'Fargo',
      seasonNumber: 2,
      episodeNumber: 1,
      requestedAt: new Date().toISOString(),
    }).run();

    // Prowlarr has S2 season pack
    prowlarr.candidatesToReturn = [
      {
        guid: 'fargo-s02-pack',
        title: 'Fargo.S02.1080p.Complete',
        sizeBytes: 12000000000,
        formattedSize: '12 GB',
        seeders: 60,
        leechers: 3,
        downloadUrl: 'magnet:?xt=urn:btih:fargo2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 150,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(aliceId);
    expect(result.available).toBe(true);
    // Single episode does NOT suppress season pack -> surfaces!
    expect(result.items).toHaveLength(1);
    expect(result.items[0].showTitle).toBe('Fargo');
    expect(result.items[0].seasonNumber).toBe(2);
    expect(result.items[0].episodeNumber).toBeNull();
  });

  it('co-requester suppression: Alice is co-requester on S2 -> S2 suppressed from Alice Up Next', async () => {
    // Bob requested S1 and Alice was co-requester
    db.insert(downloadRequests).values({
      id: 'req-bob-s1',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bobs1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-500',
      metadataSource: 'tmdb',
      title: 'Slow Horses',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    db.insert(requestCoRequesters).values({
      requestId: 'req-bob-s1',
      userId: aliceId,
      addedAt: new Date().toISOString(),
    }).run();

    // Bob requested S2, and Alice is also co-requester on S2
    db.insert(downloadRequests).values({
      id: 'req-bob-s2',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bobs2',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-500',
      metadataSource: 'tmdb',
      title: 'Slow Horses',
      seasonNumber: 2,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    db.insert(requestCoRequesters).values({
      requestId: 'req-bob-s2',
      userId: aliceId,
      addedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'slow-horses-s02',
        title: 'Slow Horses Season 2 Complete 1080p',
        sizeBytes: 8000000000,
        formattedSize: '8 GB',
        seeders: 50,
        leechers: 4,
        downloadUrl: 'magnet:?xt=urn:btih:sh2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 130,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(aliceId);
    expect(result.available).toBe(true);
    // S2 already exists/covered -> suppressed for Alice
    expect(result.items).toHaveLength(0);
  });

  it('deleted requests ignored: Bob request for S2 is marked status = deleted -> S2 is surfaced for Alice', async () => {
    // Alice requested S1
    db.insert(downloadRequests).values({
      id: 'req-alice-s1',
      userId: aliceId,
      magnetLink: 'magnet:?xt=urn:btih:alices1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-600',
      metadataSource: 'tmdb',
      title: 'Fallout',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Bob requested S2 but it was deleted
    db.insert(downloadRequests).values({
      id: 'req-bob-s2',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bobs2',
      mediaType: 'tv_show',
      status: 'deleted',
      metadataId: 'show-600',
      metadataSource: 'tmdb',
      title: 'Fallout',
      seasonNumber: 2,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'fallout-s02',
        title: 'Fallout S02 1080p WEB-DL',
        sizeBytes: 10000000000,
        formattedSize: '10 GB',
        seeders: 80,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:fo2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 150,
        isLowHealth: false,
      },
    ];

    const result = await service.getUpNext(aliceId);
    expect(result.available).toBe(true);
    // Deleted request should NOT suppress -> surfaces S2!
    expect(result.items).toHaveLength(1);
    expect(result.items[0].showTitle).toBe('Fallout');
    expect(result.items[0].seasonNumber).toBe(2);
  });

  it('co-requester followed show inclusion: Alice only co-requested S1 -> Alice gets S2 suggestion', async () => {
    // Bob requested S1
    db.insert(downloadRequests).values({
      id: 'req-bob-s1',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bobs1',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: 'show-700',
      metadataSource: 'tmdb',
      title: 'Silo',
      seasonNumber: 1,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    // Alice is co-requester on S1
    db.insert(requestCoRequesters).values({
      requestId: 'req-bob-s1',
      userId: aliceId,
      addedAt: new Date().toISOString(),
    }).run();

    prowlarr.candidatesToReturn = [
      {
        guid: 'silo-s02',
        title: 'Silo Season 2 Complete 1080p',
        sizeBytes: 9000000000,
        formattedSize: '9 GB',
        seeders: 70,
        leechers: 3,
        downloadUrl: 'magnet:?xt=urn:btih:silo2',
        indexer: 'Tracker',
        resolution: '1080p',
        codec: 'x264',
        source: 'web',
        score: 140,
        isLowHealth: false,
      },
    ];

    // Alice has no direct downloadRequests, but is co-requester on Silo S1.
    // Up Next should track Silo for Alice and recommend S2!
    const result = await service.getUpNext(aliceId);
    expect(result.available).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].showTitle).toBe('Silo');
    expect(result.items[0].seasonNumber).toBe(2);
  });

  it('suppresses movie candidate if another user requested it', async () => {
    // Up Next service is primarily for episodic/shows, but isCandidateAlreadyRequested supports movies.
    // We can verify isCandidateAlreadyRequested directly for movie:
    const { isCandidateAlreadyRequested } = await import('../src/services/upNext');
    db.insert(downloadRequests).values({
      id: 'req-bob-movie',
      userId: bobId,
      magnetLink: 'magnet:?xt=urn:btih:bobmovie',
      mediaType: 'movie',
      status: 'done',
      metadataId: 'movie-1',
      metadataSource: 'tmdb',
      title: 'Dune: Part Two',
      seasonNumber: null,
      episodeNumber: null,
      requestedAt: new Date().toISOString(),
    }).run();

    const isRequested = isCandidateAlreadyRequested(db, {
      mediaType: 'movie',
      metadataId: 'movie-1',
      metadataSource: 'tmdb',
      showTitle: 'Dune: Part Two',
    });
    expect(isRequested).toBe(true);

    const isUnrequested = isCandidateAlreadyRequested(db, {
      mediaType: 'movie',
      metadataId: 'movie-999',
      metadataSource: 'tmdb',
      showTitle: 'Nonexistent Movie',
    });
    expect(isUnrequested).toBe(false);
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

  it('suppresses items already requested by another user via HTTP endpoint', async () => {
    // Insert another user
    app.db.insert(users).values({
      id: 'other-user',
      username: 'otheruser',
      role: 'user',
      jellyfinUserId: 'jf_other',
      createdAt: new Date().toISOString(),
    }).run();

    // Logged-in user has Succession S1E5
    app.db.insert(downloadRequests).values({
      id: 'req-user-e5',
      userId: loggedInUserId,
      magnetLink: 'magnet:?xt=urn:btih:e5',
      mediaType: 'tv_show',
      status: 'done',
      metadataId: '500',
      metadataSource: 'tmdb',
      title: 'Succession',
      seasonNumber: 1,
      episodeNumber: 5,
      requestedAt: new Date().toISOString(),
    }).run();

    // Other user already requested Succession S1E6!
    app.db.insert(downloadRequests).values({
      id: 'req-other-e6',
      userId: 'other-user',
      magnetLink: 'magnet:?xt=urn:btih:other-e6',
      mediaType: 'tv_show',
      status: 'downloading',
      metadataId: '500',
      metadataSource: 'tmdb',
      title: 'Succession',
      seasonNumber: 1,
      episodeNumber: 6,
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
    expect(body.items).toHaveLength(0);
  });
});
