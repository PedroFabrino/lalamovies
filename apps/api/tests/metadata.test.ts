import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { MetadataService, IMetadataService, rankMetadataCandidates } from '../src/services/metadata';
import { IJellyfinService } from '../src/services/jellyfin';
import { systemConfig } from '../src/db/schema';
import { cleanTorrentTitle } from '../src/utils/torrentTitleCleaner';

function createDummyTorrentBuffer(name: string, length = 123456): { buffer: Buffer; infoHash: string } {
  const infoDict = `d6:lengthi${length}e4:name${name.length}:${name}e`;
  const fullTorrent = `d4:info${infoDict}e`;
  const infoHash = crypto.createHash('sha1').update(Buffer.from(infoDict)).digest('hex').toLowerCase();
  return { buffer: Buffer.from(fullTorrent), infoHash };
}

class DummyJellyfinService implements IJellyfinService {
  async authenticateUser(username: string) {
    return { accessToken: 'token', userId: 'uid', username, isAdmin: true };
  }
  async createUser() {
    return 'new_uid';
  }
  async deleteUser() {}
}

describe('Metadata Service - Unit Tests', () => {
  const service = new MetadataService('test_tmdb_key');

  describe('extractTitleFromMagnet', () => {
    const testCases: [string, string][] = [
      [
        'magnet:?xt=urn:btih:12345&dn=The.Batman.2022.1080p.WEBRip.x264.AAC5.1-%5BYTS.MX%5D.mp4',
        'The Batman 2022',
      ],
      [
        '[SubsPlease] Frieren - Beyond Journey\'s End - 28 (1080p) [9876ABCD].mkv',
        'Frieren - Beyond Journey\'s End - 28',
      ],
      [
        'Breaking.Bad.S01E01.720p.HDTV.x264-CTU',
        'Breaking Bad',
      ],
      [
        'Inception (2010) [2160p] [4K] [UHD] [HDR] [5.1] [Remux]',
        'Inception 2010',
      ],
      [
        '[Erai-raws] Shingeki no Kyojin - The Final Season [1080p][HEVC]',
        'Shingeki no Kyojin - The Final Season',
      ],
      [
        'Fight Club',
        'Fight Club',
      ],
      [
        'Crowned.in.a.Hundred.Days.S01E01.1080p.CR.WEB-DL.AAC2.0.H.264-BiOMA.mkv',
        'Crowned in a Hundred Days',
      ],
      [
        'Inception.2010.1080p.BluRay.x264-SPARKS.mkv',
        'Inception 2010',
      ],
      [
        'Show.Name.Season.01',
        'Show Name',
      ],
    ];

    testCases.forEach(([input, expected]) => {
      it(`cleans "${input.slice(0, 35)}..." to "${expected}"`, () => {
        const result = service.extractTitleFromMagnet(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('searchTMDB', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('throws MetadataApiError if no TMDB API key is provided', async () => {
      const emptyKeyService = new MetadataService('');
      const originalEnv = process.env.TMDB_API_KEY;
      delete process.env.TMDB_API_KEY;

      await expect(emptyKeyService.searchTMDB('Inception', 'movie', '')).rejects.toThrow(
        'TMDB API key is not configured'
      );

      process.env.TMDB_API_KEY = originalEnv;
    });

    it('searches and normalizes movie results from TMDB', async () => {
      const mockResponse = {
        results: [
          {
            id: 27205,
            title: 'Inception',
            release_date: '2010-07-15',
            poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
            overview: 'Cobb, a skilled thief who commits corporate espionage...',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await service.searchTMDB('Inception', 'movie', 'valid_key');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: '27205',
        source: 'tmdb',
        title: 'Inception',
        year: 2010,
        posterUrl: 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
        overview: 'Cobb, a skilled thief who commits corporate espionage...',
      });
    });

    it('searches and normalizes TV show results from TMDB', async () => {
      const mockResponse = {
        results: [
          {
            id: 1396,
            name: 'Breaking Bad',
            first_air_date: '2008-01-20',
            poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
            overview: 'Walter White, a New Mexico chemistry teacher...',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await service.searchTMDB('Breaking Bad', 'tv_show', 'valid_key');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Breaking Bad');
      expect(results[0].year).toBe(2008);
      expect(results[0].source).toBe('tmdb');
    });

    it('appends primary_release_year when year is provided for movies', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 1252959,
              title: 'Compression',
              release_date: '2024-03-24',
            },
          ],
        }),
      } as Response);

      const results = await service.searchTMDB('Compression', 'movie', 'valid_key', 2024);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('&primary_release_year=2024'),
        expect.any(Object)
      );
      expect(results[0].title).toBe('Compression');
      expect(results[0].year).toBe(2024);
    });

    it('falls back to search without year if year-filtered search returns empty', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                id: 1252959,
                title: 'Compression',
                release_date: '2024-03-24',
              },
            ],
          }),
        } as Response);

      const results = await service.searchTMDB('Compression', 'movie', 'valid_key', 2024);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(results[0].title).toBe('Compression');
    });
  });

  describe('rankMetadataCandidates', () => {
    it('ranks exact title and year match over unrelated partial match (Compression vs Mardock Scramble)', () => {
      const candidates = [
        {
          id: '73529',
          source: 'tmdb' as const,
          title: 'Mardock Scramble: The First Compression',
          year: 2010,
          posterUrl: null,
          overview: null,
        },
        {
          id: '1252959',
          source: 'tmdb' as const,
          title: 'Compression',
          year: 2024,
          posterUrl: null,
          overview: null,
        },
        {
          id: '553504',
          source: 'tmdb' as const,
          title: 'Compression',
          year: 2017,
          posterUrl: null,
          overview: null,
        },
      ];

      const ranked = rankMetadataCandidates(candidates, 'Compression', 2024);

      expect(ranked[0].id).toBe('1252959');
      expect(ranked[0].title).toBe('Compression');
      expect(ranked[0].year).toBe(2024);

      // Mardock Scramble should be ranked last
      expect(ranked[2].id).toBe('73529');
    });

    it('prioritizes exact title match even when target year is not specified', () => {
      const candidates = [
        {
          id: '1',
          source: 'tmdb' as const,
          title: 'Alien: Romulus Extended Preview',
          year: 2024,
          posterUrl: null,
          overview: null,
        },
        {
          id: '2',
          source: 'tmdb' as const,
          title: 'Alien: Romulus',
          year: 2024,
          posterUrl: null,
          overview: null,
        },
      ];

      const ranked = rankMetadataCandidates(candidates, 'Alien: Romulus');
      expect(ranked[0].id).toBe('2');
      expect(ranked[0].title).toBe('Alien: Romulus');
    });
  });

  describe('searchAniList', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('searches and normalizes anime results from AniList GraphQL', async () => {
      const mockResponse = {
        data: {
          Page: {
            media: [
              {
                id: 16498,
                title: {
                  english: 'Attack on Titan',
                  romaji: 'Shingeki no Kyojin',
                },
                startDate: {
                  year: 2013,
                },
                coverImage: {
                  large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498.jpg',
                },
                description: 'Several hundred years ago, humans were nearly exterminated by Titans.<br><br>Now...',
              },
            ],
          },
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await service.searchAniList('Attack on Titan');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: '16498',
        source: 'anilist',
        title: 'Attack on Titan',
        year: 2013,
        posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498.jpg',
        overview: 'Several hundred years ago, humans were nearly exterminated by Titans.Now...',
        romajiTitle: 'Shingeki no Kyojin',
        englishTitle: 'Attack on Titan',
        rating: null,
      });
    });
  });
});

