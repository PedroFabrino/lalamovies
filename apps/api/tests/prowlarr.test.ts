import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { ProwlarrService, IProwlarrService, ReleaseCandidate } from '../src/services/prowlarr';
import { IJellyfinService } from '../src/services/jellyfin';

class DummyJellyfinService implements IJellyfinService {
  async authenticateUser(username: string) {
    return { accessToken: 'token', userId: `uid_${username}`, username, isAdmin: true };
  }
  async createUser() {
    return 'new_uid';
  }
  async deleteUser() {}
}

describe('Prowlarr Service - Unit Tests', () => {
  describe('isConfigured', () => {
    it('returns false when apiKey is not provided or empty', () => {
      const service = new ProwlarrService('http://localhost:9696', '');
      expect(service.isConfigured()).toBe(false);
    });

    it('returns true when apiKey is present', () => {
      const service = new ProwlarrService('http://localhost:9696', 'valid-api-key');
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('checkHealth', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns false immediately when apiKey is not configured', async () => {
      const service = new ProwlarrService('http://localhost:9696', '');
      const isHealthy = await service.checkHealth();
      expect(isHealthy).toBe(false);
    });

    it('returns true when ping endpoint returns 200 ok', async () => {
      const service = new ProwlarrService('http://localhost:9696', 'valid-key');
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const isHealthy = await service.checkHealth();
      expect(isHealthy).toBe(true);
    });

    it('returns false when ping endpoint returns non-200 or throws', async () => {
      const service = new ProwlarrService('http://localhost:9696', 'valid-key');
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await service.checkHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('parseReleaseTitle', () => {
    const service = new ProwlarrService('http://localhost:9696', 'test-key');

    it('extracts 1080p, x264, and bluray correctly', () => {
      const parsed = service.parseReleaseTitle('Inception.2010.1080p.BluRay.x264-SPARKS');
      expect(parsed.resolution).toBe('1080p');
      expect(parsed.codec).toBe('x264');
      expect(parsed.source).toBe('bluray');
    });

    it('extracts 2160p / 4k, x265, and web correctly', () => {
      const parsed = service.parseReleaseTitle('Dune.Part.Two.2024.2160p.4K.WEB-DL.x265.DDP5.1');
      expect(parsed.resolution).toBe('2160p');
      expect(parsed.codec).toBe('x265');
      expect(parsed.source).toBe('web');
    });

    it('extracts 720p, avc/x264, and hdtv correctly', () => {
      const parsed = service.parseReleaseTitle('Breaking.Bad.720p.HDTV.AVC-GROUP');
      expect(parsed.resolution).toBe('720p');
      expect(parsed.codec).toBe('x264');
      expect(parsed.source).toBe('hdtv');
    });

    it('identifies CAM release and penalizes it', () => {
      const parsed = service.parseReleaseTitle('Deadpool.3.2024.CAMRip.x264');
      expect(parsed.source).toBe('cam');
    });

    it('identifies remux release correctly', () => {
      const parsed = service.parseReleaseTitle('Interstellar.2014.1080p.Remux.AVC');
      expect(parsed.source).toBe('remux');
    });
  });

  describe('scoreRelease', () => {
    const service = new ProwlarrService('http://localhost:9696', 'test-key');
    const GB = 1024 * 1024 * 1024;

    it('scores 1080p higher than 720p and 2160p', () => {
      const candidate1080p = {
        guid: '1',
        title: 'Movie.1080p.WEB.x264',
        sizeBytes: 3 * GB,
        formattedSize: '3.0 GB',
        seeders: 20,
        leechers: 2,
        downloadUrl: 'magnet:?xt=1',
        indexer: '1337x',
        resolution: '1080p' as const,
        codec: 'x264' as const,
        source: 'web' as const,
      };

      const candidate720p = { ...candidate1080p, guid: '2', resolution: '720p' as const };
      const candidate4k = { ...candidate1080p, guid: '3', resolution: '2160p' as const };

      const score1080 = service.scoreRelease(candidate1080p).score;
      const score720 = service.scoreRelease(candidate720p).score;
      const score4k = service.scoreRelease(candidate4k).score;

      expect(score1080).toBeGreaterThan(score720);
      expect(score1080).toBeGreaterThan(score4k);
    });

    it('heavily penalizes movies exceeding 10GB', () => {
      const normalMovie = {
        guid: '1',
        title: 'Movie.1080p.x264',
        sizeBytes: 4 * GB,
        formattedSize: '4.0 GB',
        seeders: 20,
        leechers: 2,
        downloadUrl: 'magnet:?xt=1',
        indexer: '1337x',
        resolution: '1080p' as const,
        codec: 'x264' as const,
        source: 'web' as const,
      };

      const oversizedMovie = { ...normalMovie, guid: '2', sizeBytes: 15 * GB };

      const normalScore = service.scoreRelease(normalMovie).score;
      const oversizedScore = service.scoreRelease(oversizedMovie).score;

      expect(normalScore).toBeGreaterThan(oversizedScore);
    });

    it('flags candidate as low health if seeders < 5', () => {
      const lowSeedCandidate = {
        guid: '1',
        title: 'Movie.1080p.x264',
        sizeBytes: 4 * GB,
        formattedSize: '4.0 GB',
        seeders: 3,
        leechers: 1,
        downloadUrl: 'magnet:?xt=1',
        indexer: '1337x',
        resolution: '1080p' as const,
        codec: 'x264' as const,
        source: 'web' as const,
      };

      const result = service.scoreRelease(lowSeedCandidate);
      expect(result.isLowHealth).toBe(true);
    });

    it('marks candidate healthy if seeders >= 5', () => {
      const healthyCandidate = {
        guid: '1',
        title: 'Movie.1080p.x264',
        sizeBytes: 4 * GB,
        formattedSize: '4.0 GB',
        seeders: 5,
        leechers: 1,
        downloadUrl: 'magnet:?xt=1',
        indexer: '1337x',
        resolution: '1080p' as const,
        codec: 'x264' as const,
        source: 'web' as const,
      };

      const result = service.scoreRelease(healthyCandidate);
      expect(result.isLowHealth).toBe(false);
    });
  });

  describe('searchMovieReleases', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns empty result when unconfigured', async () => {
      const service = new ProwlarrService('http://localhost:9696', '');
      const result = await service.searchMovieReleases('Inception', 2010);
      expect(result.isConfigured).toBe(false);
      expect(result.recommended).toBeNull();
      expect(result.candidates).toEqual([]);
      expect(result.totalFound).toBe(0);
    });

    it('fetches and sorts releases, setting top healthy 1080p as recommended', async () => {
      const service = new ProwlarrService('http://localhost:9696', 'mock-key');

      const mockTorrents = [
        {
          guid: 't1',
          title: 'Inception.2010.720p.HDTV.x264-GRP',
          size: 2 * 1024 * 1024 * 1024,
          indexer: '1337x',
          seeders: 15,
          leechers: 1,
          magnetUrl: 'magnet:?xt=urn:btih:hash1',
        },
        {
          guid: 't2',
          title: 'Inception.2010.1080p.BluRay.x265-GRP',
          size: 4 * 1024 * 1024 * 1024,
          indexer: 'TorrentGalaxy',
          seeders: 30,
          leechers: 3,
          magnetUrl: 'magnet:?xt=urn:btih:hash2',
        },
        {
          guid: 't3',
          title: 'Inception.2010.CAM.x264',
          size: 800 * 1024 * 1024,
          indexer: 'YTS',
          seeders: 100,
          leechers: 5,
          magnetUrl: 'magnet:?xt=urn:btih:hash3',
        },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockTorrents,
      } as Response);

      const result = await service.searchMovieReleases('Inception', 2010);

      expect(result.isConfigured).toBe(true);
      expect(result.totalFound).toBe(3);
      expect(result.recommended).not.toBeNull();
      expect(result.recommended?.title).toBe('Inception.2010.1080p.BluRay.x265-GRP');
      expect(result.recommended?.resolution).toBe('1080p');
      expect(result.recommended?.codec).toBe('x265');
      expect(result.candidates[0].guid).toBe('t2');
    });

    it('returns null recommended when all releases have seeders < 5', async () => {
      const service = new ProwlarrService('http://localhost:9696', 'mock-key');

      const mockTorrents = [
        {
          guid: 't1',
          title: 'RareMovie.1080p.x264',
          size: 2 * 1024 * 1024 * 1024,
          indexer: '1337x',
          seeders: 2,
          leechers: 0,
          magnetUrl: 'magnet:?xt=urn:btih:rare',
        },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockTorrents,
      } as Response);

      const result = await service.searchMovieReleases('RareMovie', 1980);

      expect(result.isConfigured).toBe(true);
      expect(result.totalFound).toBe(1);
      expect(result.recommended).toBeNull();
      expect(result.candidates[0].isLowHealth).toBe(true);
    });
  });

  describe('searchReleases - TV Shows & Anime', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const service = new ProwlarrService('http://localhost:9696', 'mock-key');

    it('formats TV show Season Pack query with S01 and category 5000', async () => {
      let capturedUrl = '';
      vi.spyOn(global, 'fetch').mockImplementationOnce(async (url) => {
        capturedUrl = String(url);
        return {
          ok: true,
          json: async () => [],
        } as Response;
      });

      await service.searchReleases({
        mediaType: 'tv_show',
        title: 'Breaking Bad',
        seasonNumber: 1,
      });

      expect(capturedUrl).toContain('categories=5000');
      expect(capturedUrl).toContain(encodeURIComponent('Breaking Bad S01'));
    });

    it('formats TV show Single Episode query with S01E05 and category 5000', async () => {
      let capturedUrl = '';
      vi.spyOn(global, 'fetch').mockImplementationOnce(async (url) => {
        capturedUrl = String(url);
        return {
          ok: true,
          json: async () => [],
        } as Response;
      });

      await service.searchReleases({
        mediaType: 'tv_show',
        title: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: 5,
      });

      expect(capturedUrl).toContain('categories=5000');
      expect(capturedUrl).toContain(encodeURIComponent('Breaking Bad S01E05'));
    });

    it('routes Anime to categories 5070,2070 and uses Romaji title', async () => {
      let capturedUrl = '';
      vi.spyOn(global, 'fetch').mockImplementationOnce(async (url) => {
        capturedUrl = String(url);
        return {
          ok: true,
          json: async () => [
            {
              guid: 'a1',
              title: '[SubsPlease] Sousou no Frieren - 01 (1080p)',
              size: 1.4 * 1024 * 1024 * 1024,
              indexer: 'Nyaa',
              seeders: 40,
              magnetUrl: 'magnet:?xt=urn:btih:a1',
            },
            {
              guid: 'a2',
              title: '[Erai-raws] Sousou no Frieren - 01 [1080p]',
              size: 1.2 * 1024 * 1024 * 1024,
              indexer: 'Nyaa',
              seeders: 25,
              magnetUrl: 'magnet:?xt=urn:btih:a2',
            },
            {
              guid: 'a3',
              title: 'Sousou no Frieren - 01 720p',
              size: 700 * 1024 * 1024,
              indexer: 'TokyoTosho',
              seeders: 15,
              magnetUrl: 'magnet:?xt=urn:btih:a3',
            },
          ],
        } as Response;
      });

      const result = await service.searchReleases({
        mediaType: 'anime',
        title: "Frieren: Beyond Journey's End",
        romajiTitle: 'Sousou no Frieren',
        englishTitle: "Frieren: Beyond Journey's End",
        episodeNumber: 1,
      });

      expect(capturedUrl).toContain('categories=5070&categories=2070');
      expect(capturedUrl).toContain(encodeURIComponent('Sousou no Frieren - 01'));
      expect(result.totalFound).toBe(3);
      expect(result.recommended?.title).toBe('[SubsPlease] Sousou no Frieren - 01 (1080p)');
    });

    it('falls back to English title when Romaji anime search finds fewer than 3 candidates', async () => {
      const urls: string[] = [];
      vi.spyOn(global, 'fetch')
        .mockImplementationOnce(async (url) => {
          urls.push(String(url));
          return {
            ok: true,
            json: async () => [
              {
                guid: 'r1',
                title: 'Shingeki no Kyojin - 01 (1080p)',
                size: 1.4 * 1024 * 1024 * 1024,
                indexer: 'Nyaa',
                seeders: 10,
                magnetUrl: 'magnet:?xt=urn:btih:r1',
              },
            ],
          } as Response;
        })
        .mockImplementationOnce(async (url) => {
          urls.push(String(url));
          return {
            ok: true,
            json: async () => [
              {
                guid: 'e1',
                title: 'Attack on Titan - 01 (1080p)',
                size: 1.3 * 1024 * 1024 * 1024,
                indexer: '1337x',
                seeders: 30,
                magnetUrl: 'magnet:?xt=urn:btih:e1',
              },
            ],
          } as Response;
        });

      const result = await service.searchReleases({
        mediaType: 'anime',
        title: 'Attack on Titan',
        romajiTitle: 'Shingeki no Kyojin',
        englishTitle: 'Attack on Titan',
        episodeNumber: 1,
      });

      expect(urls.length).toBe(2);
      expect(urls[0]).toContain(encodeURIComponent('Shingeki no Kyojin - 01'));
      expect(urls[1]).toContain(encodeURIComponent('Attack on Titan - 01'));
      expect(result.totalFound).toBe(2);
    });

    it('applies episodic size limits (2GB cap for single episodes, 25GB cap for TV season packs)', () => {
      const GB = 1024 * 1024 * 1024;

      const singleEpGood = {
        guid: '1',
        title: 'Show.S01E01.1080p.x264',
        sizeBytes: 1.2 * GB,
        formattedSize: '1.2 GB',
        seeders: 15,
        leechers: 1,
        downloadUrl: 'magnet:?xt=1',
        indexer: '1337x',
        resolution: '1080p' as const,
        codec: 'x264' as const,
        source: 'web' as const,
      };

      const singleEpBloated = {
        ...singleEpGood,
        guid: '2',
        sizeBytes: 5 * GB,
        formattedSize: '5.0 GB',
      };

      const scoreEpGood = service.scoreRelease(singleEpGood, { isSingleEpisode: true }).score;
      const scoreEpBloated = service.scoreRelease(singleEpBloated, { isSingleEpisode: true }).score;
      expect(scoreEpGood).toBeGreaterThan(scoreEpBloated);

      const seasonPackGood = {
        ...singleEpGood,
        sizeBytes: 15 * GB,
        formattedSize: '15.0 GB',
      };
      const seasonPackBloated = {
        ...singleEpGood,
        sizeBytes: 50 * GB,
        formattedSize: '50.0 GB',
      };

      const scorePackGood = service.scoreRelease(seasonPackGood, { mediaType: 'tv_show', isSingleEpisode: false }).score;
      const scorePackBloated = service.scoreRelease(seasonPackBloated, { mediaType: 'tv_show', isSingleEpisode: false }).score;
      expect(scorePackGood).toBeGreaterThan(scorePackBloated);
    });
  });
});

