import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests, requestCoRequesters } from '../src/db/schema';

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

  async addTorrent(magnetLink: string, savePath?: string) {
    this.addedTorrents.push({ magnetLink, savePath });
    return `hash_${this.addedTorrents.length}`;
  }

  async getActiveTorrentCount() {
    return this.activeCount;
  }

  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    return null;
  }
}

class MockCleanupService implements ICleanupService {
  constructor(public appInstance: { db?: any } = {}) {}
  isSpaceSufficient(): SpaceCheckResult {
    return { sufficient: true, percentFree: 50, threshold: 15 };
  }
  isHostDiskSafe(): boolean {
    return true;
  }
  async cleanItem(requestId: string): Promise<void> {
    if (this.appInstance.db) {
      this.appInstance.db
        .update(downloadRequests)
        .set({ status: 'deleted' })
        .where(eq(downloadRequests.id, requestId))
        .run();
    }
  }
}

describe('Request Deduplication & Co-Requesters (Ticket 02)', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let mockCleanup: MockCleanupService;
  let adminCookie: string;
  let aliceCookie: string;
  let bobCookie: string;
  let charlieCookie: string;

  beforeEach(async () => {
    mockQb = new MockQBittorrentService();
    mockCleanup = new MockCleanupService();

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: mockQb,
      cleanupService: mockCleanup,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    mockCleanup.appInstance.db = app.db;

    await app.ready();

    // 1. First user -> Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_sys', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;

    // 2. Alice -> regular user
    const aliceRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    aliceCookie = aliceRes.cookies[0].value;

    // 3. Bob -> regular user
    const bobRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'bob', password: 'password123' },
    });
    bobCookie = bobRes.cookies[0].value;

    // 4. Charlie -> regular user
    const charlieRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'charlie', password: 'password123' },
    });
    charlieCookie = charlieRes.cookies[0].value;
  });

  afterEach(async () => {
    await app.close();
  });

  it('fresh movie request returns 201 and adds torrent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:movie1',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
        year: 1999,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.request.title).toBe('Fight Club');
    expect(body.request.status).toBe('downloading');
    expect(mockQb.addedTorrents).toHaveLength(1);

    const rows = app.db.select().from(downloadRequests).all();
    expect(rows).toHaveLength(1);
  });

  it('duplicate movie request by primary user returns 200 without adding torrent (idempotent)', async () => {
    // 1. Initial request by Alice
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:movie1',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
      },
    });
    expect(res1.statusCode).toBe(201);
    const req1Id = res1.json().request.id;

    // 2. Re-submit by Alice
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:movie1_diff_quality',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
      },
    });

    expect(res2.statusCode).toBe(200);
    expect(res2.json().request.id).toBe(req1Id);
    expect(mockQb.addedTorrents).toHaveLength(1); // No new torrent added

    const coRows = app.db.select().from(requestCoRequesters).all();
    expect(coRows).toHaveLength(0); // Primary user is not in co-requesters
  });

  it('duplicate movie request by different user returns 200 and adds co-requester row', async () => {
    // 1. Alice creates request
    const resAlice = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:movie_alice',
        mediaType: 'movie',
        metadataId: '603',
        metadataSource: 'tmdb',
        title: 'The Matrix',
        year: 1999,
      },
    });
    expect(resAlice.statusCode).toBe(201);
    const canonicalId = resAlice.json().request.id;

    // 2. Bob submits request for same movie
    const resBob = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:movie_bob',
        mediaType: 'movie',
        metadataId: '603',
        metadataSource: 'tmdb',
        title: 'The Matrix',
        year: 1999,
      },
    });

    expect(resBob.statusCode).toBe(200);
    expect(resBob.json().request.id).toBe(canonicalId);
    expect(mockQb.addedTorrents).toHaveLength(1); // Only 1 torrent added

    // Verify co-requester row created for Bob
    const coRows = app.db
      .select()
      .from(requestCoRequesters)
      .where(eq(requestCoRequesters.requestId, canonicalId))
      .all();
    expect(coRows).toHaveLength(1);

    const bobUser = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, canonicalId)).get();
    expect(coRows[0].userId).not.toBe(bobUser?.userId);
  });

  it('season pack request absorbs into existing season pack (duplicate by different user)', async () => {
    // 1. Alice requests S1 season pack
    const resAlice = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s1_pack',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 1,
      },
    });
    expect(resAlice.statusCode).toBe(201);
    const s1Id = resAlice.json().request.id;

    // 2. Bob requests S1 season pack
    const resBob = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s1_pack_bob',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 1,
      },
    });
    expect(resBob.statusCode).toBe(200);
    expect(resBob.json().request.id).toBe(s1Id);
    expect(mockQb.addedTorrents).toHaveLength(1);

    const coRows = app.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, s1Id)).all();
    expect(coRows).toHaveLength(1);
  });

  it('season pack absorbs single episode request for that season', async () => {
    // 1. Alice requests S1 season pack
    const resAlice = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s1_pack',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 1,
      },
    });
    expect(resAlice.statusCode).toBe(201);
    const s1Id = resAlice.json().request.id;

    // 2. Bob requests S1E3 (individual episode)
    const resBob = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s1e3',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: 3,
      },
    });

    // Bob absorbs into S1 pack
    expect(resBob.statusCode).toBe(200);
    expect(resBob.json().request.id).toBe(s1Id);
    expect(mockQb.addedTorrents).toHaveLength(1); // No new torrent

    const coRows = app.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, s1Id)).all();
    expect(coRows).toHaveLength(1);
  });

  it('individual episode does NOT absorb season pack request (asymmetric)', async () => {
    // 1. Alice requests S2E1 (single episode)
    const resAlice = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s2e1',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 2,
        episodeNumber: 1,
      },
    });
    expect(resAlice.statusCode).toBe(201);
    const ep1Id = resAlice.json().request.id;

    // 2. Bob requests S2 season pack
    const resBob = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s2_pack',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 2,
      },
    });

    // Does NOT absorb into single episode — creates fresh canonical request
    expect(resBob.statusCode).toBe(201);
    expect(resBob.json().request.id).not.toBe(ep1Id);
    expect(mockQb.addedTorrents).toHaveLength(2); // Both downloaded!

    const rows = app.db.select().from(downloadRequests).all();
    expect(rows).toHaveLength(2);
  });

  it('different episodes of same season create separate canonical requests', async () => {
    // S3E1
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s3e1',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 3,
        episodeNumber: 1,
      },
    });
    expect(res1.statusCode).toBe(201);

    // S3E2
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:bb_s3e2',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 3,
        episodeNumber: 2,
      },
    });
    expect(res2.statusCode).toBe(201);
    expect(res2.json().request.id).not.toBe(res1.json().request.id);
  });

  it('previously deleted request allows fresh submission', async () => {
    // 1. Alice creates request
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:m1',
        mediaType: 'movie',
        metadataId: '999',
        metadataSource: 'tmdb',
        title: 'Old Movie',
      },
    });
    const req1Id = res1.json().request.id;

    // 2. Mark as deleted
    app.db.update(downloadRequests).set({ status: 'deleted' }).where(eq(downloadRequests.id, req1Id)).run();

    // 3. Bob requests same movie -> creates fresh request
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:m1_new',
        mediaType: 'movie',
        metadataId: '999',
        metadataSource: 'tmdb',
        title: 'Old Movie',
      },
    });

    expect(res2.statusCode).toBe(201);
    expect(res2.json().request.id).not.toBe(req1Id);
  });

  it('simultaneous submissions serialize and do not create duplicate canonical rows', async () => {
    // Fire two requests concurrently
    const [resAlice, resBob] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: aliceCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:concurrent_alice',
          mediaType: 'movie',
          metadataId: '777',
          metadataSource: 'tmdb',
          title: 'Concurrent Movie',
        },
      }),
      app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: bobCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:concurrent_bob',
          mediaType: 'movie',
          metadataId: '777',
          metadataSource: 'tmdb',
          title: 'Concurrent Movie',
        },
      }),
    ]);

    const statuses = [resAlice.statusCode, resBob.statusCode].sort();
    expect(statuses).toEqual([200, 201]); // One is 201, other is 200

    // Only one canonical row in DB
    const rows = app.db.select().from(downloadRequests).where(eq(downloadRequests.metadataId, '777')).all();
    expect(rows).toHaveLength(1);

    // One co-requester row in DB
    const coRows = app.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, rows[0].id)).all();
    expect(coRows).toHaveLength(1);
  });

  describe('Co-Requester Visibility & Access Gating (Ticket 03)', () => {
    let canonicalReqId: string;

    beforeEach(async () => {
      // Alice (primary) creates request
      const createRes = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: aliceCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:shared_movie',
          mediaType: 'movie',
          metadataId: '888',
          metadataSource: 'tmdb',
          title: 'Shared Movie',
        },
      });
      canonicalReqId = createRes.json().request.id;

      // Bob co-requests the same movie
      await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: bobCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:shared_movie_bob',
          mediaType: 'movie',
          metadataId: '888',
          metadataSource: 'tmdb',
          title: 'Shared Movie',
        },
      });
    });

    it('GET /requests returns primary and co-requested requests with isPrimaryRequester flag', async () => {
      // Alice list -> isPrimaryRequester = true
      const aliceListRes = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: aliceCookie },
      });
      expect(aliceListRes.statusCode).toBe(200);
      const aliceItem = aliceListRes.json().requests.find((r: any) => r.id === canonicalReqId);
      expect(aliceItem).toBeDefined();
      expect(aliceItem.isPrimaryRequester).toBe(true);

      // Bob list -> isPrimaryRequester = false
      const bobListRes = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: bobCookie },
      });
      expect(bobListRes.statusCode).toBe(200);
      const bobItem = bobListRes.json().requests.find((r: any) => r.id === canonicalReqId);
      expect(bobItem).toBeDefined();
      expect(bobItem.isPrimaryRequester).toBe(false);

      // Charlie (unrelated) list -> does not see the request
      const charlieListRes = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: charlieCookie },
      });
      expect(charlieListRes.statusCode).toBe(200);
      const charlieItem = charlieListRes.json().requests.find((r: any) => r.id === canonicalReqId);
      expect(charlieItem).toBeUndefined();
    });

    it('admin GET /requests includes coRequesters usernames array', async () => {
      const adminListRes = await app.inject({
        method: 'GET',
        url: '/requests',
        cookies: { token: adminCookie },
      });
      expect(adminListRes.statusCode).toBe(200);
      const item = adminListRes.json().requests.find((r: any) => r.id === canonicalReqId);
      expect(item).toBeDefined();
      expect(item.coRequesters).toContain('bob');
    });

    it('GET /requests/:id grants read access to primary requester, co-requester, and admin, but 404 for others', async () => {
      // Alice (primary) -> 200
      const aliceRes = await app.inject({
        method: 'GET',
        url: `/requests/${canonicalReqId}`,
        cookies: { token: aliceCookie },
      });
      expect(aliceRes.statusCode).toBe(200);
      expect(aliceRes.json().request.isPrimaryRequester).toBe(true);

      // Bob (co-requester) -> 200
      const bobRes = await app.inject({
        method: 'GET',
        url: `/requests/${canonicalReqId}`,
        cookies: { token: bobCookie },
      });
      expect(bobRes.statusCode).toBe(200);
      expect(bobRes.json().request.isPrimaryRequester).toBe(false);

      // Admin -> 200
      const adminRes = await app.inject({
        method: 'GET',
        url: `/requests/${canonicalReqId}`,
        cookies: { token: adminCookie },
      });
      expect(adminRes.statusCode).toBe(200);

      // Charlie (not primary, not co-requester) -> 404
      const charlieRes = await app.inject({
        method: 'GET',
        url: `/requests/${canonicalReqId}`,
        cookies: { token: charlieCookie },
      });
      expect(charlieRes.statusCode).toBe(404);
    });

    it('DELETE /requests/:id is blocked for co-requester (404) but allowed for primary requester and admin', async () => {
      // Bob (co-requester) tries to delete -> 404
      const bobDelRes = await app.inject({
        method: 'DELETE',
        url: `/requests/${canonicalReqId}`,
        cookies: { token: bobCookie },
      });
      expect(bobDelRes.statusCode).toBe(404);

      // Charlie (third party) tries to delete -> 404
      const charlieDelRes = await app.inject({
        method: 'DELETE',
        url: `/requests/${canonicalReqId}`,
        cookies: { token: charlieCookie },
      });
      expect(charlieDelRes.statusCode).toBe(404);

      // Alice (primary) can delete -> 200
      const aliceDelRes = await app.inject({
        method: 'DELETE',
        url: `/requests/${canonicalReqId}`,
        cookies: { token: aliceCookie },
      });
      expect(aliceDelRes.statusCode).toBe(200);
    });
  });

  describe('Frontend Duplicate Detection & GET /requests/exists (Ticket 04)', () => {
    let movieId: string;
    let seasonPackId: string;

    beforeEach(async () => {
      // Alice creates a movie request
      const mRes = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: aliceCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:exists_movie_test',
          mediaType: 'movie',
          metadataId: '9901',
          metadataSource: 'tmdb',
          title: 'Exists Movie',
          year: 2024,
        },
      });
      movieId = mRes.json().request.id;

      // Alice creates a TV season pack request (season 2)
      const sRes = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: aliceCookie },
        payload: {
          magnetLink: 'magnet:?xt=urn:btih:exists_tv_test',
          mediaType: 'tv_show',
          metadataId: '9902',
          metadataSource: 'tmdb',
          title: 'Exists Show',
          seasonNumber: 2,
        },
      });
      seasonPackId = sRes.json().request.id;
    });

    it('returns exists: true with request details when movie matches', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests/exists?metadataId=9901&metadataSource=tmdb&mediaType=movie',
        cookies: { token: bobCookie },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.exists).toBe(true);
      expect(data.request).toBeDefined();
      expect(data.request.id).toBe(movieId);
      expect(data.request.title).toBe('Exists Movie');
      expect(data.request.year).toBe(2024);
    });

    it('returns exists: false for unknown mediaId', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests/exists?metadataId=999999&metadataSource=tmdb&mediaType=movie',
        cookies: { token: bobCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().exists).toBe(false);
      expect(res.json().request).toBeUndefined();
    });

    it('returns exists: true for single episode when season pack already exists (asymmetric absorption)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests/exists?metadataId=9902&metadataSource=tmdb&mediaType=tv_show&seasonNumber=2&episodeNumber=5',
        cookies: { token: bobCookie },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.exists).toBe(true);
      expect(data.request.id).toBe(seasonPackId);
    });

    it('returns exists: false for a different season of the same show', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests/exists?metadataId=9902&metadataSource=tmdb&mediaType=tv_show&seasonNumber=3',
        cookies: { token: bobCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().exists).toBe(false);
    });

    it('ignores deleted requests and returns exists: false', async () => {
      // Soft-delete movie
      await mockCleanup.cleanItem(movieId);

      const res = await app.inject({
        method: 'GET',
        url: '/requests/exists?metadataId=9901&metadataSource=tmdb&mediaType=movie',
        cookies: { token: bobCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().exists).toBe(false);
    });

    it('returns 400 when missing required query parameters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/requests/exists?metadataSource=tmdb',
        cookies: { token: bobCookie },
      });
      expect(res.statusCode).toBe(400);
    });

    it('allows co-requester to POST /requests without magnetLink or torrent file when existing request exists', async () => {
      const coReqRes = await app.inject({
        method: 'POST',
        url: '/requests',
        cookies: { token: bobCookie },
        payload: {
          mediaType: 'movie',
          metadataId: '9901',
          metadataSource: 'tmdb',
          title: 'Exists Movie',
        },
      });
      expect(coReqRes.statusCode).toBe(200);
      expect(coReqRes.json().request.id).toBe(movieId);

      // Verify Bob is recorded in requestCoRequesters
      const coRows = app.db
        .select()
        .from(requestCoRequesters)
        .where(eq(requestCoRequesters.requestId, movieId))
        .all();
      expect(coRows).toHaveLength(1);
    });
  });
});