describe('POST /requests/search-metadata - Route Integration', () => {
  let app: FastifyInstance;
  let userCookie: string;

  const mockMetadataService: IMetadataService = {
    extractTitleFromMagnet: vi.fn((link: string) => cleanTorrentTitle(link).title),
    searchTMDB: vi.fn(async (query) => [
      {
        id: '101',
        source: 'tmdb',
        title: query,
        year: 2022,
        posterUrl: 'https://example.com/batman.jpg',
        overview: 'Batman description',
      },
    ]),
    searchAniList: vi.fn(async (query) => [
      {
        id: '202',
        source: 'anilist',
        title: query,
        year: 2023,
        posterUrl: 'https://example.com/frieren.jpg',
        overview: 'Frieren description',
      },
    ]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new DummyJellyfinService(),
      metadataService: mockMetadataService,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    await app.ready();

    // Login to obtain cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'tester', password: 'password123' },
    });
    userCookie = loginRes.cookies[0].value;
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:abc',
        mediaType: 'movie',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('validates request payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userCookie },
      payload: {
        magnetLink: '',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('searches TMDB for movie mediaType and returns candidates', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:123&dn=The.Batman.2022.1080p',
        mediaType: 'movie',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.query).toBe('The Batman 2022');
    expect(body.mediaType).toBe('movie');
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0].source).toBe('tmdb');
  });

  it('searches AniList for anime mediaType and returns candidates', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userCookie },
      payload: {
        magnetLink: '[SubsPlease] Frieren - 28.mkv',
        mediaType: 'anime',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.query).toBe('Frieren');
    expect(body.mediaType).toBe('anime');
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0].source).toBe('anilist');
  });

  it('falls back to TMDB for anime mediaType when AniList fails or is unavailable', async () => {
    mockMetadataService.searchAniList.mockRejectedValueOnce(new Error('AniList API disabled'));
    mockMetadataService.searchTMDB.mockImplementation(async (_query, mediaType) => {
      if (mediaType === 'tv_show') {
        return [
          {
            id: '94664',
            source: 'tmdb',
            title: 'Mushoku Tensei: Jobless Reincarnation',
            year: 2021,
            posterUrl: null,
            overview: 'Reincarnated in a new world...',
            romajiTitle: '無職転生 ～異世界行ったら本気だす～',
            englishTitle: 'Mushoku Tensei: Jobless Reincarnation',
          },
        ];
      }
      return [];
    });

    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userCookie },
      payload: {
        query: 'Mushoku Tensei',
        mediaType: 'anime',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.query).toBe('Mushoku Tensei');
    expect(body.mediaType).toBe('anime');
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0].title).toBe('Mushoku Tensei: Jobless Reincarnation');
    expect(body.candidates[0].source).toBe('tmdb');
  });

  it('reads tmdb_api_key from system_config when querying TMDB', async () => {
    // Insert custom TMDB API key in system_config
    app.db
      .insert(systemConfig)
      .values({ key: 'tmdb_api_key', value: 'custom_db_api_key' })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:123&dn=The.Batman',
        mediaType: 'movie',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(mockMetadataService.searchTMDB).toHaveBeenCalledWith(
      'The Batman',
      'movie',
      'custom_db_api_key'
    );
  });

  it('cleans title from torrentFileBase64 when no explicit query is provided', async () => {
    const { buffer } = createDummyTorrentBuffer('Inception.2010.1080p.BluRay.x264-SPARKS.mkv');
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userCookie },
      payload: {
        torrentFileBase64: buffer.toString('base64'),
        mediaType: 'movie',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.query).toBe('Inception 2010');
    expect(mockMetadataService.searchTMDB).toHaveBeenCalledWith(
      'Inception 2010',
      'movie',
      expect.anything()
    );
  });

  it('cleans title from magnetLink TV episode with scene tags when no explicit query is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:abc&dn=Crowned.in.a.Hundred.Days.S01E01.1080p.CR.WEB-DL.AAC2.0.H.264-BiOMA.mkv',
        mediaType: 'tv_show',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.query).toBe('Crowned in a Hundred Days');
    expect(mockMetadataService.searchTMDB).toHaveBeenCalledWith(
      'Crowned in a Hundred Days',
      'tv_show',
      expect.anything()
    );
  });
});