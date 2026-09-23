import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { users, featureFlags } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import {
  calculateCurrentSeasonAndYear,
  calculateNextSeasonAndYear,
  AnimeSeasonService,
} from '../src/services/animeSeasonService';
import {
  AnimeHistoryMatcher,
  extractShowNameFromPath,
} from '../src/services/animeHistoryMatcher';
import {
  SeasonalAnimeItem,
  MediaSeason,
} from '../src/services/animeTypes';
import { MetadataCandidate } from '../src/services/metadata';

function createMockAnime(id: number, romaji: string, english: string | null = null, relations = []): SeasonalAnimeItem {
  return {
    id,
    title: { romaji, english, native: null },
    format: 'TV',
    status: 'NOT_YET_RELEASED',
    episodes: 12,
    season: 'SPRING',
    seasonYear: 2025,
    startDate: { year: 2025, month: 4, day: 1 },
    coverImage: { extraLarge: 'http://img/xl.jpg', large: 'http://img/l.jpg', medium: 'http://img/m.jpg' },
    bannerImage: null,
    genres: ['Action', 'Fantasy'],
    averageScore: 84,
    popularity: 50000,
    description: 'An exciting story',
    trailer: null,
    relations,
  };
}

describe('AnimeSeasonService & Calculations', () => {
  it('calculates seasons accurately across quarterly boundaries', () => {
    expect(calculateCurrentSeasonAndYear(new Date(2025, 0, 15)).season).toBe('WINTER');
    expect(calculateCurrentSeasonAndYear(new Date(2025, 3, 10)).season).toBe('SPRING');
    expect(calculateCurrentSeasonAndYear(new Date(2025, 6, 20)).season).toBe('SUMMER');
    expect(calculateCurrentSeasonAndYear(new Date(2025, 10, 5)).season).toBe('FALL');

    expect(calculateNextSeasonAndYear('WINTER', 2025)).toEqual({ season: 'SPRING', year: 2025 });
    expect(calculateNextSeasonAndYear('SPRING', 2025)).toEqual({ season: 'SUMMER', year: 2025 });
    expect(calculateNextSeasonAndYear('SUMMER', 2025)).toEqual({ season: 'FALL', year: 2025 });
    expect(calculateNextSeasonAndYear('FALL', 2025)).toEqual({ season: 'WINTER', year: 2026 });
  });

  it('extractShowNameFromPath extracts show folder from complex Jellyfin paths', () => {
    expect(extractShowNameFromPath('/media/anime/Solo Leveling/Season 1/S01E01.mkv')).toBe('Solo Leveling');
    expect(extractShowNameFromPath('C:\\media\\anime\\Frieren - Beyond Journey\\ep01.mp4')).toBe('Frieren - Beyond Journey');
    expect(extractShowNameFromPath('/media/anime/Attack on Titan/Specials/s00e01.mkv')).toBe('Attack on Titan');
    expect(extractShowNameFromPath('')).toBe('');
  });

  it('AnimeHistoryMatcher correlates sequels via AniList ID and title matching', async () => {
    const mockRepo = {
      findByUserId: vi.fn().mockReturnValue([
        {
          id: 'req-1',
          mediaType: 'anime',
          status: 'done',
          metadataSource: 'anilist',
          metadataId: '100',
          title: 'Solo Leveling',
        },
        {
          id: 'req-2',
          mediaType: 'anime',
          status: 'done',
          metadataSource: 'tmdb',
          metadataId: '999',
          title: 'Jujutsu Kaisen',
        },
      ]),
    } as any;

    const mockJellyfin = {
      getPlayHistory: vi.fn().mockResolvedValue({
        '/media/anime/Frieren/Season 1/S01E01.mkv': '2025-01-01',
      }),
    } as any;

    const matcher = new AnimeHistoryMatcher({ requestsRepo: mockRepo, jellyfin: mockJellyfin });

    const upcomingAnime = [
      // Show 1: matches via AniList ID in PREQUEL relation
      createMockAnime(201, 'Ore dake Level Up na Ken Season 2', 'Solo Leveling Season 2', [
        {
          relationType: 'PREQUEL',
          node: { id: 100, title: { romaji: 'Solo Leveling', english: 'Solo Leveling' }, format: 'TV' },
        },
      ] as any),
      // Show 2: matches via Title in PARENT relation (from TMDB request)
      createMockAnime(202, 'Jujutsu Kaisen: Culling Game', 'Jujutsu Kaisen: Culling Game', [
        {
          relationType: 'PARENT',
          node: { id: 555, title: { romaji: 'Jujutsu Kaisen', english: 'Jujutsu Kaisen' }, format: 'TV' },
        },
      ] as any),
      // Show 3: matches via Jellyfin play history path
      createMockAnime(203, 'Sousou no Frieren 2nd Season', 'Frieren Season 2', [
        {
          relationType: 'PREQUEL',
          node: { id: 777, title: { romaji: 'Sousou no Frieren', english: 'Frieren' }, format: 'TV' },
        },
      ] as any),
      // Show 4: Unrelated show
      createMockAnime(204, 'Brand New Anime', 'Brand New Anime', []),
    ];

    const results = await matcher.findAnticipatedSequels(upcomingAnime, 'user-1', 'jf-1');
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe(201);
    expect(results[0].prequelTitle).toContain('Solo Leveling');
    expect(results[1].id).toBe(202);
    expect(results[1].prequelTitle).toContain('Jujutsu Kaisen');
    expect(results[2].id).toBe(203);
    expect(results[2].prequelTitle).toContain('Frieren');
  });

  it('AnimeHistoryMatcher gracefully returns empty when Jellyfin fails or user has no history', async () => {
    const mockRepo = {
      findByUserId: vi.fn().mockReturnValue([]),
    } as any;
    const mockJellyfin = {
      getPlayHistory: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as any;

    const matcher = new AnimeHistoryMatcher({ requestsRepo: mockRepo, jellyfin: mockJellyfin });
    const results = await matcher.findAnticipatedSequels([createMockAnime(1, 'Test')], 'user-1', 'jf-1');
    expect(results).toEqual([]);
  });

  it('Tiered in-memory caching and request deduplication in AnimeSeasonService', async () => {
    let fetchCount = 0;
    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            Page: {
              pageInfo: { total: 1, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
              media: [createMockAnime(1, 'Frieren')],
            },
          },
        }),
      };
    }) as any;

    try {
      const service = new AnimeSeasonService({ trendingTtlMs: 1000, seasonalTtlMs: 1000 });

      // Concurrent fetch (deduplication test)
      const [res1, res2] = await Promise.all([
        service.getSeasonalArchive('WINTER', 2025),
        service.getSeasonalArchive('WINTER', 2025),
      ]);

      expect(fetchCount).toBe(1);
      expect(res1.items).toHaveLength(1);
      expect(res2.items).toHaveLength(1);

      // Repeat fetch within TTL (cache test)
      const res3 = await service.getSeasonalArchive('WINTER', 2025);
      expect(fetchCount).toBe(1);
      expect(res3.items[0].title.romaji).toBe('Frieren');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('AnimeSeasonService passes isAdult to AniList GraphQL query variables', async () => {
    let capturedBody: any = null;
    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
      capturedBody = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            Page: {
              pageInfo: { total: 0, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
              media: [],
            },
          },
        }),
      };
    }) as any;

    try {
      // Default: isAdult is false
      const serviceDefault = new AnimeSeasonService();
      await serviceDefault.getSeasonalArchive('WINTER', 2025);
      expect(capturedBody.variables.isAdult).toBe(false);

      // With getIsAdult: returns true
      const serviceAdult = new AnimeSeasonService({ getIsAdult: () => true });
      await serviceAdult.getSeasonalArchive('WINTER', 2025);
      expect(capturedBody.variables.isAdult).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('Anime Seasonal Routes (/anime)', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startUnarchiveDaemon: false,
      startCleanupCron: false,
      startTranscriptionCron: false,
      jwtSecret: 'test-jwt-secret-xyz',
    });
    await app.ready();

    // Create a regular user
    app.db.insert(users).values({
      id: 'usr-anime-test',
      username: 'animetester',
      passwordHash: 'dummyhash',
      role: 'user',
      jellyfinUserId: 'jf-anime-tester',
      createdAt: new Date().toISOString(),
    }).run();

    authToken = app.jwt.sign({
      id: 'usr-anime-test',
      username: 'animetester',
      role: 'user',
    });
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('enforces authentication on /anime/seasonal', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/anime/seasonal',
    });
    expect(res.statusCode).toBe(401);
  });

  it('enforces seasonal_anime feature flag', async () => {
    // Disable seasonal_anime flag
    app.db.update(featureFlags)
      .set({ enabled: false })
      .where(eq(featureFlags.id, 'seasonal_anime'))
      .run();

    const res = await app.inject({
      method: 'GET',
      url: '/anime/seasonal',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('FEATURE_DISABLED');
  });

  it('GET /anime/seasonal returns curated sections', async () => {
    const mockService = {
      getSeasonalSections: vi.fn().mockResolvedValue({
        trending: [createMockAnime(1, 'Solo Leveling')],
        popularThisSeason: [createMockAnime(2, 'Frieren')],
        upcomingNextSeason: [createMockAnime(3, 'One Punch Man 3')],
        anticipatedSequels: [
          { ...createMockAnime(3, 'One Punch Man 3'), prequelTitle: 'Sequel to One Punch Man 2', matchedRelationType: 'PREQUEL' },
        ],
      }),
    } as any;

    app.animeSeason = mockService;

    const res = await app.inject({
      method: 'GET',
      url: '/anime/seasonal',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.trending).toHaveLength(1);
    expect(body.popularThisSeason).toHaveLength(1);
    expect(body.upcomingNextSeason).toHaveLength(1);
    expect(body.anticipatedSequels).toHaveLength(1);
    expect(body.anticipatedSequels[0].prequelTitle).toBe('Sequel to One Punch Man 2');
  });

  it('GET /anime/seasons validates params and returns archive', async () => {
    const mockService = {
      getSeasonalArchive: vi.fn().mockResolvedValue({
        pageInfo: { total: 40, perPage: 24, currentPage: 1, lastPage: 2, hasNextPage: true },
        items: [createMockAnime(10, 'Archive Anime')],
      }),
    } as any;

    app.animeSeason = mockService;

    // Bad params test
    const badRes = await app.inject({
      method: 'GET',
      url: '/anime/seasons?season=INVALID&year=abc',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(badRes.statusCode).toBe(400);

    // Valid params test
    const validRes = await app.inject({
      method: 'GET',
      url: '/anime/seasons?season=SUMMER&year=2024&page=1&perPage=24',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(validRes.statusCode).toBe(200);
    const body = JSON.parse(validRes.body);
    expect(body.items[0].title.romaji).toBe('Archive Anime');
    expect(body.pageInfo.hasNextPage).toBe(true);
  });

  it('POST /anime/resolve-tmdb searches TMDB, ranks candidates, and selects recommended', async () => {
    const mockCandidates: MetadataCandidate[] = [
      { id: '101', source: 'tmdb', title: 'Solo Leveling', year: 2024, posterUrl: '/p1.jpg', overview: 'O1' },
      { id: '102', source: 'tmdb', title: 'Solo Leveling: ReAwakening', year: 2024, posterUrl: '/p2.jpg', overview: 'O2' },
    ];

    app.metadata = {
      ...app.metadata,
      searchTMDB: vi.fn().mockResolvedValue(mockCandidates),
    };

    const res = await app.inject({
      method: 'POST',
      url: '/anime/resolve-tmdb',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        anilistId: 151807,
        title: 'Solo Leveling',
        romajiTitle: 'Ore dake Level Up na Ken',
        year: 2024,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.candidates).toHaveLength(2);
    expect(body.recommended.title).toBe('Solo Leveling');
    expect(body.recommended.id).toBe('101');
  });
});
