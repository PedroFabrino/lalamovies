import { describe, it, expect, vi } from 'vitest';
import { StreamerJellyfinService } from '../src/services/jellyfin';
import { buildStreamerApp } from '../src/app';
import { initStreamerDatabase, systemConfig } from '../src/db';
import { eq } from 'drizzle-orm';

describe('Streamer Jellyfin Client', () => {
  it('ensureStreamLibrary discovers existing library and persists ID', async () => {
    const { db, sqlite } = initStreamerDatabase(':memory:');
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-1' },
        { Name: 'Stream', Locations: ['/media_data/stream'], ItemId: 'stream-id-999' },
      ],
    });
    global.fetch = fetchMock;

    try {
      const service = new StreamerJellyfinService({
        baseUrl: 'http://localhost:8096',
        apiKey: 'test-key',
        db,
      });

      const id = await service.ensureStreamLibrary();
      expect(id).toBe('stream-id-999');

      const saved = db.select().from(systemConfig).where(eq(systemConfig.key, 'stream_library_id')).get();
      expect(saved?.value).toBe('stream-id-999');
    } finally {
      global.fetch = originalFetch;
      sqlite.close();
    }
  });

  it('refreshStreamLibrary targets Stream library when ID is stored', async () => {
    const { db, sqlite } = initStreamerDatabase(':memory:');
    db.insert(systemConfig).values({ key: 'stream_library_id', value: 'stream-id-999' }).run();

    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock;

    try {
      const service = new StreamerJellyfinService({
        baseUrl: 'http://localhost:8096',
        apiKey: 'test-key',
        db,
      });

      await service.refreshStreamLibrary();
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8096/Items/stream-id-999/Refresh',
        expect.objectContaining({ method: 'POST' })
      );
    } finally {
      global.fetch = originalFetch;
      sqlite.close();
    }
  });

  it('getActiveSessions filters only sessions with active NowPlayingItem', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { Id: 's1', UserName: 'alice', NowPlayingItem: { Id: 'item-100', Name: 'Matrix' } },
        { Id: 's2', UserName: 'bob' },
      ],
    });
    global.fetch = fetchMock;

    try {
      const service = new StreamerJellyfinService({
        baseUrl: 'http://localhost:8096',
        apiKey: 'test-key',
      });

      const sessions = await service.getActiveSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].NowPlayingItem?.Id).toBe('item-100');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('findItemByPath finds matching item ID by path', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Items: [
          { Id: 'item-1', Path: '/media/movies/Avatar (2009)/Avatar.mkv' },
          { Id: 'item-stream-1', Path: '/media_data/stream/Inception.2010.mkv' },
        ],
      }),
    });
    global.fetch = fetchMock;

    try {
      const service = new StreamerJellyfinService({
        baseUrl: 'http://localhost:8096',
        apiKey: 'test-key',
      });

      const id = await service.findItemByPath('/media_data/stream/Inception.2010.mkv');
      expect(id).toBe('item-stream-1');

      // Matching with spaced title vs dot-separated filename
      const idClean = await service.findItemByPath('Inception 2010');
      expect(idClean).toBe('item-stream-1');

      const notFound = await service.findItemByPath('/media_data/stream/Unknown.mkv');
      expect(notFound).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('injects custom jellyfinService into buildStreamerApp', async () => {
    const mockJellyfin = {
      ensureStreamLibrary: vi.fn().mockResolvedValue('mock-lib'),
      refreshStreamLibrary: vi.fn(),
      getActiveSessions: vi.fn().mockResolvedValue([]),
      findItemByPath: vi.fn().mockResolvedValue('mock-id'),
    };

    const app = buildStreamerApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-key',
      jellyfinService: mockJellyfin as any,
    });

    expect(app.jellyfin).toBe(mockJellyfin);
    const item = await app.jellyfin.findItemByPath('foo');
    expect(item).toBe('mock-id');

    await app.close();
  });
});
