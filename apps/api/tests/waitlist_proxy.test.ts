import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import { buildWatcherApp } from '../../watcher/src/app';
import { generateMagicLinkToken } from '../../watcher/src/services/notifications';
import { users } from '../src/db/schema';
import { FastifyInstance } from 'fastify';

describe('Waitlist Proxy & UpNext Suppression Integration', () => {
  let mainApp: FastifyInstance;
  let watcherApp: FastifyInstance;
  let watcherUrl: string;

  const SERVICE_KEY = 'test-service-key-12345';

  beforeEach(async () => {
    // 1. Start main API with ephemeral port
    mainApp = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      serviceApiKey: SERVICE_KEY,
      jwtSecret: 'test-jwt-secret-key-32charslong!!',
      cleanupService: {
        isHostDiskSafe: () => true,
        isSpaceSufficient: () => ({ sufficient: true, percentFree: 50, threshold: 15 }),
      } as any,
      qbittorrentService: {
        addTorrent: async () => 'mock-hash-123',
        addTorrentFile: async () => 'mock-hash-123',
        getActiveTorrentCount: async () => 0,
      } as any,
    });
    await mainApp.listen({ port: 0, host: '127.0.0.1' });
    const mainPort = (mainApp.server.address() as any).port;
    const mainApiUrl = `http://127.0.0.1:${mainPort}`;

    // 2. Start watcher with mainApiUrl configured
    watcherApp = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: SERVICE_KEY,
      mainApiUrl,
    });
    await watcherApp.listen({ port: 0, host: '127.0.0.1' });
    const watcherPort = (watcherApp.server.address() as any).port;
    watcherUrl = `http://127.0.0.1:${watcherPort}`;
    (mainApp as any).watcherUrl = watcherUrl;

    // 3. Seed users
    mainApp.db.insert(users).values([
      {
        id: 'user-alice',
        username: 'alice',
        role: 'user',
        jellyfinUserId: 'jf-alice',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-bob',
        username: 'bob',
        role: 'user',
        jellyfinUserId: 'jf-bob',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-admin',
        username: 'admin',
        role: 'admin',
        jellyfinUserId: 'jf-admin',
        createdAt: new Date().toISOString(),
      },
    ]).run();
  });

  afterEach(async () => {
    await mainApp?.close();
    await watcherApp?.close();
  });

  function signToken(id: string, role: 'user' | 'admin', username = id) {
    return mainApp.jwt.sign({
      id,
      username,
      role,
      jellyfinUserId: `jf-${id}`,
    });
  }

  it('proxies POST /waitlist and returns 201 with created entry', async () => {
    const token = signToken('user-alice', 'user');

    const res = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        mediaType: 'movie',
        metadataId: '555',
        metadataSource: 'tmdb',
        title: 'Avatar 3',
        year: 2026,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.title).toBe('Avatar 3');
    expect(body.userId).toBe('user-alice');
    expect(body.status).toBe('checking');
  });

  it('filters entries by caller for user and shows all for admin', async () => {
    const aliceToken = signToken('user-alice', 'user');
    const bobToken = signToken('user-bob', 'user');
    const adminToken = signToken('user-admin', 'admin');

    // Alice creates an entry
    await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        mediaType: 'movie',
        metadataId: '101',
        metadataSource: 'tmdb',
        title: 'Alice Movie',
      },
    });

    // Bob creates an entry
    await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: { authorization: `Bearer ${bobToken}` },
      payload: {
        mediaType: 'movie',
        metadataId: '102',
        metadataSource: 'tmdb',
        title: 'Bob Movie',
      },
    });

    // Alice lists entries
    const aliceList = await mainApp.inject({
      method: 'GET',
      url: '/waitlist',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(aliceList.statusCode).toBe(200);
    const aliceEntries = aliceList.json().entries;
    expect(aliceEntries.length).toBe(1);
    expect(aliceEntries[0].title).toBe('Alice Movie');

    // Admin lists entries -> sees both
    const adminList = await mainApp.inject({
      method: 'GET',
      url: '/waitlist',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(adminList.statusCode).toBe(200);
    const adminEntries = adminList.json().entries;
    expect(adminEntries.length).toBe(2);
    expect(adminEntries.some((e: any) => e.title === 'Alice Movie' && e.requesterUsername === 'alice')).toBe(true);
    expect(adminEntries.some((e: any) => e.title === 'Bob Movie' && e.requesterUsername === 'bob')).toBe(true);
  });

  it('enforces delete authorization: 403 for non-owner, 200 for owner, 200 for admin', async () => {
    const aliceToken = signToken('user-alice', 'user');
    const bobToken = signToken('user-bob', 'user');
    const adminToken = signToken('user-admin', 'admin');

    // Alice creates entry
    const createRes = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        mediaType: 'movie',
        metadataId: '201',
        metadataSource: 'tmdb',
        title: 'Spider-Man Beyond',
      },
    });
    const entryId = createRes.json().id;

    // Bob tries to delete Alice entry -> 403 Forbidden
    const bobDelete = await mainApp.inject({
      method: 'DELETE',
      url: `/waitlist/${entryId}`,
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(bobDelete.statusCode).toBe(403);

    // Admin deletes Alice entry -> 200 OK
    const adminDelete = await mainApp.inject({
      method: 'DELETE',
      url: `/waitlist/${entryId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(adminDelete.statusCode).toBe(200);
    expect(adminDelete.json().entry.status).toBe('cancelled');
    expect(adminDelete.json().entry.cancelledBy).toBe('user-admin');
  });

  it('suppresses series from UpNextShelf when series has active episodic waitlist', async () => {
    const aliceToken = signToken('user-alice', 'user');

    // 1. Add active episodic waitlist entry for Lioness
    await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        mediaType: 'tv_show',
        metadataId: 'tv-lioness-id',
        metadataSource: 'tmdb',
        title: 'Special Ops: Lioness',
        seasonNumber: 1,
      },
    });

    // 2. Query active-episodic from watcher directly
    const activeRes = await mainApp.inject({
      method: 'GET',
      url: '/waitlist/active-episodic?userId=user-alice',
      headers: {
        'x-service-key': SERVICE_KEY,
      },
    });
    expect(activeRes.statusCode).toBe(200);
    expect(activeRes.json().entries.length).toBe(1);
    expect(activeRes.json().entries[0].title).toBe('Special Ops: Lioness');
  });

  it('proxies public GET /waitlist/:id/reject without requiring JWT auth or cookies', async () => {
    const aliceToken = signToken('user-alice', 'user');

    // 1. Alice creates entry
    const createRes = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        mediaType: 'movie',
        metadataId: 'movie-reject-test',
        metadataSource: 'tmdb',
        title: 'Gladiator II',
      },
    });
    const entryId = createRes.json().id;

    // 2. Generate a valid token
    const notifyAt = new Date().toISOString();
    const secret = process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    const token = generateMagicLinkToken(entryId, notifyAt, secret);

    // 3. Reject via Main API WITHOUT auth headers (public magic link)
    const rejectRes = await mainApp.inject({
      method: 'GET',
      url: `/waitlist/${entryId}/reject?token=${encodeURIComponent(token)}`,
    });

    expect(rejectRes.statusCode).toBe(200);
    const body = rejectRes.json();
    expect(body.ok).toBe(true);
    expect(body.entry.status).toBe('checking');
  });

  it('allows S2S POST /requests with X-Service-Key and X-User-Id header', async () => {
    const res = await mainApp.inject({
      method: 'POST',
      url: '/requests',
      headers: {
        'x-service-key': SERVICE_KEY,
        'x-user-id': 'user-alice',
      },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:auto1234567890abcdef1234567890abcdef12345678',
        mediaType: 'movie',
        metadataId: 'tmdb-999',
        metadataSource: 'tmdb',
        title: 'Auto Submitted Movie',
        year: 2025,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.request.title).toBe('Auto Submitted Movie');
    expect(body.request.userId).toBe('user-alice');
  });

  it('creates next season entry on Watcher when waitlistNextSeason is true for a season pack', async () => {
    const token = signToken('user-alice', 'user');

    const res = await mainApp.inject({
      method: 'POST',
      url: '/requests',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:season1pack1234567890abcdef1234567890abcdef1',
        mediaType: 'tv_show',
        metadataId: 'tmdb-tv-101',
        metadataSource: 'tmdb',
        title: 'Stranger Things',
        year: 2016,
        seasonNumber: 1,
        waitlistNextSeason: true,
      },
    });

    expect(res.statusCode).toBe(201);

    // Verify watcher received entry for season 2
    const listRes = await mainApp.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    expect(listRes.statusCode).toBe(200);
    const body = listRes.json();
    const waitlist = body.entries;
    const entry = waitlist.find((w: any) => w.metadataId === 'tmdb-tv-101');
    expect(entry).toBeDefined();
    expect(entry.seasonNumber).toBe(2);
    expect(entry.userId).toBe('user-alice');
  });

  it('does not fail POST /requests if Watcher is unreachable with waitlistNextSeason: true', async () => {
    const token = signToken('user-alice', 'user');

    // Point mainApp to broken watcher url temporarily
    (mainApp as any).watcherUrl = 'http://127.0.0.1:1';

    const res = await mainApp.inject({
      method: 'POST',
      url: '/requests',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:season2pack1234567890abcdef1234567890abcdef2',
        mediaType: 'tv_show',
        metadataId: 'tmdb-tv-102',
        metadataSource: 'tmdb',
        title: 'Dark',
        year: 2017,
        seasonNumber: 1,
        waitlistNextSeason: true,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().request.title).toBe('Dark');
  });

  it('does not create next season entry if request is for a single episode', async () => {
    const token = signToken('user-alice', 'user');

    const res = await mainApp.inject({
      method: 'POST',
      url: '/requests',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:episode1234567890abcdef1234567890abcdef3',
        mediaType: 'tv_show',
        metadataId: 'tmdb-tv-103',
        metadataSource: 'tmdb',
        title: 'The Bear',
        year: 2022,
        seasonNumber: 1,
        episodeNumber: 1,
        waitlistNextSeason: true,
      },
    });

    expect(res.statusCode).toBe(201);

    const listRes = await mainApp.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const body = listRes.json();
    const waitlist = body.entries;
    const entry = waitlist.find((w: any) => w.metadataId === 'tmdb-tv-103');
    expect(entry).toBeUndefined();
  });

  it('allows public magic-link GET /waitlist/:id/approve with valid token', async () => {
    const aliceToken = signToken('user-alice', 'user');

    // 1. Create a waitlist entry
    const createRes = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        mediaType: 'movie',
        metadataId: 'movie-approve-magic',
        metadataSource: 'tmdb',
        title: 'Furiosa',
      },
    });
    const entryId = createRes.json().id;

    // 2. Mark it as notified in watcher
    const notifyAt = new Date().toISOString();
    const { watchRequests } = await import('../../watcher/src/db/schema');
    const { eq } = await import('drizzle-orm');
    watcherApp.db
      .update(watchRequests)
      .set({
        status: 'notified',
        prowlarrReleaseTitle: 'Furiosa.2024.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:furiosa1234567890abcdef1234567890abcdef',
        notifyAt,
      })
      .where(eq(watchRequests.id, entryId))
      .run();

    // 3. Generate magic link token
    const secret = process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    const token = generateMagicLinkToken(entryId, notifyAt, secret);

    // 4. Approve via Main API WITHOUT auth headers (public magic link)
    const approveRes = await mainApp.inject({
      method: 'GET',
      url: `/waitlist/${entryId}/approve?token=${encodeURIComponent(token)}`,
    });

    expect(approveRes.statusCode).toBe(200);
    const body = approveRes.json();
    expect(body.ok).toBe(true);
    expect(body.entry.status).toBe('triggered');
  });

  it('proxies authenticated POST /waitlist/:id/approve from Web UI', async () => {
    const aliceToken = signToken('user-alice', 'user');

    // 1. Create a waitlist entry
    const createRes = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        mediaType: 'movie',
        metadataId: 'movie-approve-post',
        metadataSource: 'tmdb',
        title: 'Kingdom of the Planet of the Apes',
      },
    });
    const entryId = createRes.json().id;

    // 2. Mark it as notified in watcher
    const notifyAt = new Date().toISOString();
    const { watchRequests } = await import('../../watcher/src/db/schema');
    const { eq } = await import('drizzle-orm');
    watcherApp.db
      .update(watchRequests)
      .set({
        status: 'notified',
        prowlarrReleaseTitle: 'Kingdom.Apes.2024.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:kingdomapes1234567890abcdef1234567890',
        notifyAt,
      })
      .where(eq(watchRequests.id, entryId))
      .run();

    // 3. Approve via Main API with user JWT
    const approveRes = await mainApp.inject({
      method: 'POST',
      url: `/waitlist/${entryId}/approve`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });

    expect(approveRes.statusCode).toBe(200);
    const body = approveRes.json();
    expect(body.ok).toBe(true);
    expect(body.entry.status).toBe('triggered');
  });
});