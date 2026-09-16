import { describe, it, expect, vi } from 'vitest';
import { JellyfinService, JellyfinApiError } from '../src/services/jellyfin';
import { buildApp } from '../src/app';
import { systemConfig } from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Jellyfin Private Library Management & Access Control', () => {
  it('discovers private library ID when present', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-movies' },
        { Name: 'Private', Locations: ['/media/private'], ItemId: 'lib-private-123' },
      ],
    });
    global.fetch = fetchMock;

    try {
      const service = new JellyfinService('http://localhost:8096', 'test-api-key');
      const id = await service.discoverPrivateLibraryId();
      expect(id).toBe('lib-private-123');
      expect(service.getPrivateLibraryId()).toBe('lib-private-123');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('returns null when private library is absent', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-movies' },
      ],
    });
    global.fetch = fetchMock;

    try {
      const service = new JellyfinService('http://localhost:8096', 'test-api-key');
      const id = await service.discoverPrivateLibraryId();
      expect(id).toBeNull();
      expect(service.getPrivateLibraryId()).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('handles soft failure in setUserLibraryAccess when private library not found', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-movies' },
      ],
    });
    global.fetch = fetchMock;

    try {
      const service = new JellyfinService('http://localhost:8096', 'test-api-key');
      // Should not throw
      await expect(service.setUserLibraryAccess('user-1', 'user')).resolves.toBeUndefined();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('restricts user role by removing private library and keeping other libraries', async () => {
    const originalFetch = global.fetch;
    let updatedPolicy: any = null;

    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/Library/VirtualFolders')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-movies' },
            { Name: 'Shows', Locations: ['/media/shows'], ItemId: 'lib-shows' },
            { Name: 'Private', Locations: ['/media/private'], ItemId: 'lib-private' },
          ],
        };
      }
      if (url.includes('/Users/user-123/Policy') && init?.method === 'POST') {
        updatedPolicy = JSON.parse(init.body as string);
        return { ok: true, status: 204 };
      }
      if (url.includes('/Users/user-123')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Id: 'user-123',
            Policy: {
              EnableAllFolders: true,
              EnabledFolders: [],
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    global.fetch = fetchMock;

    try {
      const service = new JellyfinService('http://localhost:8096', 'test-api-key');
      await service.setUserLibraryAccess('user-123', 'user');

      expect(updatedPolicy).toBeDefined();
      expect(updatedPolicy.EnableAllFolders).toBe(false);
      expect(updatedPolicy.EnabledFolders).toContain('lib-movies');
      expect(updatedPolicy.EnabledFolders).toContain('lib-shows');
      expect(updatedPolicy.EnabledFolders).not.toContain('lib-private');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('grants trusted role access to private library when folders were restricted', async () => {
    const originalFetch = global.fetch;
    let updatedPolicy: any = null;

    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/Library/VirtualFolders')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { Name: 'Movies', Locations: ['/media/movies'], ItemId: 'lib-movies' },
            { Name: 'Private', Locations: ['/media/private'], ItemId: 'lib-private' },
          ],
        };
      }
      if (url.includes('/Users/user-trusted/Policy') && init?.method === 'POST') {
        updatedPolicy = JSON.parse(init.body as string);
        return { ok: true, status: 204 };
      }
      if (url.includes('/Users/user-trusted')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Id: 'user-trusted',
            Policy: {
              EnableAllFolders: false,
              EnabledFolders: ['lib-movies'],
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    global.fetch = fetchMock;

    try {
      const service = new JellyfinService('http://localhost:8096', 'test-api-key');
      await service.setUserLibraryAccess('user-trusted', 'trusted');

      expect(updatedPolicy).toBeDefined();
      expect(updatedPolicy.EnableAllFolders).toBe(false);
      expect(updatedPolicy.EnabledFolders).toContain('lib-movies');
      expect(updatedPolicy.EnabledFolders).toContain('lib-private');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('populates jellyfin_private_library_id in systemConfig on app ready', async () => {
    const mockJellyfin = {
      authenticateUser: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      refreshLibrary: vi.fn(),
      discoverPrivateLibraryId: vi.fn().mockResolvedValue('ensured-private-id'),
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
      .where(eq(systemConfig.key, 'jellyfin_private_library_id'))
      .get();

    expect(row).toBeDefined();
    expect(row?.value).toBe('ensured-private-id');

    await app.close();
  });
});
