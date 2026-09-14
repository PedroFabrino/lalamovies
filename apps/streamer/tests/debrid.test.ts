import { describe, it, expect, vi } from 'vitest';
import { DebridService } from '../src/services/debrid';
import { buildStreamerApp } from '../src/app';

describe('Real-Debrid Client & Cache Check', () => {
  it('checkCache queries instantAvailability and parses cached status', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        hash1: {
          rd: [{ 1: { filename: 'file1.mkv', filesize: 1000 } }],
        },
        hash2: {
          rd: [],
        },
      }),
    });
    global.fetch = fetchMock;

    try {
      const service = new DebridService('test-rd-key');
      const results = await service.checkCache(['hash1', 'hash2', 'hash3']);

      expect(results).toEqual({
        hash1: true,
        hash2: false,
        hash3: false,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.real-debrid.com/rest/1.0/torrents/instantAvailability/hash1/hash2/hash3',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-rd-key',
          }),
        })
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('retries on HTTP 429 rate limits with backoff', async () => {
    const originalFetch = global.fetch;
    let attempts = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ 'retry-after': '0' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          cachedhash: { rd: [{ 1: { filename: 'cached.mkv', filesize: 500 } }] },
        }),
      };
    });
    global.fetch = fetchMock;

    try {
      const service = new DebridService('test-rd-key');
      const results = await service.checkCache(['cachedhash']);

      expect(attempts).toBe(3);
      expect(results.cachedhash).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('handles addMagnet, selectFiles, getTorrentInfo, getUnrestrictedLinks, deleteTorrent', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/torrents/addMagnet')) {
        return { ok: true, status: 200, json: async () => ({ id: 'torrent-123' }) };
      }
      if (url.includes('/torrents/selectFiles/torrent-123')) {
        return { ok: true, status: 204 };
      }
      if (url.includes('/torrents/info/torrent-123')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'torrent-123',
            filename: 'Movie.2024.1080p',
            status: 'downloaded',
            progress: 100,
            links: ['https://real-debrid.com/d/link1'],
          }),
        };
      }
      if (url.includes('/unrestrict/link')) {
        return { ok: true, status: 200, json: async () => ({ download: 'https://download.rd.com/file.mkv' }) };
      }
      if (url.includes('/torrents/delete/torrent-123')) {
        return { ok: true, status: 204 };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    global.fetch = fetchMock;

    try {
      const service = new DebridService('test-rd-key');
      const id = await service.addMagnet('magnet:?xt=urn:btih:123');
      expect(id).toBe('torrent-123');

      await service.selectFiles(id);

      const info = await service.getTorrentInfo(id);
      expect(info.status).toBe('downloaded');

      const links = await service.getUnrestrictedLinks(id);
      expect(links).toEqual(['https://download.rd.com/file.mkv']);

      await service.deleteTorrent(id);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('GET /streams/cache-check route returns cache status per hash', async () => {
    const mockDebrid = {
      checkCache: vi.fn().mockResolvedValue({
        hasha: true,
        hashb: false,
      }),
      addMagnet: vi.fn(),
      selectFiles: vi.fn(),
      getTorrentInfo: vi.fn(),
      getUnrestrictedLinks: vi.fn(),
      deleteTorrent: vi.fn(),
    };

    const app = buildStreamerApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-key',
      debridService: mockDebrid as any,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/streams/cache-check?hashes=hasha,hashb',
      headers: {
        'x-service-key': 'test-key',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      cached: {
        hasha: true,
        hashb: false,
      },
    });
    expect(mockDebrid.checkCache).toHaveBeenCalledWith(['hasha', 'hashb']);

    await app.close();
  });
});
