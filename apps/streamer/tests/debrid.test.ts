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

  it('addTorrent sends PUT request with torrent buffer to /torrents/addTorrent', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/torrents/addTorrent') && init?.method === 'PUT') {
        return { ok: true, status: 201, json: async () => ({ id: 'torrent-buf-1' }) };
      }
      return { ok: false, status: 400 };
    });
    global.fetch = fetchMock;

    try {
      const service = new DebridService('test-rd-key');
      const fakeBuffer = Buffer.from('d8:announce12:http://test.come');
      const id = await service.addTorrent(fakeBuffer);
      expect(id).toBe('torrent-buf-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.real-debrid.com/rest/1.0/torrents/addTorrent',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-bittorrent',
          }),
        })
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('resolveAndAdd resolves HTTP redirect to magnet link and adds it', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === 'http://prowlarr:9696/download') {
        return {
          status: 301,
          headers: new Headers({
            location: 'magnet:?xt=urn:btih:resolved12345&dn=Test',
          }),
        };
      }
      if (url.includes('/torrents/addMagnet')) {
        return { ok: true, status: 201, json: async () => ({ id: 'rd-resolved-1' }) };
      }
      return { ok: false, status: 404 };
    });
    global.fetch = fetchMock;

    try {
      const service = new DebridService('test-rd-key');
      const res = await service.resolveAndAdd('http://prowlarr:9696/download');
      expect(res.id).toBe('rd-resolved-1');
      expect(res.resolvedMagnet).toBe('magnet:?xt=urn:btih:resolved12345&dn=Test');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('resolveAndAdd downloads .torrent file from HTTP URL and adds via addTorrent', async () => {
    const originalFetch = global.fetch;
    const fakeTorrentBuffer = Buffer.from('d8:announce12:http://test.come');
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === 'http://prowlarr:9696/download-torrent') {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/x-bittorrent' }),
          arrayBuffer: async () => fakeTorrentBuffer.buffer,
        };
      }
      if (url.includes('/torrents/addTorrent') && init?.method === 'PUT') {
        return { ok: true, status: 201, json: async () => ({ id: 'rd-torrent-file-1' }) };
      }
      return { ok: false, status: 404 };
    });
    global.fetch = fetchMock;

    try {
      const service = new DebridService('test-rd-key');
      const res = await service.resolveAndAdd(
        'http://prowlarr:9696/download-torrent',
        'testhash123',
        'My Title'
      );
      expect(res.id).toBe('rd-torrent-file-1');
      expect(res.resolvedMagnet).toBe('magnet:?xt=urn:btih:testhash123&dn=My%20Title');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
