import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests, requestCoRequesters, users } from '../src/db/schema';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';

class MockCleanupService implements ICleanupService {
  public cleanedIds: string[] = [];

  constructor(private appInstance: { db: any }) {}

  isSpaceSufficient(): SpaceCheckResult {
    return { sufficient: true, percentFree: 50, threshold: 15 };
  }

  isHostDiskSafe(): boolean {
    return true;
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

describe('Request Co-Requesters & Multi-User Visibility', () => {
  let app: FastifyInstance;
  let userCookie: string;

  beforeEach(async () => {
    const mockQb = new MockQBittorrentService();
    const mockCleanup = new MockCleanupService({ db: null as any });

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: mockQb,
      cleanupService: mockCleanup,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    mockCleanup['appInstance'].db = app.db;

    await app.ready();

    // 1. Admin user
    await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_alice', password: 'password123' },
    });

    // 2. Regular user
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
});
