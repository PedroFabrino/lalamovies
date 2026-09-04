import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { users, downloadRequests, systemConfig } from '../src/db/schema';
import { IJellyfinService, JellyfinAuthResult } from '../src/services/jellyfin';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { DownloadRequest } from '../src/db/schema';

class MockJellyfinService implements IJellyfinService {
  async authenticateUser(username: string): Promise<JellyfinAuthResult> {
    return {
      accessToken: 'mock_token',
      userId: `jf_${username}`,
      username,
      isAdmin: username === 'admin_alice',
    };
  }
  async createUser(): Promise<string> {
    return 'jf_mock_created';
  }
  async deleteUser(): Promise<void> {}
  async refreshLibrary(): Promise<void> {}
  async getPlayHistory(): Promise<Record<string, string>> {
    return {};
  }
}

class MockQBittorrentService implements IQBittorrentService {
  public removedTorrents: { hash: string; deleteFiles?: boolean }[] = [];

  async addTorrent(): Promise<string> {
    return 'mock_hash';
  }
  async getActiveTorrentCount(): Promise<number> {
    return 0;
  }
  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    return {
      hash,
      name: 'Test Torrent',
      progress: 1,
      dlspeed: 0,
      eta: 0,
      state: 'seeding',
      size: 1000,
    };
  }
  async removeTorrent(hash: string, deleteFiles?: boolean): Promise<void> {
    this.removedTorrents.push({ hash, deleteFiles });
  }
}

class MockCleanupService implements ICleanupService {
  public cleanItemCalledWith: string[] = [];
  public checkDiskAndCleanCalled = false;
  public candidatesList: DownloadRequest[] = [];

  isSpaceSufficient(): SpaceCheckResult {
    return { sufficient: true, percentFree: 50, threshold: 15 };
  }

  async cleanItem(requestId: string): Promise<void> {
    this.cleanItemCalledWith.push(requestId);
  }

  async checkDiskAndClean(): Promise<DownloadRequest[]> {
    this.checkDiskAndCleanCalled = true;
    return [];
  }

  async getCandidates(): Promise<DownloadRequest[]> {
    return this.candidatesList;
  }
}

