import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests, requestCoRequesters } from '../src/db/schema';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';

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

describe('Cross-Media-Type Unified Series Deduplication (#179)', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let mockCleanup: MockCleanupService;
  let aliceCookie: string;
  let bobCookie: string;

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

    // Alice -> user 1
    const aliceRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    aliceCookie = aliceRes.cookies[0].value;

    // Bob -> user 2
    const bobRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'bob', password: 'password123' },
    });
    bobCookie = bobRes.cookies[0].value;
  });

  afterEach(async () => {
    await app.close();
  });

  it('attaches user as co-requester when requesting anime for existing tv_show and preserves original mediaType', async () => {
    // 1. Alice creates tv_show request for Frieren S01
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:frieren1',
        mediaType: 'tv_show',
        metadataId: '209867',
        metadataSource: 'tmdb',
        title: "Frieren: Beyond Journey's End",
        seasonNumber: 1,
      },
    });
    expect(res1.statusCode).toBe(201);
    const originalReq = res1.json().request;
    expect(originalReq.mediaType).toBe('tv_show');

    // 2. Bob creates request for same TMDB ID as anime
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:frieren2',
        mediaType: 'anime',
        metadataId: '209867',
        metadataSource: 'tmdb',
        title: 'Sousou no Frieren',
        seasonNumber: 1,
      },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = res2.json();
    expect(body2.request.id).toBe(originalReq.id);
    // Preserves original mediaType
    expect(body2.request.mediaType).toBe('tv_show');

    // Verify Bob is added as co-requester in database
    const coReqs = app.db
      .select()
      .from(requestCoRequesters)
      .where(eq(requestCoRequesters.requestId, originalReq.id))
      .all();
    expect(coReqs).toHaveLength(1);
    expect(mockQb.addedTorrents).toHaveLength(1);
  });

  it('attaches user as co-requester when requesting tv_show for existing anime and preserves original mediaType', async () => {
    // 1. Alice creates anime request
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:dungeon1',
        mediaType: 'anime',
        metadataId: '206586',
        metadataSource: 'tmdb',
        title: 'Delicious in Dungeon',
        seasonNumber: 1,
      },
    });
    expect(res1.statusCode).toBe(201);
    const originalReq = res1.json().request;
    expect(originalReq.mediaType).toBe('anime');

    // 2. Bob creates tv_show request for same TMDB ID
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:dungeon2',
        mediaType: 'tv_show',
        metadataId: '206586',
        metadataSource: 'tmdb',
        title: 'Dungeon Meshi',
        seasonNumber: 1,
      },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = res2.json();
    expect(body2.request.id).toBe(originalReq.id);
    expect(body2.request.mediaType).toBe('anime');
    expect(mockQb.addedTorrents).toHaveLength(1);
  });

  it('allows single episode anime request when tv_show season pack exists', async () => {
    // Alice requests tv_show Season 1 pack
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:pack1',
        mediaType: 'tv_show',
        metadataId: '12345',
        metadataSource: 'tmdb',
        title: 'Show Name',
        seasonNumber: 1,
      },
    });
    expect(res1.statusCode).toBe(201);
    const origId = res1.json().request.id;

    // Bob requests anime Episode 3 for same TMDB ID - independent download, not blocked by pack
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:ep3',
        mediaType: 'anime',
        metadataId: '12345',
        metadataSource: 'tmdb',
        title: 'Show Name',
        seasonNumber: 1,
        episodeNumber: 3,
      },
    });

    expect(res2.statusCode).toBe(201);
    expect(res2.json().request.id).not.toBe(origId);
  });

  it('does NOT conflate movies with series having the same TMDB ID', async () => {
    // Alice creates movie with ID 1000
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:mov1',
        mediaType: 'movie',
        metadataId: '1000',
        metadataSource: 'tmdb',
        title: 'Movie 1000',
        year: 2020,
      },
    });
    expect(res1.statusCode).toBe(201);

    // Bob creates tv_show with ID 1000
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: bobCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:show1',
        mediaType: 'tv_show',
        metadataId: '1000',
        metadataSource: 'tmdb',
        title: 'Show 1000',
        seasonNumber: 1,
      },
    });
    expect(res2.statusCode).toBe(201);
    expect(res2.json().request.id).not.toBe(res1.json().request.id);
  });

  it('detects existing request via /requests/exists regardless of whether queried as tv_show or anime', async () => {
    await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:series1',
        mediaType: 'tv_show',
        metadataId: '998877',
        metadataSource: 'tmdb',
        title: 'Some Series',
        seasonNumber: 1,
      },
    });

    // Query exists as anime
    const existsRes = await app.inject({
      method: 'GET',
      url: '/requests/exists?mediaType=anime&metadataId=998877&metadataSource=tmdb&seasonNumber=1',
      cookies: { token: bobCookie },
    });

    expect(existsRes.statusCode).toBe(200);
    const body = existsRes.json();
    expect(body.exists).toBe(true);
    expect(body.request.mediaType).toBe('tv_show');
  });

  it('rejects POST /requests with metadataSource anilist with 400 Bad Request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: aliceCookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:anime-anilist',
        mediaType: 'anime',
        metadataId: '12345',
        metadataSource: 'anilist',
        title: 'Anilist Ingest Attempt',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain("metadataSource must be 'tmdb'");
  });
});
