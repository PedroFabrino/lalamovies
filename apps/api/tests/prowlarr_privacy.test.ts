import { describe, it, expect, vi } from 'vitest';
import { ProwlarrService, hasPasskey } from '../src/services/prowlarr';

describe('Prowlarr Indexer Privacy & Airgap', () => {
  it('detects passkeys in announce URLs and magnet links', () => {
    expect(hasPasskey('magnet:?xt=urn:btih:123&tr=http://tracker.com/announce?passkey=abcdef1234567890')).toBe(true);
    expect(hasPasskey('magnet:?xt=urn:btih:123&tr=http://tracker.com/announce?authkey=abcdef1234567890')).toBe(true);
    expect(hasPasskey('http://tracker.com:2710/abcdef0123456789abcdef/announce')).toBe(true);
    expect(hasPasskey('magnet:?xt=urn:btih:123&tr=udp://tracker.opentrackr.org:1337/announce')).toBe(false);
    expect(hasPasskey('')).toBe(false);
  });

  it('queries /api/v1/indexer, caches privacy, and sets isPrivateTracker flag on candidates', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/indexer')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 1, name: '1337x', privacy: 'public' },
            { id: 2, name: 'TorrentLeech', privacy: 'private' },
          ],
        };
      }
      if (url.includes('/api/v1/search')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              guid: '1',
              title: 'Inception 2010 1080p BluRay x264',
              size: 5000000000,
              indexer: '1337x',
              indexerId: 1,
              seeders: 50,
              downloadUrl: 'magnet:?xt=urn:btih:public1',
            },
            {
              guid: '2',
              title: 'Inception 2010 1080p BluRay x264',
              size: 5000000000,
              indexer: 'TorrentLeech',
              indexerId: 2,
              seeders: 50,
              downloadUrl: 'magnet:?xt=urn:btih:private1',
            },
            {
              guid: '3',
              title: 'Inception 2010 1080p BluRay x264',
              size: 5000000000,
              indexer: 'UnknownTracker',
              seeders: 50,
              downloadUrl: 'magnet:?xt=urn:btih:private2&tr=http://tracker.com/announce?passkey=secret123',
            },
          ],
        };
      }
      return { ok: true, status: 200, json: async () => [] };
    });
    global.fetch = fetchMock;

    try {
      const service = new ProwlarrService('http://localhost:9696', 'test-key');
      const res = await service.searchMovieReleases('Inception', 2010);

      expect(res.candidates).toHaveLength(3);
      const publicItem = res.candidates.find((c) => c.guid === '1');
      const privateItem1 = res.candidates.find((c) => c.guid === '2');
      const privateItem2 = res.candidates.find((c) => c.guid === '3');

      expect(publicItem?.isPrivateTracker).toBe(false);
      expect(privateItem1?.isPrivateTracker).toBe(true);
      expect(privateItem2?.isPrivateTracker).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