describe('POST /requests/search-releases - Route Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new DummyJellyfinService(),
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'testuser', password: 'password123' },
    });
    authCookie = loginRes.cookies[0].value;
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-releases',
      payload: {
        metadataId: '123',
        metadataSource: 'tmdb',
        mediaType: 'movie',
        title: 'Inception',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('validates request payload and rejects invalid bodies with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-releases',
      cookies: { token: authCookie },
      payload: {
        // Missing metadataId and title
        mediaType: 'movie',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns release search results for valid movie request', async () => {
    const mockResult = {
      recommended: {
        guid: 'rec-1',
        title: 'Inception.2010.1080p.BluRay.x264',
        sizeBytes: 3221225472,
        formattedSize: '3.0 GB',
        seeders: 42,
        leechers: 5,
        downloadUrl: 'magnet:?xt=urn:btih:rec1',
        indexer: '1337x',
        resolution: '1080p' as const,
        codec: 'x264' as const,
        source: 'bluray' as const,
        score: 180,
        isLowHealth: false,
      },
      candidates: [],
      totalFound: 1,
      isConfigured: true,
      isReachable: true,
      hasHealthyReleases: true,
    };

    const mockProwlarr: IProwlarrService = {
      isConfigured: () => true,
      checkHealth: vi.fn().mockResolvedValue(true),
      parseReleaseTitle: vi.fn(),
      scoreRelease: vi.fn(),
      searchMovieReleases: vi.fn().mockResolvedValue(mockResult),
      searchReleases: vi.fn().mockResolvedValue(mockResult),
    };

    const testApp = buildApp({
      dbPath: ':memory:',
      jellyfinService: new DummyJellyfinService(),
      prowlarrService: mockProwlarr,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    await testApp.ready();

    const loginRes = await testApp.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'testuser', password: 'password123' },
    });
    const cookie = loginRes.cookies[0].value;

    const res = await testApp.inject({
      method: 'POST',
      url: '/requests/search-releases',
      cookies: { token: cookie },
      payload: {
        metadataId: '27205',
        metadataSource: 'tmdb',
        mediaType: 'movie',
        title: 'Inception',
        year: 2010,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.isConfigured).toBe(true);
    expect(body.recommended?.title).toBe('Inception.2010.1080p.BluRay.x264');
    expect(body.recommended?.resolution).toBe('1080p');
    expect(body.recommended?.seeders).toBe(42);

    await testApp.close();
  });

  it('handles TV show and Anime search-releases requests', async () => {
    const mockProwlarr: IProwlarrService = {
      isConfigured: () => true,
      checkHealth: vi.fn().mockResolvedValue(true),
      parseReleaseTitle: vi.fn(),
      scoreRelease: vi.fn(),
      searchMovieReleases: vi.fn(),
      searchReleases: vi.fn().mockResolvedValue({
        recommended: {
          guid: 'rec-tv',
          title: 'Breaking.Bad.S01.1080p.BluRay',
          sizeBytes: 15 * 1024 * 1024 * 1024,
          formattedSize: '15.0 GB',
          seeders: 55,
          leechers: 2,
          downloadUrl: 'magnet:?xt=urn:btih:bb1',
          indexer: '1337x',
          resolution: '1080p',
          codec: 'x264',
          source: 'bluray',
          score: 170,
          isLowHealth: false,
        },
        candidates: [],
        totalFound: 1,
        isConfigured: true,
        isReachable: true,
        hasHealthyReleases: true,
      }),
    };

    const testApp = buildApp({
      dbPath: ':memory:',
      jellyfinService: new DummyJellyfinService(),
      prowlarrService: mockProwlarr,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    await testApp.ready();

    const loginRes = await testApp.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'testuser', password: 'password123' },
    });
    const cookie = loginRes.cookies[0].value;

    const res = await testApp.inject({
      method: 'POST',
      url: '/requests/search-releases',
      cookies: { token: cookie },
      payload: {
        metadataId: '1396',
        metadataSource: 'tmdb',
        mediaType: 'tv_show',
        title: 'Breaking Bad',
        seasonNumber: 1,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.recommended?.title).toBe('Breaking.Bad.S01.1080p.BluRay');
    expect(mockProwlarr.searchReleases).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'tv_show',
        title: 'Breaking Bad',
        seasonNumber: 1,
      })
    );

    await testApp.close();
  });

  describe('GET /requests/prowlarr-status', () => {
    it('returns 200 when Prowlarr is configured and reachable', async () => {
      const mockProwlarr: IProwlarrService = {
        isConfigured: () => true,
        checkHealth: vi.fn().mockResolvedValue(true),
        parseReleaseTitle: vi.fn(),
        scoreRelease: vi.fn(),
        searchMovieReleases: vi.fn(),
        searchReleases: vi.fn(),
      };

      const testApp = buildApp({
        dbPath: ':memory:',
        jellyfinService: new DummyJellyfinService(),
        prowlarrService: mockProwlarr,
        jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
      });
      await testApp.ready();

      const loginRes = await testApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'testuser', password: 'password123' },
      });
      const cookie = loginRes.cookies[0].value;

      const res = await testApp.inject({
        method: 'GET',
        url: '/requests/prowlarr-status',
        cookies: { token: cookie },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.isConfigured).toBe(true);
      expect(body.isReachable).toBe(true);

      await testApp.close();
    });

    it('returns 503 when Prowlarr is not configured', async () => {
      const mockProwlarr: IProwlarrService = {
        isConfigured: () => false,
        checkHealth: vi.fn().mockResolvedValue(false),
        parseReleaseTitle: vi.fn(),
        scoreRelease: vi.fn(),
        searchMovieReleases: vi.fn(),
        searchReleases: vi.fn(),
      };

      const testApp = buildApp({
        dbPath: ':memory:',
        jellyfinService: new DummyJellyfinService(),
        prowlarrService: mockProwlarr,
        jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
      });
      await testApp.ready();

      const loginRes = await testApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'testuser', password: 'password123' },
      });
      const cookie = loginRes.cookies[0].value;

      const res = await testApp.inject({
        method: 'GET',
        url: '/requests/prowlarr-status',
        cookies: { token: cookie },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.isConfigured).toBe(false);
      expect(body.isReachable).toBe(false);

      await testApp.close();
    });

    it('returns 503 when Prowlarr is unreachable', async () => {
      const mockProwlarr: IProwlarrService = {
        isConfigured: () => true,
        checkHealth: vi.fn().mockResolvedValue(false),
        parseReleaseTitle: vi.fn(),
        scoreRelease: vi.fn(),
        searchMovieReleases: vi.fn(),
        searchReleases: vi.fn(),
      };

      const testApp = buildApp({
        dbPath: ':memory:',
        jellyfinService: new DummyJellyfinService(),
        prowlarrService: mockProwlarr,
        jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
      });
      await testApp.ready();

      const loginRes = await testApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'testuser', password: 'password123' },
      });
      const cookie = loginRes.cookies[0].value;

      const res = await testApp.inject({
        method: 'GET',
        url: '/requests/prowlarr-status',
        cookies: { token: cookie },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.isConfigured).toBe(true);
      expect(body.isReachable).toBe(false);

      await testApp.close();
    });
  });

  describe('Graceful degradation in POST /requests/search-releases', () => {
    it('returns 503 structured response when Prowlarr is unreachable', async () => {
      const mockProwlarr: IProwlarrService = {
        isConfigured: () => true,
        checkHealth: vi.fn().mockResolvedValue(false),
        parseReleaseTitle: vi.fn(),
        scoreRelease: vi.fn(),
        searchMovieReleases: vi.fn(),
        searchReleases: vi.fn().mockResolvedValue({
          recommended: null,
          candidates: [],
          totalFound: 0,
          isConfigured: true,
          isReachable: false,
          hasHealthyReleases: false,
          error: 'Unable to connect to Prowlarr at http://localhost:9696',
        }),
      };

      const testApp = buildApp({
        dbPath: ':memory:',
        jellyfinService: new DummyJellyfinService(),
        prowlarrService: mockProwlarr,
        jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
      });
      await testApp.ready();

      const loginRes = await testApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'testuser', password: 'password123' },
      });
      const cookie = loginRes.cookies[0].value;

      const res = await testApp.inject({
        method: 'POST',
        url: '/requests/search-releases',
        cookies: { token: cookie },
        payload: {
          metadataId: '27205',
          metadataSource: 'tmdb',
          mediaType: 'movie',
          title: 'Inception',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.isReachable).toBe(false);
      expect(body.isConfigured).toBe(true);
      expect(body.hasHealthyReleases).toBe(false);

      await testApp.close();
    });

    it('returns 200 with recommended: null and hasHealthyReleases: false when all releases are low health', async () => {
      const mockProwlarr: IProwlarrService = {
        isConfigured: () => true,
        checkHealth: vi.fn().mockResolvedValue(true),
        parseReleaseTitle: vi.fn(),
        scoreRelease: vi.fn(),
        searchMovieReleases: vi.fn(),
        searchReleases: vi.fn().mockResolvedValue({
          recommended: null,
          candidates: [
            {
              guid: 'c-low',
              title: 'Rare.Movie.1080p',
              sizeBytes: 1024 * 1024 * 1024,
              formattedSize: '1.0 GB',
              seeders: 2,
              leechers: 0,
              downloadUrl: 'magnet:?xt=urn:btih:rare',
              indexer: '1337x',
              resolution: '1080p',
              codec: 'x264',
              source: 'web',
              score: 50,
              isLowHealth: true,
            },
          ],
          totalFound: 1,
          isConfigured: true,
          isReachable: true,
          hasHealthyReleases: false,
        }),
      };

      const testApp = buildApp({
        dbPath: ':memory:',
        jellyfinService: new DummyJellyfinService(),
        prowlarrService: mockProwlarr,
        jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
      });
      await testApp.ready();

      const loginRes = await testApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'testuser', password: 'password123' },
      });
      const cookie = loginRes.cookies[0].value;

      const res = await testApp.inject({
        method: 'POST',
        url: '/requests/search-releases',
        cookies: { token: cookie },
        payload: {
          metadataId: '999',
          metadataSource: 'tmdb',
          mediaType: 'movie',
          title: 'Rare Movie',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.isConfigured).toBe(true);
      expect(body.isReachable).toBe(true);
      expect(body.recommended).toBeNull();
      expect(body.hasHealthyReleases).toBe(false);
      expect(body.candidates[0].isLowHealth).toBe(true);

      await testApp.close();
    });
  });
});
