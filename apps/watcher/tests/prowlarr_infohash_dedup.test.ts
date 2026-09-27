import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatcherProwlarrService } from '../src/services/prowlarr';

describe('WatcherProwlarrService InfoHash Deduplication (apps/watcher)', () => {
  let service: WatcherProwlarrService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    service = new WatcherProwlarrService({
      prowlarrUrl: 'http://localhost:9696',
      apiKey: 'fake-api-key',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('extracts and normalizes infoHash from item payload and magnet URL', async () => {
    const mockResponses = [
      {
        title: 'Frieren Beyond Journeys End - 01 [1080p][x265]',
        downloadUrl: 'https://nyaa.si/download/123.torrent',
        infoHash: 'ABCDEF1234567890ABCDEF1234567890ABCDEF12',
        seeders: 15,
        indexer: 'Nyaa',
      },
      {
        title: 'Frieren Beyond Journeys End - 01 [1080p][x264]',
        magnetUrl: 'magnet:?xt=urn:btih:fedcba0987654321fedcba0987654321fedcba09&dn=Frieren',
        seeders: 5,
        indexer: 'AnimeTosho',
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponses,
    } as Response);

    const candidates = await service.executeSingleSearch('Frieren', [5070]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].infoHash).toBe('abcdef1234567890abcdef1234567890abcdef12');
    expect(candidates[1].infoHash).toBe('fedcba0987654321fedcba0987654321fedcba09');
  });

  it('deduplicates parallel query candidates matching infoHash, keeping higher score/seeders', async () => {
    const hash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    // Mock search returning the same torrent infoHash across two queries (e.g. S01E01 vs absolute 01)
    // Query 1: Lower seeders
    // Query 2: Higher seeders from another indexer
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            title: 'Frieren - S01E01 [1080p]',
            magnetUrl: `magnet:?xt=urn:btih:${hash}&dn=Frieren`,
            seeders: 10,
            indexer: 'IndexerA',
          },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            title: 'Frieren - S01E01 [1080p]',
            infoHash: hash.toUpperCase(),
            downloadUrl: 'https://indexer-b.org/download/456.torrent',
            seeders: 50,
            indexer: 'IndexerB',
          },
        ],
      } as Response);

    const candidates = await service.searchForEntry({
      mediaType: 'anime',
      title: 'Frieren',
      seasonNumber: 1,
      targetEpisode: 1,
    });

    // Should merge by normalized infoHash into 1 candidate
    expect(candidates).toHaveLength(1);
    expect(candidates[0].infoHash).toBe(hash);
    expect(candidates[0].seeders).toBe(50);
    expect(candidates[0].indexer).toBe('IndexerB');
  });

  it('falls back to guid or downloadUrl when infoHash is absent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          guid: 'guid-unique-1',
          title: 'Movie 2024 [1080p]',
          downloadUrl: 'https://torrent.org/1.torrent',
          seeders: 10,
        },
        {
          guid: 'guid-unique-1',
          title: 'Movie 2024 [1080p]',
          downloadUrl: 'https://torrent.org/1.torrent',
          seeders: 15,
        },
        {
          guid: 'guid-unique-2',
          title: 'Movie 2024 [720p]',
          downloadUrl: 'https://torrent.org/2.torrent',
          seeders: 20,
        },
      ],
    } as Response);

    const candidates = await service.searchForEntry({
      mediaType: 'movie',
      title: 'Movie',
      year: 2024,
    });

    expect(candidates).toHaveLength(2);
  });
});