describe('Admin REST Endpoints (Ticket 10)', () => {
  let app: FastifyInstance;
  let mockCleanup: MockCleanupService;
  let adminCookie: string;
  let userCookie: string;
  let adminId: string;
  let regularUserId: string;

  beforeEach(async () => {
    mockCleanup = new MockCleanupService();

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: new MockQBittorrentService(),
      cleanupService: mockCleanup,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    // 1. Create first user -> Alice (promoted to admin automatically)
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_alice', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;
    adminId = JSON.parse(adminRes.payload).user.id;

    // 2. Create second user -> Bob (standard user)
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'user_bob', password: 'password123' },
    });
    userCookie = userRes.cookies[0].value;
    regularUserId = JSON.parse(userRes.payload).user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Authorization & Role Guard (adminGuard)', () => {
    it('returns 401 when calling admin routes unauthenticated', async () => {
      const endpoints = [
        { method: 'GET', url: '/admin/users' },
        { method: 'PATCH', url: `/admin/users/${regularUserId}/role` },
        { method: 'DELETE', url: `/admin/users/${regularUserId}` },
        { method: 'GET', url: '/admin/config' },
        { method: 'PUT', url: '/admin/config' },
        { method: 'POST', url: '/admin/cleanup' },
        { method: 'POST', url: '/admin/cleanup/req_1' },
        { method: 'GET', url: '/admin/cleanup/candidates' },
      ];

      for (const ep of endpoints) {
        const res = await app.inject({
          method: ep.method as any,
          url: ep.url,
        });
        expect(res.statusCode).toBe(401);
      }
    });

    it('returns 403 when calling admin routes as a non-admin user', async () => {
      const endpoints = [
        { method: 'GET', url: '/admin/users' },
        { method: 'PATCH', url: `/admin/users/${regularUserId}/role`, payload: { role: 'admin' } },
        { method: 'DELETE', url: `/admin/users/${regularUserId}` },
        { method: 'GET', url: '/admin/config' },
        { method: 'PUT', url: '/admin/config', payload: { concurrent_limit: 3 } },
        { method: 'POST', url: '/admin/cleanup' },
        { method: 'POST', url: '/admin/cleanup/req_1' },
        { method: 'GET', url: '/admin/cleanup/candidates' },
      ];

      for (const ep of endpoints) {
        const res = await app.inject({
          method: ep.method as any,
          url: ep.url,
          cookies: { token: userCookie },
          payload: ep.payload,
        });
        expect(res.statusCode).toBe(403);
      }
    });
  });

  describe('User Management Endpoints', () => {
    it('GET /admin/users returns all users with id, username, email, role, createdAt', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/users',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.users).toBeInstanceOf(Array);
      expect(data.users.length).toBe(2);

      const alice = data.users.find((u: any) => u.username === 'admin_alice');
      const bob = data.users.find((u: any) => u.username === 'user_bob');

      expect(alice).toMatchObject({
        id: adminId,
        username: 'admin_alice',
        role: 'admin',
      });
      expect(bob).toMatchObject({
        id: regularUserId,
        username: 'user_bob',
        role: 'user',
      });
    });

    it('PATCH /admin/users/:id/role promotes user to admin', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${regularUserId}/role`,
        cookies: { token: adminCookie },
        payload: { role: 'admin' },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.user.role).toBe('admin');

      const inDb = app.db.select().from(users).where(eq(users.id, regularUserId)).get();
      expect(inDb?.role).toBe('admin');
    });

    it('PATCH /admin/users/:id/role demotes admin to user', async () => {
      // First promote bob
      app.db.update(users).set({ role: 'admin' }).where(eq(users.id, regularUserId)).run();

      const res = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${regularUserId}/role`,
        cookies: { token: adminCookie },
        payload: { role: 'user' },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.user.role).toBe('user');

      const inDb = app.db.select().from(users).where(eq(users.id, regularUserId)).get();
      expect(inDb?.role).toBe('user');
    });

    it('PATCH /admin/users/:id/role prevents admin from demoting self', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${adminId}/role`,
        cookies: { token: adminCookie },
        payload: { role: 'user' },
      });

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res.payload);
      expect(data.message).toContain('Cannot demote yourself');

      const inDb = app.db.select().from(users).where(eq(users.id, adminId)).get();
      expect(inDb?.role).toBe('admin');
    });

    it('PATCH /admin/users/:id/role returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/admin/users/non_existent_id/role',
        cookies: { token: adminCookie },
        payload: { role: 'admin' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('PATCH /admin/users/:id/role returns 400 for invalid role', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${regularUserId}/role`,
        cookies: { token: adminCookie },
        payload: { role: 'super_admin' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('DELETE /admin/users/:id removes user record from DB', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/admin/users/${regularUserId}`,
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.ok).toBe(true);

      const inDb = app.db.select().from(users).where(eq(users.id, regularUserId)).get();
      expect(inDb).toBeUndefined();
    });

    it('DELETE /admin/users/:id prevents admin from deleting self', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/admin/users/${adminId}`,
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res.payload);
      expect(data.message).toContain('Cannot delete yourself');

      const inDb = app.db.select().from(users).where(eq(users.id, adminId)).get();
      expect(inDb).toBeDefined();
    });

    it('DELETE /admin/users/:id returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/admin/users/fake_id',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('System Configuration Endpoints', () => {
    it('GET /admin/config returns all system_config pairs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/config',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.config).toMatchObject({
        concurrent_limit: '2',
        disk_warn_threshold: '20',
        disk_reject_threshold: '15',
      });
    });

    it('PUT /admin/config updates partial configuration and returns new config', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/admin/config',
        cookies: { token: adminCookie },
        payload: {
          concurrent_limit: 4,
          disk_warn_threshold: 25,
          tmdb_api_key: 'custom_tmdb_key_xyz',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.config.concurrent_limit).toBe('4');
      expect(data.config.disk_warn_threshold).toBe('25');
      expect(data.config.tmdb_api_key).toBe('custom_tmdb_key_xyz');

      // Verify in DB
      const row = app.db.select().from(systemConfig).where(eq(systemConfig.key, 'concurrent_limit')).get();
      expect(row?.value).toBe('4');
    });

    it('PUT /admin/config validates numeric thresholds (positive integers, limit >= 1)', async () => {
      // concurrent_limit < 1
      const res1 = await app.inject({
        method: 'PUT',
        url: '/admin/config',
        cookies: { token: adminCookie },
        payload: { concurrent_limit: 0 },
      });
      expect(res1.statusCode).toBe(400);

      // disk_warn_threshold negative
      const res2 = await app.inject({
        method: 'PUT',
        url: '/admin/config',
        cookies: { token: adminCookie },
        payload: { disk_warn_threshold: -10 },
      });
      expect(res2.statusCode).toBe(400);

      // disk_reject_threshold > 100
      const res3 = await app.inject({
        method: 'PUT',
        url: '/admin/config',
        cookies: { token: adminCookie },
        payload: { disk_reject_threshold: 150 },
      });
      expect(res3.statusCode).toBe(400);
    });
  });

  describe('Cleanup Controls Endpoints', () => {
    it('POST /admin/cleanup triggers checkDiskAndClean immediately and returns scheduled list', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/admin/cleanup',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.scheduled).toBeInstanceOf(Array);
      expect(mockCleanup.checkDiskAndCleanCalled).toBe(true);
    });

    it('POST /admin/cleanup/:requestId triggers cleanItem immediately', async () => {
      // Insert a request
      app.db.insert(downloadRequests).values({
        id: 'req_to_clean',
        userId: adminId,
        magnetLink: 'magnet:clean_me',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '1',
        metadataSource: 'tmdb',
        title: 'Movie To Clean',
        requestedAt: '2026-01-01T00:00:00Z',
        keepFlag: false,
        scheduledDeleteAt: null,
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/admin/cleanup/req_to_clean',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.ok).toBe(true);
      expect(mockCleanup.cleanItemCalledWith).toContain('req_to_clean');
    });

    it('POST /admin/cleanup/:requestId returns 404 for non-existent request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/admin/cleanup/non_existent_req',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(404);
    });

    it('GET /admin/cleanup/candidates returns candidates from cleanup service', async () => {
      mockCleanup.candidatesList = [
        {
          id: 'req_cand_1',
          userId: adminId,
          magnetLink: 'magnet:1',
          mediaType: 'movie',
          status: 'seeding',
          metadataId: '1',
          metadataSource: 'tmdb',
          title: 'Candidate Movie',
          requestedAt: '2026-01-01T00:00:00Z',
          lastPlayedAt: null,
          scheduledDeleteAt: null,
          keepFlag: false,
          year: 2020,
          seasonNumber: null,
          jellyfinPath: null,
          qbTorrentHash: null,
          errorMessage: null,
          downloadedAt: null,
          sizeBytes: 100,
        },
      ];

      const res = await app.inject({
        method: 'GET',
        url: '/admin/cleanup/candidates',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.candidates).toBeInstanceOf(Array);
      expect(data.candidates.length).toBe(1);
      expect(data.candidates[0].title).toBe('Candidate Movie');
    });
  });
});
