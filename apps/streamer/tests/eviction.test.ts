import { describe, it, expect, vi } from 'vitest';
import { buildStreamerApp } from '../src/app';
import { EphemeralEvictionCron } from '../src/jobs/ephemeralEvictionCron';
import { ephemeralStreams } from '../src/db';
import { eq } from 'drizzle-orm';

describe('24-Hour Eviction Worker (#52)', () => {
  it('defers eviction when stream is actively playing in Jellyfin, evicts when idle', async () => {
    const mockDebrid = {
      checkCache: vi.fn(),
      addMagnet: vi.fn(),
      selectFiles: vi.fn(),
      getTorrentInfo: vi.fn(),
      getUnrestrictedLinks: vi.fn(),
      deleteTorrent: vi.fn().mockResolvedValue(undefined),
    };

    const mockJellyfin = {
      ensureStreamLibrary: vi.fn(),
      refreshStreamLibrary: vi.fn().mockResolvedValue(undefined),
      getActiveSessions: vi.fn().mockResolvedValue([
        { Id: 'session-1', NowPlayingItem: { Id: 'jellyfin-active-stream' } },
      ]),
      findItemByPath: vi.fn(),
    };

    const app = buildStreamerApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-key',
      debridService: mockDebrid as any,
      jellyfinService: mockJellyfin as any,
    });

    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();

    // Insert 2 expired ready streams: one actively playing, one idle
    app.db
      .insert(ephemeralStreams)
      .values([
        {
          id: 'stream-active',
          userId: 'u1',
          debridTorrentId: 'rd-active',
          magnetLink: 'mag1',
          title: 'Movie Active',
          status: 'ready',
          expiresAt: pastDate,
          jellyfinItemId: 'jellyfin-active-stream',
          createdAt: pastDate,
        },
        {
          id: 'stream-idle',
          userId: 'u2',
          debridTorrentId: 'rd-idle',
          magnetLink: 'mag2',
          title: 'Movie Idle',
          status: 'ready',
          expiresAt: pastDate,
          jellyfinItemId: 'jellyfin-idle-stream',
          createdAt: pastDate,
        },
      ])
      .run();

    const cron = new EphemeralEvictionCron({
      db: app.db,
      debrid: mockDebrid as any,
      jellyfin: mockJellyfin as any,
    });

    // Run eviction cycle
    const result = await cron.evictExpired();

    expect(result.deferred).toEqual(['stream-active']);
    expect(result.evicted).toEqual(['stream-idle']);

    // Check DB statuses
    const activeRow = app.db
      .select()
      .from(ephemeralStreams)
      .where(eq(ephemeralStreams.id, 'stream-active'))
      .get();
    expect(activeRow?.status).toBe('ready'); // Kept ready!

    const idleRow = app.db
      .select()
      .from(ephemeralStreams)
      .where(eq(ephemeralStreams.id, 'stream-idle'))
      .get();
    expect(idleRow?.status).toBe('expired'); // Cleaned up!

    // Verify Real-Debrid and Jellyfin interactions
    expect(mockDebrid.deleteTorrent).toHaveBeenCalledWith('rd-idle');
    expect(mockDebrid.deleteTorrent).not.toHaveBeenCalledWith('rd-active');
    expect(mockJellyfin.refreshStreamLibrary).toHaveBeenCalled();

    await app.close();
  });

  it('admin route DELETE /streams/:id performs immediate eviction', async () => {
    const mockDebrid = {
      checkCache: vi.fn(),
      addMagnet: vi.fn(),
      selectFiles: vi.fn(),
      getTorrentInfo: vi.fn(),
      getUnrestrictedLinks: vi.fn(),
      deleteTorrent: vi.fn().mockResolvedValue(undefined),
    };

    const mockJellyfin = {
      ensureStreamLibrary: vi.fn(),
      refreshStreamLibrary: vi.fn().mockResolvedValue(undefined),
      getActiveSessions: vi.fn().mockResolvedValue([]),
      findItemByPath: vi.fn(),
    };

    const app = buildStreamerApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-key',
      debridService: mockDebrid as any,
      jellyfinService: mockJellyfin as any,
    });

    const now = new Date().toISOString();
    app.db
      .insert(ephemeralStreams)
      .values({
        id: 'stream-manual',
        userId: 'u1',
        debridTorrentId: 'rd-manual',
        magnetLink: 'mag',
        title: 'Manual Movie',
        status: 'ready',
        expiresAt: now,
        createdAt: now,
      })
      .run();

    // 1. Regular user gets 403
    const userRes = await app.inject({
      method: 'DELETE',
      url: '/streams/stream-manual',
      headers: {
        'x-service-key': 'test-key',
        'x-user-id': 'u1',
        'x-user-role': 'user',
      },
    });
    expect(userRes.statusCode).toBe(403);

    // 2. Admin gets 200 and triggers immediate eviction
    const adminRes = await app.inject({
      method: 'DELETE',
      url: '/streams/stream-manual',
      headers: {
        'x-service-key': 'test-key',
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
      },
    });
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.json()).toEqual({ ok: true, evicted: 'stream-manual' });

    const row = app.db
      .select()
      .from(ephemeralStreams)
      .where(eq(ephemeralStreams.id, 'stream-manual'))
      .get();
    expect(row?.status).toBe('expired');
    expect(mockDebrid.deleteTorrent).toHaveBeenCalledWith('rd-manual');

    await app.close();
  });
});
