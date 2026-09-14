import { describe, it, expect, vi } from 'vitest';
import { JellyfinService } from '../src/services/jellyfin';
import { buildApp } from '../src/app';
import { systemConfig } from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Jellyfin Stream Library Management', () => {
  it('returns existing Stream library ID without creating duplicate', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-1' },
        { Name: 'Stream', Locations: ['/media_data/stream'], ItemId: 'stream-id-123' },
      ],
    });
    global.fetch = fetchMock;

    try {
      const service = new JellyfinService('http://localhost:8096', 'test-api-key');
      const id = await service.ensureStreamLibrary();
      expect(id).toBe('stream-id-123');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('creates Stream library when absent and returns new ItemId', async () => {
    const originalFetch = global.fetch;
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      callCount++;
      if (init?.method === 'POST') {
        return { ok: true, status: 200 };
      }
      if (callCount === 1) {
        // Initial list check: no stream library
        return {
          ok: true,
          status: 200,
          json: async () => [{ Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-1' }],
        };
      }
      // Re-fetch after creation
      return {
        ok: true,
        status: 200,
        json: async () => [
          { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-1' },
          { Name: 'Stream', Locations: ['/media_data/stream'], ItemId: 'newly-created-id' },
        ],
      };
    });
    global.fetch = fetchMock;

    try {
      const service = new JellyfinService('http://localhost:8096', 'test-api-key');
      const id = await service.ensureStreamLibrary();
      expect(id).toBe('newly-created-id');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('populates stream_library_id in systemConfig on app ready', async () => {
    const mockJellyfin = {
      authenticateUser: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      refreshLibrary: vi.fn(),
      ensureStreamLibrary: vi.fn().mockResolvedValue('ensured-stream-id'),
    };

    const app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      jellyfinService: mockJellyfin as any,
    });

    await app.ready();

    const row = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'stream_library_id'))
      .get();

    expect(row).toBeDefined();
    expect(row?.value).toBe('ensured-stream-id');

    await app.close();
  });
});
