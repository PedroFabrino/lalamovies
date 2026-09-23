import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { MockJellyfin } from './fixtures/mockJellyfin';
import { MockQBittorrent } from './fixtures/mockQBittorrent';
import { BaseMetadataService } from '../src/services/metadata';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests, users } from '../src/db/schema';
import { RequestStatus } from '../src/services/requestStateMachine';

class MockMetadata extends BaseMetadataService {
  async searchTMDB(query: string) {
    return [{ id: 'tmdb_1', source: 'tmdb' as const, title: query, year: 2024, posterUrl: null, overview: 'Overview' }];
  }
  async searchAniList(query: string) {
    return [{ id: 'anilist_1', source: 'anilist' as const, title: query, year: 2024, posterUrl: null, overview: 'Overview' }];
  }
}

class MockCleanup implements ICleanupService {
  isSpaceSufficient(): SpaceCheckResult {
    return { sufficient: true, percentFree: 50, threshold: 15 };
  }
  async runAutoCleanup() { return { cleanedCount: 0, bytesFreed: 0 }; }
  async scheduleCleanupWarning() {}
}

describe('POST /requests/:id/replace-torrent Route', () => {
  let app: FastifyInstance;
  let qb: MockQBittorrent;
  let userToken: string;
  let otherUserToken: string;
  let aliceId: string;
  let bobId: string;

  beforeEach(async () => {
    qb = new MockQBittorrent();
    qb.defaultHash = 'mock_hash_initial';
    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jellyfinService: new MockJellyfin(),
      metadataService: new MockMetadata(),
      qbittorrentService: qb,
      cleanupService: new MockCleanup(),
    });

    await app.ready();

    // Alice login
    const loginAlice = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    const cookieAlice = loginAlice.headers['set-cookie'] as string;
    userToken = cookieAlice.match(/token=([^;]+)/)?.[1] || '';

    // Bob login
    const loginBob = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'bob', password: 'password123' },
    });
    const cookieBob = loginBob.headers['set-cookie'] as string;
    otherUserToken = cookieBob.match(/token=([^;]+)/)?.[1] || '';

    const aliceRecord = app.db.select().from(users).where(eq(users.username, 'alice')).get();
    const bobRecord = app.db.select().from(users).where(eq(users.username, 'bob')).get();
    aliceId = aliceRecord!.id;
    bobId = bobRecord!.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/req-123/replace-torrent',
      payload: { magnetLink: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user is not the request owner and not admin', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req-alice-1',
      userId: aliceId,
      mediaType: 'movie',
      status: RequestStatus.DOWNLOADING,
      metadataId: 'm-1',
      metadataSource: 'tmdb',
      title: 'Interstellar',
      requestedAt: new Date().toISOString(),
      magnetLink: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567',
      qbTorrentHash: 'hash-alice-1',
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req-alice-1/replace-torrent',
      headers: { cookie: `token=${otherUserToken}` }, // Bob
      payload: { magnetLink: 'magnet:?xt=urn:btih:abcdefabcdefabcdefabcdefabcdefabcdefabcd' },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('successfully replaces torrent and returns updated request for owner', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req-alice-2',
      userId: aliceId,
      mediaType: 'movie',
      status: RequestStatus.DOWNLOADING,
      metadataId: 'm-2',
      metadataSource: 'tmdb',
      title: 'Oppenheimer',
      requestedAt: new Date().toISOString(),
      magnetLink: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567',
      qbTorrentHash: 'hash-alice-2',
    }).run();

    qb.defaultHash = 'new_qb_hash_oppenheimer';

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req-alice-2/replace-torrent',
      headers: { cookie: `token=${userToken}` },
      payload: { magnetLink: 'magnet:?xt=urn:btih:9999999999abcdef0123456789abcdef01234567&dn=Oppenheimer.New' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.message).toContain('Torrent replaced');
    expect(body.request.id).toBe('req-alice-2');
    expect(body.request.magnetLink).toContain('dn=Oppenheimer.New');
    expect(body.request.qbTorrentHash).toBe('new_qb_hash_oppenheimer');
  });

  it('returns 400 when invalid payload is supplied', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/req-alice-1/replace-torrent',
      headers: { cookie: `token=${userToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });
});
