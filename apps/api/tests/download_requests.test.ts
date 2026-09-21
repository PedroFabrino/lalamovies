import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IMetadataService } from '../src/services/metadata';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests, requestCoRequesters, users } from '../src/db/schema';

import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';

class MockCleanupService implements ICleanupService {
  public spaceSufficient = true;
  public percentFree = 50;
  public hostDiskSafe = true;
  public cleanedIds: string[] = [];

  constructor(private appInstance: { db: any }) {}

  isSpaceSufficient(): SpaceCheckResult {
    return {
      sufficient: this.spaceSufficient && this.hostDiskSafe,
      percentFree: this.percentFree,
      threshold: 15,
    };
  }

  isHostDiskSafe(): boolean {
    return this.hostDiskSafe;
  }

  async cleanItem(requestId: string): Promise<void> {
    this.cleanedIds.push(requestId);
    this.appInstance.db
      .update(downloadRequests)
      .set({ status: 'deleted' })
      .where(eq(downloadRequests.id, requestId))
      .run();
    this.appInstance.db
      .delete(requestCoRequesters)
      .where(eq(requestCoRequesters.requestId, requestId))
      .run();
  }
}

describe('Download Request Submission & Management', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let mockCleanup: MockCleanupService;
  let adminCookie: string;
  let userCookie: string;
  let adminUserId: string;
  let testUserId: string;

  beforeEach(async () => {
    mockQb = new MockQBittorrentService();
    mockCleanup = new MockCleanupService({ db: null as any });

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: mockQb,
      cleanupService: mockCleanup,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    // Provide app.db reference to mockCleanup
    mockCleanup['appInstance'].db = app.db;

    await app.ready();

    // 1. First user -> Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_alice', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;
    adminUserId = adminRes.json().user.id;

    // 2. Second user -> User
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'user_bob', password: 'password123' },
    });
    userCookie = userRes.cookies[0].value;
    testUserId = userRes.json().user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:abc',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects request with 422 if disk free space is below reject threshold', async () => {
    mockCleanup.spaceSufficient = false;
    mockCleanup.percentFree = 10;

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:abc',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('Insufficient disk space');
    expect(mockQb.addedTorrents).toHaveLength(0);
  });

  it('rejects request with 422 if host disk has < 10 GB free space (host disk safety check)', async () => {
    mockCleanup.hostDiskSafe = false;

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:abc',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('Insufficient host disk space');
    expect(mockQb.addedTorrents).toHaveLength(0);
  });

  it('adds torrent immediately when active count is below concurrent limit and quota is healthy', async () => {
    mockQb.activeCount = 0; // limit is 2
    app.fileSystem.getStorageFootprintBytes = async () => 0;

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:abc123',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
        year: 1999,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.request.status).toBe('downloading');
    expect(body.request.deferredReason).toBeNull();
    expect(body.request.qbTorrentHash).toBe('mock_hash_123');
    expect(body.request.title).toBe('Fight Club');
    expect(mockQb.addedTorrents).toHaveLength(1);
  });

  it('queues request with waiting_for_slot when active count reaches concurrent limit', async () => {
    mockQb.activeCount = 2; // limit is 2, so full
    app.fileSystem.getStorageFootprintBytes = async () => 0;

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:queued_1',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Inception',
        year: 2010,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.request.status).toBe('queued');
    expect(body.request.deferredReason).toBe('waiting_for_slot');
    expect(body.request.qbTorrentHash).toBeNull();
    expect(mockQb.addedTorrents).toHaveLength(0);
  });

  it('defers request to queued with deferredReason waiting_for_space when storage footprint exceeds 85% of quota', async () => {
    // Quota is 150 GB (150 * 1024^3). 85% is 127.5 GB. Mock footprint at 130 GB (86.6%)
    app.fileSystem.getStorageFootprintBytes = async () => 130 * 1024 * 1024 * 1024;
    mockQb.activeCount = 0; // Even with available slots!

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:space_defer',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Interstellar',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.request.status).toBe('queued');
    expect(body.request.deferredReason).toBe('waiting_for_space');
    expect(body.request.qbTorrentHash).toBeNull();
    expect(mockQb.addedTorrents).toHaveLength(0);
  });

  it('saves uploaded .torrent buffer to staging when deferred for space', async () => {
    app.fileSystem.getStorageFootprintBytes = async () => 135 * 1024 * 1024 * 1024; // >85%

    const name = 'sample.mkv';
    const infoDict = `d6:lengthi100000e4:name${name.length}:${name}e`;
    const fullTorrent = `d4:info${infoDict}e`;
    const base64Torrent = Buffer.from(fullTorrent).toString('base64');

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        torrentFileBase64: base64Torrent,
        torrentFileName: 'sample.torrent',
        mediaType: 'movie',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'Sample Movie',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.request.status).toBe('queued');
    expect(body.request.deferredReason).toBe('waiting_for_space');
    expect(body.request.torrentFilePath).toBeTruthy();
    expect(fs.existsSync(body.request.torrentFilePath)).toBe(true);

    try {
      fs.unlinkSync(body.request.torrentFilePath);
    } catch {}
  });

  it('isolates user requests in GET /requests: regular user sees own, admin sees all', async () => {
    // Bob creates a request
    await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bob_req',
        mediaType: 'movie',
        metadataId: '1',
        metadataSource: 'tmdb',
        title: 'Bob Movie',
      },
    });

    // Alice (admin) creates a request
    await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: adminCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:alice_req',
        mediaType: 'movie',
        metadataId: '2',
        metadataSource: 'tmdb',
        title: 'Alice Movie',
      },
    });

    // Bob list -> only 1 request (his own)
    const bobRes = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: userCookie },
    });
    expect(bobRes.statusCode).toBe(200);
    expect(bobRes.json().requests).toHaveLength(1);
    expect(bobRes.json().requests[0].title).toBe('Bob Movie');
    expect(bobRes.json().requests[0]).toHaveProperty('deferredReason');

    // Alice list -> 2 requests (all)
    const aliceRes = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: adminCookie },
    });
    expect(aliceRes.statusCode).toBe(200);
    expect(aliceRes.json().requests).toHaveLength(2);
  });

  it('GET /requests returns seasonNumber and episodeNumber for episodic requests', async () => {
    await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:tv_show_req',
        mediaType: 'tv_show',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        year: 2008,
        seasonNumber: 2,
        episodeNumber: 5,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: userCookie },
    });

    expect(res.statusCode).toBe(200);
    const item = res.json().requests.find((r: any) => r.title === 'Breaking Bad');
    expect(item).toBeDefined();
    expect(item.year).toBe(2008);
    expect(item.seasonNumber).toBe(2);
    expect(item.episodeNumber).toBe(5);
  });

  it('GET /requests/:id enforces ownership for regular users but allows admin', async () => {
    // Alice creates request
    const createRes = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: adminCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:secret',
        mediaType: 'movie',
        metadataId: '10',
        metadataSource: 'tmdb',
        title: 'Secret Movie',
      },
    });
    const id = createRes.json().request.id;

    // Bob attempts to get Alice's request -> 404
    const bobGet = await app.inject({
      method: 'GET',
      url: `/requests/${id}`,
      cookies: { token: userCookie },
    });
    expect(bobGet.statusCode).toBe(404);

    // Alice gets her own request -> 200
    const aliceGet = await app.inject({
      method: 'GET',
      url: `/requests/${id}`,
      cookies: { token: adminCookie },
    });
    expect(aliceGet.statusCode).toBe(200);
  });

  it('PATCH /requests/:id/keep allows admin to toggle keepFlag but forbids user', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:keep_me',
        mediaType: 'movie',
        metadataId: '12',
        metadataSource: 'tmdb',
        title: 'Keep Me Movie',
      },
    });
    const id = createRes.json().request.id;

    // User attempts toggle -> 403
    const userPatch = await app.inject({
      method: 'PATCH',
      url: `/requests/${id}/keep`,
      cookies: { token: userCookie },
    });
    expect(userPatch.statusCode).toBe(403);

    // Admin toggles to true -> 200
    const adminPatch1 = await app.inject({
      method: 'PATCH',
      url: `/requests/${id}/keep`,
      cookies: { token: adminCookie },
    });
    expect(adminPatch1.statusCode).toBe(200);
    expect(adminPatch1.json().request.keepFlag).toBe(true);

    // Admin toggles back to false -> 200
    const adminPatch2 = await app.inject({
      method: 'PATCH',
      url: `/requests/${id}/keep`,
      cookies: { token: adminCookie },
    });
    expect(adminPatch2.statusCode).toBe(200);
    expect(adminPatch2.json().request.keepFlag).toBe(false);
  });

  it('DELETE /requests/:id allows owner and admin, triggers cleanup', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:delete_me',
        mediaType: 'movie',
        metadataId: '99',
        metadataSource: 'tmdb',
        title: 'Delete Movie',
      },
    });
    const id = createRes.json().request.id;

    // Bob deletes his own request -> 200
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/requests/${id}`,
      cookies: { token: userCookie },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(mockCleanup.cleanedIds).toContain(id);

    // Check status in DB -> deleted
    const updated = app.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, id))
      .get();
    expect(updated?.status).toBe('deleted');
  });

  it('POST /requests creates request with coRequesterUserIds atomically', async () => {
    app.db.insert(users).values([
      {
        id: 'other-user-1',
        username: 'other1',
        role: 'user',
        jellyfinUserId: 'jf_other1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'other-user-2',
        username: 'other2',
        role: 'user',
        jellyfinUserId: 'jf_other2',
        createdAt: new Date().toISOString(),
      },
    ]).run();

    const createRes = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:coreq_test',
        mediaType: 'movie',
        metadataId: 'tmdb-coreq-123',
        metadataSource: 'tmdb',
        title: 'CoReq Movie',
        coRequesterUserIds: ['other-user-1', 'other-user-2'],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const requestId = createRes.json().request.id;

    const coReqs = app.db
      .select()
      .from(requestCoRequesters)
      .where(eq(requestCoRequesters.requestId, requestId))
      .all();

    expect(coReqs).toHaveLength(2);
    expect(coReqs.map((r) => r.userId).sort()).toEqual(['other-user-1', 'other-user-2']);
  });

  it('DELETE /requests/:id removes co-requester rows and hides from both dashboards', async () => {
    app.db.insert(users).values({
      id: 'co-req-user-1',
      username: 'coreq1',
      role: 'user',
      jellyfinUserId: 'jf_coreq1',
      createdAt: new Date().toISOString(),
    }).run();

    const otherToken = app.jwt.sign({ id: 'co-req-user-1', username: 'coreq1', role: 'user' });

    const createRes = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:delete_coreq_test',
        mediaType: 'movie',
        metadataId: 'tmdb-delete-coreq',
        metadataSource: 'tmdb',
        title: 'Delete CoReq Movie',
        coRequesterUserIds: ['co-req-user-1'],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const id = createRes.json().request.id;

    const listPrimaryBefore = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: userCookie },
    });
    expect(listPrimaryBefore.json().requests.some((r: any) => r.id === id)).toBe(true);

    const listCoReqBefore = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: otherToken },
    });
    expect(listCoReqBefore.json().requests.some((r: any) => r.id === id)).toBe(true);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/requests/${id}`,
      cookies: { token: userCookie },
    });
    expect(deleteRes.statusCode).toBe(200);

    const coReqs = app.db
      .select()
      .from(requestCoRequesters)
      .where(eq(requestCoRequesters.requestId, id))
      .all();
    expect(coReqs).toHaveLength(0);

    const listPrimaryAfter = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: userCookie },
    });
    expect(listPrimaryAfter.json().requests.some((r: any) => r.id === id)).toBe(false);

    const listCoReqAfter = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: otherToken },
    });
    expect(listCoReqAfter.json().requests.some((r: any) => r.id === id)).toBe(false);
  });

  describe('POST /requests/:id/retry', () => {
    it('returns 400 if request is not in error state', async () => {
      app.db.insert(downloadRequests).values({
        id: 'req_downloading_1',
        userId: testUserId,
        magnetLink: 'magnet:?xt=urn:btih:1111',
        mediaType: 'movie',
        status: 'downloading',
        metadataId: '10',
        metadataSource: 'tmdb',
        title: 'Active Movie',
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_downloading_1/retry',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('Only requests in error state can be retried');
    });

    it('resets incomplete torrent to downloading status', async () => {
      app.db.insert(downloadRequests).values({
        id: 'req_err_retry_1',
        userId: testUserId,
        magnetLink: 'magnet:?xt=urn:btih:2222',
        mediaType: 'movie',
        status: 'error',
        metadataId: '20',
        metadataSource: 'tmdb',
        title: 'Error Movie Incomplete',
        errorMessage: 'Connection lost',
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_err_retry_1/retry',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().request.status).toBe('downloading');
      expect(res.json().request.errorMessage).toBeNull();
    });

    it('completes request to seeding if files already exist on disk', async () => {
      // Create a temporary media file to mock existing library path
      const tmpFile = path.resolve(process.cwd(), 'tests_retry_sample.mkv');
      fs.writeFileSync(tmpFile, 'test media content');

      try {
        app.db.insert(downloadRequests).values({
          id: 'req_err_retry_complete',
          userId: testUserId,
          magnetLink: 'magnet:?xt=urn:btih:3333',
          mediaType: 'movie',
          status: 'error',
          metadataId: '30',
          metadataSource: 'tmdb',
          title: 'Error Movie On Disk',
          errorMessage: 'Failed to refresh Jellyfin library: HTTP 401',
          jellyfinPath: tmpFile,
          requestedAt: new Date().toISOString(),
        }).run();

        const res = await app.inject({
          method: 'POST',
          url: '/requests/req_err_retry_complete/retry',
          cookies: { token: adminCookie },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().request.status).toBe('seeding');
        expect(res.json().request.errorMessage).toBeNull();
        expect(res.json().request.jellyfinPath).toBe(tmpFile);
      } finally {
        if (fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile);
        }
      }
    });

    it('retries completed torrent from qBittorrent and delegates to processAndHardlinkTorrent', async () => {
      const stagingDir = path.resolve(process.cwd(), 'downloads', 'staging');
      fs.mkdirSync(stagingDir, { recursive: true });
      const testMovieName = 'Retry.Movie.2024.mkv';
      const stagingFile = path.join(stagingDir, testMovieName);
      fs.writeFileSync(stagingFile, 'Retry movie media');

      const torrentHash = 'hash_retry_qb_success';
      mockQb.allTorrents = [
        {
          hash: torrentHash,
          name: testMovieName,
          size: 123456,
          progress: 1.0,
          state: 'uploading',
        },
      ];
      mockQb.torrentFiles.set(torrentHash, [
        { name: testMovieName, size: 123456 },
      ]);

      try {
        app.db.insert(downloadRequests).values({
          id: 'req_retry_qb_ok',
          userId: testUserId,
          magnetLink: `magnet:?xt=urn:btih:${torrentHash}`,
          mediaType: 'movie',
          status: 'error',
          metadataId: '40',
          metadataSource: 'tmdb',
          title: 'Retry Movie Success',
          year: 2024,
          qbTorrentHash: torrentHash,
          errorMessage: 'Old download error',
          requestedAt: new Date().toISOString(),
        }).run();

        const res = await app.inject({
          method: 'POST',
          url: '/requests/req_retry_qb_ok/retry',
          cookies: { token: adminCookie },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().request.status).toBe('seeding');
        expect(res.json().request.errorMessage).toBeNull();
        expect(fs.existsSync(res.json().request.jellyfinPath)).toBe(true);
      } finally {
        if (fs.existsSync(stagingFile)) {
          fs.unlinkSync(stagingFile);
        }
        const createdFolder = path.resolve(process.cwd(), 'media', 'movies', 'Retry Movie Success (2024)');
        if (fs.existsSync(createdFolder)) {
          fs.rmSync(createdFolder, { recursive: true, force: true });
        }
      }
    });

    it('returns 502 and marks error when processAndHardlinkTorrent throws during retry', async () => {
      const torrentHash = 'hash_retry_qb_fail';
      // Torrent is marked completed, but file does not exist on disk in staging!
      mockQb.allTorrents = [
        {
          hash: torrentHash,
          name: 'NonExistent.File.2024.mkv',
          size: 500000,
          progress: 1.0,
          state: 'uploading',
        },
      ];
      mockQb.torrentFiles.set(torrentHash, [
        { name: 'NonExistent.File.2024.mkv', size: 500000 },
      ]);

      app.db.insert(downloadRequests).values({
        id: 'req_retry_qb_fail',
        userId: testUserId,
        magnetLink: `magnet:?xt=urn:btih:${torrentHash}`,
        mediaType: 'movie',
        status: 'error',
        metadataId: '50',
        metadataSource: 'tmdb',
        title: 'Retry Movie Fail',
        year: 2024,
        qbTorrentHash: torrentHash,
        errorMessage: 'Initial error',
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_retry_qb_fail/retry',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(502);
      expect(res.json().error).toBe('Bad Gateway');
      expect(res.json().message).toContain('Failed to process and hardlink torrent');

      // Verify errorMessage in DB via requestsRepo.markError()
      const row = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_retry_qb_fail')).get();
      expect(row?.status).toBe('error');
      expect(row?.errorMessage).toContain('Source file does not exist for hardlink');
    });
  });
});