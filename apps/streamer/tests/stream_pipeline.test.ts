import { describe, it, expect, vi } from 'vitest';
import { buildStreamerApp } from '../src/app';
import { StreamPoller } from '../src/jobs/streamPoller';
import { ephemeralStreams } from '../src/db';
import { eq } from 'drizzle-orm';

describe('End-to-End Stream Pipeline (#51)', () => {
  it('POST /streams creates pending stream and StreamPoller updates to ready', async () => {
    const mockDebrid = {
      checkCache: vi.fn(),
      addMagnet: vi.fn().mockResolvedValue('debrid-torrent-456'),
      selectFiles: vi.fn().mockResolvedValue(undefined),
      getTorrentInfo: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'debrid-torrent-456',
          filename: 'Dune.Part.Two.2024',
          status: 'downloading',
          progress: 50,
          links: [],
        })
        .mockResolvedValue({
          id: 'debrid-torrent-456',
          filename: 'Dune.Part.Two.2024',
          status: 'downloaded',
          progress: 100,
          links: ['https://rd.com/link'],
        }),
      getUnrestrictedLinks: vi.fn(),
      deleteTorrent: vi.fn(),
    };

    const mockJellyfin = {
      ensureStreamLibrary: vi.fn().mockResolvedValue('stream-lib-1'),
      refreshStreamLibrary: vi.fn().mockResolvedValue(undefined),
      getActiveSessions: vi.fn().mockResolvedValue([]),
      findItemByPath: vi.fn().mockResolvedValue('jellyfin-item-dune'),
    };

    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock;

    try {
      const app = buildStreamerApp({
        dbPath: ':memory:',
        serviceApiKey: 'test-key',
        debridService: mockDebrid as any,
        jellyfinService: mockJellyfin as any,
      });

      // 1. POST /streams
      const postRes = await app.inject({
        method: 'POST',
        url: '/streams',
        headers: {
          'x-service-key': 'test-key',
          'x-user-id': 'user-123',
          'content-type': 'application/json',
        },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:dune2hash1234567890',
          title: 'Dune: Part Two (2024)',
        },
      });

      expect(postRes.statusCode).toBe(201);
      const postData = postRes.json();
      expect(postData.status).toBe('pending');
      expect(postData.streamId).toBeDefined();

      const streamId = postData.streamId;

      // Check DB initial state
      const initialRow = app.db
        .select()
        .from(ephemeralStreams)
        .where(eq(ephemeralStreams.id, streamId))
        .get();
      expect(initialRow).toBeDefined();
      expect(initialRow?.userId).toBe('user-123');
      expect(initialRow?.status).toBe('pending');

      // 2. Run StreamPoller explicitly to test transitions
      const poller = new StreamPoller({
        db: app.db,
        debrid: mockDebrid as any,
        jellyfin: mockJellyfin as any,
        mainApiUrl: 'http://localhost:3000',
        serviceApiKey: 'test-key',
        pollIntervalMs: 10,
        maxPollTimeMs: 1000,
      });

      await poller.poll(streamId);

      // Verify updated DB state
      const readyRow = app.db
        .select()
        .from(ephemeralStreams)
        .where(eq(ephemeralStreams.id, streamId))
        .get();
      expect(readyRow?.status).toBe('ready');
      expect(readyRow?.jellyfinItemId).toBe('jellyfin-item-dune');

      // Verify Jellyfin refresh was called
      expect(mockJellyfin.refreshStreamLibrary).toHaveBeenCalled();

      // Verify broadcast to main API
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/broadcast',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-service-key': 'test-key',
          }),
        })
      );

      // 3. GET /streams returns active streams with time remaining
      const getRes = await app.inject({
        method: 'GET',
        url: '/streams',
        headers: {
          'x-service-key': 'test-key',
          'x-user-id': 'user-123',
        },
      });

      expect(getRes.statusCode).toBe(200);
      const getData = getRes.json();
      expect(getData.streams).toHaveLength(1);
      expect(getData.streams[0].id).toBe(streamId);
      expect(getData.streams[0].status).toBe('ready');
      expect(getData.streams[0].timeRemainingSeconds).toBeGreaterThan(80000); // close to 86400

      await app.close();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
