import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IMetadataService } from '../src/services/metadata';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests } from '../src/db/schema';

class MockJellyfinService implements IJellyfinService {
  async authenticateUser(username: string) {
    return { accessToken: 'tk', userId: `uid_${username}`, username, isAdmin: false };
  }
  async createUser() { return 'new_id'; }
  async deleteUser() {}
}

class MockQBittorrentService implements IQBittorrentService {
  public activeCount = 0;
  public addedTorrents: { magnetLink: string; savePath?: string }[] = [];
  public removedTorrents: { hash: string; deleteFiles?: boolean }[] = [];

  async addTorrent(magnetLink: string, savePath?: string) {
    this.addedTorrents.push({ magnetLink, savePath });
    return 'mock_hash_123';
  }

  async getActiveTorrentCount() {
    return this.activeCount;
  }

  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    return {
      hash,
      name: 'Test Torrent',
      progress: 0.5,
      dlspeed: 1024000,
      eta: 120,
      state: 'downloading',
      size: 500000000,
    };
  }

  async removeTorrent(hash: string, deleteFiles?: boolean) {
    this.removedTorrents.push({ hash, deleteFiles });
  }
}

class MockCleanupService implements ICleanupService {
  public spaceSufficient = true;
  public percentFree = 50;
  public cleanedIds: string[] = [];

  constructor(private appInstance: { db: any }) {}

  isSpaceSufficient(): SpaceCheckResult {
    return {
      sufficient: this.spaceSufficient,
      percentFree: this.percentFree,
      threshold: 15,
    };
  }

  async cleanItem(requestId: string): Promise<void> {
    this.cleanedIds.push(requestId);
    this.appInstance.db
      .update(downloadRequests)
      .set({ status: 'deleted' })
      .where(eq(downloadRequests.id, requestId))
      .run();
  }
}

describe('Download Request Submission & Management', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let mockCleanup: MockCleanupService;
  let adminCookie: string;
  let userCookie: string;

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

    // 2. Second user -> User
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'user_bob', password: 'password123' },
    });
    userCookie = userRes.cookies[0].value;
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

  it('adds torrent immediately when active count is below concurrent limit', async () => {
    mockQb.activeCount = 0; // limit is 2

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
    expect(body.request.qbTorrentHash).toBe('mock_hash_123');
    expect(body.request.title).toBe('Fight Club');
    expect(mockQb.addedTorrents).toHaveLength(1);
  });

  it('queues request when active count reaches concurrent limit', async () => {
    mockQb.activeCount = 2; // limit is 2, so full

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
    expect(body.request.qbTorrentHash).toBeNull();
    expect(mockQb.addedTorrents).toHaveLength(0);
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

    // Alice list -> 2 requests (all)
    const aliceRes = await app.inject({
      method: 'GET',
      url: '/requests',
      cookies: { token: adminCookie },
    });
    expect(aliceRes.statusCode).toBe(200);
    expect(aliceRes.json().requests).toHaveLength(2);
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
});