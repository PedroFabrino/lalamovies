import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { users, downloadRequests } from '../src/db/schema';
import { IJellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService } from '../src/services/qbittorrent';

class MockJellyfinService implements IJellyfinService {
  async authenticateUser(username: string) {
    return {
      accessToken: `token_${username}`,
      userId: `jf_${username}`,
      username,
      isAdmin: username === 'admin_user',
    };
  }
  async createUser(username: string) {
    return `jf_${username}`;
  }
  async deleteUser() {}
}

class MockQBittorrentService implements IQBittorrentService {
  async addTorrent() {
    return 'mock_hash_123';
  }
  async getActiveTorrentCount() {
    return 0;
  }
}

class MockCleanupService {
  isSpaceSufficient() {
    return { sufficient: true, percentFree: 50, threshold: 15 };
  }
  isHostDiskSafe() {
    return true;
  }
  async cleanItem() {}
}

describe('Private Requests & Invisibility Guards', () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let trustedCookieA: string;
  let trustedCookieB: string;
  let userCookie: string;

  let adminUser: any;
  let trustedUserA: any;
  let trustedUserB: any;
  let regularUser: any;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: new MockQBittorrentService(),
      cleanupService: new MockCleanupService() as any,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    await app.ready();

    // Create users directly in DB
    adminUser = {
      id: 'admin_1',
      username: 'admin',
      role: 'admin' as const,
      jellyfinUserId: 'jf_admin_1',
      createdAt: new Date().toISOString(),
    };
    trustedUserA = {
      id: 'trusted_a',
      username: 'trusted_alice',
      role: 'trusted' as const,
      jellyfinUserId: 'jf_trusted_a',
      createdAt: new Date().toISOString(),
    };
    trustedUserB = {
      id: 'trusted_b',
      username: 'trusted_bob',
      role: 'trusted' as const,
      jellyfinUserId: 'jf_trusted_b',
      createdAt: new Date().toISOString(),
    };
    regularUser = {
      id: 'user_1',
      username: 'charlie',
      role: 'user' as const,
      jellyfinUserId: 'jf_user_1',
      createdAt: new Date().toISOString(),
    };

    app.db.insert(users).values([adminUser, trustedUserA, trustedUserB, regularUser]).run();

    adminCookie = app.jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
    trustedCookieA = app.jwt.sign({ id: trustedUserA.id, username: trustedUserA.username, role: trustedUserA.role });
    trustedCookieB = app.jwt.sign({ id: trustedUserB.id, username: trustedUserB.username, role: trustedUserB.role });
    userCookie = app.jwt.sign({ id: regularUser.id, username: regularUser.username, role: regularUser.role });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /requests & POST /requests/batch', () => {
    it('rejects private request from regular user with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: userCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:private1',
          mediaType: 'private',
          metadataId: '101',
          metadataSource: 'tmdb',
          title: 'Private Movie',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().message).toContain('Only trusted or admin users');
    });

    it('rejects private request with non-tmdb source with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: trustedCookieA },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:private1',
          mediaType: 'private',
          metadataId: '101',
          metadataSource: 'anilist',
          title: 'Private Anime',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('Private requests only support TMDB');
    });

    it('allows trusted user to create private request and forces keepFlag = true', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: trustedCookieA },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:private1',
          mediaType: 'private',
          metadataId: '101',
          metadataSource: 'tmdb',
          title: 'Private Movie',
        },
      });

      expect(res.statusCode).toBe(201);
      const req = res.json().request;
      expect(req.mediaType).toBe('private');
      expect(req.keepFlag).toBe(true);

      const dbReq = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, req.id)).get();
      expect(dbReq?.keepFlag).toBe(true);
    });

    it('rejects batch private request from regular user with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests/batch',
        cookies: { token: userCookie },
        payload: {
          mediaType: 'private',
          metadataId: '101',
          metadataSource: 'tmdb',
          title: 'Batch Private',
          items: [{ magnetLink: 'magnet:?xt=urn:btih:item1' }],
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Invisibility in GET /requests, /exists, and /:id', () => {
    let privateReqA: any;
    let publicReq: any;

    beforeEach(async () => {
      // Create one public request by regular user
      const pubRes = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: userCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:pub1',
          mediaType: 'movie',
          metadataId: '200',
          metadataSource: 'tmdb',
          title: 'Public Movie',
        },
      });
      publicReq = pubRes.json().request;

      // Create one private request by trusted user A
      const privRes = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: trustedCookieA },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:privA',
          mediaType: 'private',
          metadataId: '300',
          metadataSource: 'tmdb',
          title: 'Secret Movie',
        },
      });
      privateReqA = privRes.json().request;
    });

    it('regular user sees only public requests in GET /requests', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: userCookie },
      });

      expect(res.statusCode).toBe(200);
      const requests = res.json().requests;
      expect(requests.some((r: any) => r.id === publicReq.id)).toBe(true);
      expect(requests.some((r: any) => r.mediaType === 'private')).toBe(false);
    });

    it('trusted user A sees their own private request but trusted user B does not', async () => {
      const resA = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: trustedCookieA },
      });
      expect(resA.statusCode).toBe(200);
      expect(resA.json().requests.some((r: any) => r.id === privateReqA.id)).toBe(true);

      const resB = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: trustedCookieB },
      });
      expect(resB.statusCode).toBe(200);
      expect(resB.json().requests.some((r: any) => r.id === privateReqA.id)).toBe(false);
    });

    it('admin sees all requests including private requests from all users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().requests.some((r: any) => r.id === privateReqA.id)).toBe(true);
      expect(res.json().requests.some((r: any) => r.id === publicReq.id)).toBe(true);
    });

    it('GET /requests/:id returns 404 for regular user and non-owning trusted user on private requests', async () => {
      const userRes = await app.inject({
        method: 'GET',
        url: `/requests/${privateReqA.id}`,
        cookies: { token: userCookie },
      });
      expect(userRes.statusCode).toBe(404);

      const trustedBRes = await app.inject({
        method: 'GET',
        url: `/requests/${privateReqA.id}`,
        cookies: { token: trustedCookieB },
      });
      expect(trustedBRes.statusCode).toBe(404);

      const trustedARes = await app.inject({
        method: 'GET',
        url: `/requests/${privateReqA.id}`,
        cookies: { token: trustedCookieA },
      });
      expect(trustedARes.statusCode).toBe(200);

      const adminRes = await app.inject({
        method: 'GET',
        url: `/requests/${privateReqA.id}`,
        cookies: { token: adminCookie },
      });
      expect(adminRes.statusCode).toBe(200);
    });

    it('GET /requests/exists reports exists: false for regular user on private requests', async () => {
      const userRes = await app.inject({
        method: 'GET',
        url: '/requests/exists?mediaType=private&metadataId=300&metadataSource=tmdb',
        cookies: { token: userCookie },
      });
      expect(userRes.statusCode).toBe(200);
      expect(userRes.json().exists).toBe(false);

      const trustedBRes = await app.inject({
        method: 'GET',
        url: '/requests/exists?mediaType=private&metadataId=300&metadataSource=tmdb',
        cookies: { token: trustedCookieB },
      });
      expect(trustedBRes.statusCode).toBe(200);
      expect(trustedBRes.json().exists).toBe(false);

      const trustedARes = await app.inject({
        method: 'GET',
        url: '/requests/exists?mediaType=private&metadataId=300&metadataSource=tmdb',
        cookies: { token: trustedCookieA },
      });
      expect(trustedARes.statusCode).toBe(200);
      expect(trustedARes.json().exists).toBe(true);

      const adminRes = await app.inject({
        method: 'GET',
        url: '/requests/exists?mediaType=private&metadataId=300&metadataSource=tmdb',
        cookies: { token: adminCookie },
      });
      expect(adminRes.statusCode).toBe(200);
      expect(adminRes.json().exists).toBe(true);
    });

    it('PATCH /requests/:id/keep returns 400 when attempting to toggle keep flag on private request', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/requests/${privateReqA.id}/keep`,
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('permanent keep flag');
    });
  });
});
