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
    const mockProwlarr: IProwlarrService = {
      isConfigured: () => true,
      parseReleaseTitle: vi.fn(),
      scoreRelease: vi.fn(),
      searchMovieReleases: vi.fn().mockResolvedValue({
        recommended: {
          guid: 'rec-1',
          title: 'Inception.2010.1080p.BluRay.x264',
          sizeBytes: 3221225472,
          formattedSize: '3.0 GB',
          seeders: 42,
          leechers: 5,
          downloadUrl: 'magnet:?xt=urn:btih:rec1',
          indexer: '1337x',
          resolution: '1080p',
          codec: 'x264',
          source: 'bluray',
          score: 180,
          isLowHealth: false,
        },
        candidates: [],
        totalFound: 1,
        isConfigured: true,
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
});
