import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { downloadRequests, users } from '../src/db/schema';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';

describe('Deleted Requests History & Redownload API', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let adminCookie: string;
  let userCookie: string;
  let trustedCookie: string;
  let adminUserId: string;
  let regularUserId: string;
  let trustedUserId: string;

  beforeEach(async () => {
    mockQb = new MockQBittorrentService();

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: mockQb,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    vi.spyOn(app.cleanup, 'isHostDiskSafe').mockReturnValue(true);
    vi.spyOn(app.cleanup, 'isSpaceSufficient').mockReturnValue({
      sufficient: true,
      percentFree: 50,
      threshold: 15,
    });

    // 1. First user -> Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_user', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;
    adminUserId = adminRes.json().user.id;

    // 2. Second user -> Regular User
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'regular_user', password: 'password123' },
    });
    userCookie = userRes.cookies[0].value;
    regularUserId = userRes.json().user.id;

    // 3. Third user -> Trusted User
    const trustedRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'trusted_user', password: 'password123' },
    });
    trustedCookie = trustedRes.cookies[0].value;
    trustedUserId = trustedRes.json().user.id;

    // Promote trusted_user to trusted role
    app.db.update(users).set({ role: 'trusted' }).where(eq(users.id, trustedUserId)).run();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Audit Tracking on Deletion', () => {
    it('manual DELETE /requests/:id records deleted_at and deletion_reason: manual', async () => {
      // Create request directly in DB
      app.db.insert(downloadRequests).values({
        id: 'req_manual_del',
        userId: regularUserId,
        magnetLink: 'magnet:?xt=urn:btih:manual123',
        mediaType: 'movie',
        status: 'done',
        metadataId: '1001',
        metadataSource: 'tmdb',
        title: 'Manual Delete Movie',
        requestedAt: '2026-01-01T00:00:00Z',
      }).run();

      const delRes = await app.inject({
        method: 'DELETE',
        url: '/requests/req_manual_del',
        headers: { cookie: `token=${userCookie}` },
      });
      expect(delRes.statusCode).toBe(200);

      const row = app.requestsRepo.findById('req_manual_del');
      expect(row?.status).toBe('deleted');
      expect(row?.deletionReason).toBe('manual');
      expect(row?.deletedAt).toBeDefined();
      expect(new Date(row!.deletedAt!).getTime()).not.toBeNaN();
    });

    it('automated cleanup records deleted_at and deletion_reason: cleanup', async () => {
      app.db.insert(downloadRequests).values({
        id: 'req_auto_clean',
        userId: regularUserId,
        magnetLink: 'magnet:?xt=urn:btih:clean123',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '1002',
        metadataSource: 'tmdb',
        title: 'Auto Clean Movie',
        requestedAt: '2026-01-01T00:00:00Z',
        scheduledDeleteAt: '2020-01-01T00:00:00Z', // In past
      }).run();

      const cleaned = await app.cleanup.executePendingCleanups();
      expect(cleaned.length).toBe(1);
      expect(cleaned[0].id).toBe('req_auto_clean');
      expect(cleaned[0].deletionReason).toBe('cleanup');
      expect(cleaned[0].deletedAt).toBeDefined();

      const row = app.requestsRepo.findById('req_auto_clean');
      expect(row?.status).toBe('deleted');
      expect(row?.deletionReason).toBe('cleanup');
      expect(row?.deletedAt).toBeDefined();
    });
  });

  describe('Listing Deleted Requests (GET /requests?status=deleted and GET /requests/deleted)', () => {
    beforeEach(() => {
      // 1. Regular user's deleted movie (with legacy null deletedAt)
      app.db.insert(downloadRequests).values({
        id: 'del_user_movie',
        userId: regularUserId,
        magnetLink: 'magnet:?xt=urn:btih:movie1',
        mediaType: 'movie',
        status: 'deleted',
        metadataId: '2001',
        metadataSource: 'tmdb',
        title: 'Legacy Movie',
        requestedAt: '2026-01-01T10:00:00Z',
        deletedAt: null,
        deletionReason: null,
      }).run();

      // 2. Admin's deleted movie
      app.db.insert(downloadRequests).values({
        id: 'del_admin_movie',
        userId: adminUserId,
        magnetLink: 'magnet:?xt=urn:btih:movie2',
        mediaType: 'movie',
        status: 'deleted',
        metadataId: '2002',
        metadataSource: 'tmdb',
        title: 'Admin Movie',
        requestedAt: '2026-01-02T10:00:00Z',
        deletedAt: '2026-01-03T10:00:00Z',
        deletionReason: 'cleanup',
      }).run();

      // 3. Trusted user's private media
      app.db.insert(downloadRequests).values({
        id: 'del_trusted_private',
        userId: trustedUserId,
        magnetLink: 'magnet:?xt=urn:btih:private1',
        mediaType: 'private',
        status: 'deleted',
        metadataId: '2003',
        metadataSource: 'tmdb',
        title: 'Private Video',
        requestedAt: '2026-01-04T10:00:00Z',
        deletedAt: '2026-01-05T10:00:00Z',
        deletionReason: 'manual',
      }).run();
    });

    it('isolates regular user to their own deleted requests', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests?status=deleted',
        headers: { cookie: `token=${userCookie}` },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.requests.length).toBe(1);
      expect(data.requests[0].id).toBe('del_user_movie');
      expect(data.requests[0].title).toBe('Legacy Movie');
    });

    it('allows admin to see all server-wide deleted requests', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests/deleted',
        headers: { cookie: `token=${adminCookie}` },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.requests.length).toBe(3);
    });

    it('hides private deleted requests from untrusted users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests?status=deleted',
        headers: { cookie: `token=${userCookie}` },
      });
      const ids = res.json().requests.map((r: any) => r.id);
      expect(ids).not.toContain('del_trusted_private');
    });

    it('allows trusted user to see their own private deleted requests', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests?status=deleted',
        headers: { cookie: `token=${trustedCookie}` },
      });
      const ids = res.json().requests.map((r: any) => r.id);
      expect(ids).toContain('del_trusted_private');
    });

    it('correctly calculates isActiveOrPresent flag for active matches', async () => {
      // Add active request matching del_user_movie
      app.db.insert(downloadRequests).values({
        id: 'act_user_movie',
        userId: adminUserId,
        magnetLink: 'magnet:?xt=urn:btih:movie1_new',
        mediaType: 'movie',
        status: 'downloading',
        metadataId: '2001',
        metadataSource: 'tmdb',
        title: 'Legacy Movie (Active Re-request)',
        requestedAt: '2026-01-06T10:00:00Z',
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: '/requests?status=deleted',
        headers: { cookie: `token=${userCookie}` },
      });
      const req = res.json().requests.find((r: any) => r.id === 'del_user_movie');
      expect(req.isActiveOrPresent).toBe(true);

      // Admin movie has no active match
      const adminRes = await app.inject({
        method: 'GET',
        url: '/requests?status=deleted',
        headers: { cookie: `token=${adminCookie}` },
      });
      const adminReq = adminRes.json().requests.find((r: any) => r.id === 'del_admin_movie');
      expect(adminReq.isActiveOrPresent).toBe(false);
    });
  });

  describe('One-Click Quick Redownload (POST /requests/:id/redownload)', () => {
    beforeEach(() => {
      app.db.insert(downloadRequests).values({
        id: 'req_to_redownload',
        userId: regularUserId,
        magnetLink: 'magnet:?xt=urn:btih:redownload123',
        mediaType: 'movie',
        status: 'deleted',
        metadataId: '3001',
        metadataSource: 'tmdb',
        title: 'Redownload Movie',
        requestedAt: '2026-01-01T00:00:00Z',
        deletedAt: '2026-01-02T00:00:00Z',
        deletionReason: 'cleanup',
      }).run();
    });

    it('creates a fresh queued request reusing original magnet link and leaves deleted record intact', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_to_redownload/redownload',
        headers: { cookie: `token=${userCookie}` },
      });
      expect(res.statusCode).toBe(201);
      const newReq = res.json().request;
      expect(newReq.id).not.toBe('req_to_redownload');
      expect(['queued', 'downloading']).toContain(newReq.status);
      expect(newReq.title).toBe('Redownload Movie');
      expect(newReq.magnetLink).toBe('magnet:?xt=urn:btih:redownload123');

      // Verify original deleted record remains completely intact
      const original = app.requestsRepo.findById('req_to_redownload');
      expect(original?.status).toBe('deleted');
      expect(original?.deletedAt).toBe('2026-01-02T00:00:00Z');
      expect(original?.deletionReason).toBe('cleanup');
    });

    it('allows redownload with custom/new magnet link override', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_to_redownload/redownload',
        headers: { cookie: `token=${userCookie}` },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:brandnewmagnet456',
        },
      });
      expect(res.statusCode).toBe(201);
      const newReq = res.json().request;
      expect(newReq.magnetLink).toBe('magnet:?xt=urn:btih:brandnewmagnet456');
    });

    it('rejects redownload with 409 Conflict if media is already active or in library', async () => {
      // Put an active request in the DB
      app.db.insert(downloadRequests).values({
        id: 'already_active',
        userId: adminUserId,
        magnetLink: 'magnet:?xt=urn:btih:active456',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '3001',
        metadataSource: 'tmdb',
        title: 'Redownload Movie (Already Active)',
        requestedAt: '2026-01-03T00:00:00Z',
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_to_redownload/redownload',
        headers: { cookie: `token=${userCookie}` },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe('Conflict');
    });

    it('forbids non-owner non-admin from redownloading someone elses deleted request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_to_redownload/redownload',
        headers: { cookie: `token=${trustedCookie}` }, // trusted_user is not owner and not admin
      });
      expect(res.statusCode).toBe(404);
    });

    it('allows admin to redownload any deleted request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_to_redownload/redownload',
        headers: { cookie: `token=${adminCookie}` },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().request.title).toBe('Redownload Movie');
    });

    it('rejects with 400 Bad Request if target request is not in deleted status', async () => {
      app.db.insert(downloadRequests).values({
        id: 'not_deleted_req',
        userId: regularUserId,
        magnetLink: 'magnet:?xt=urn:btih:active1',
        mediaType: 'movie',
        status: 'queued',
        metadataId: '3002',
        metadataSource: 'tmdb',
        title: 'Not Deleted',
        requestedAt: '2026-01-01T00:00:00Z',
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/not_deleted_req/redownload',
        headers: { cookie: `token=${userCookie}` },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('Only deleted requests');
    });
  });
});
