import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { initDatabase, users, invites, downloadRequests, systemConfig, requestCoRequesters } from '../src/db';
import { buildApp } from '../src/app';

describe('Database Schema & Migrations', () => {
  let dbInstance: ReturnType<typeof initDatabase>;

  beforeEach(() => {
    dbInstance = initDatabase(':memory:');
  });

  afterEach(() => {
    dbInstance.sqlite.close();
  });

  it('runs migrations and creates all tables', () => {
    const tables = dbInstance.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('invites');
    expect(tableNames).toContain('download_requests');
    expect(tableNames).toContain('system_config');
    expect(tableNames).toContain('request_co_requesters');
  });

  it('seeds default system_config rows on first run', () => {
    const configs = dbInstance.db.select().from(systemConfig).all();
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    expect(configMap).toEqual({
      concurrent_limit: '2',
      disk_warn_threshold: '20',
      disk_reject_threshold: '15',
      storage_quota_gb: '150',
    });
  });

  it('supports CRUD on users table', () => {
    const now = new Date().toISOString();
    dbInstance.db.insert(users).values({
      id: 'usr_1',
      jellyfinUserId: 'jf_123',
      username: 'alice',
      email: 'alice@example.com',
      role: 'admin',
      createdAt: now,
    }).run();

    const inserted = dbInstance.db.select().from(users).where(eq(users.id, 'usr_1')).get();
    expect(inserted).toBeDefined();
    expect(inserted?.username).toBe('alice');
    expect(inserted?.role).toBe('admin');
  });

  it('enforces foreign key constraints between users and invites', () => {
    const now = new Date().toISOString();

    // Inserting an invite without a valid user must fail FK check
    expect(() => {
      dbInstance.db.insert(invites).values({
        id: 'inv_1',
        token: 'token-abc',
        createdByUserId: 'non_existent_user',
        expiresAt: now,
      }).run();
    }).toThrow();

    // Create valid user first
    dbInstance.db.insert(users).values({
      id: 'usr_2',
      jellyfinUserId: 'jf_456',
      username: 'bob',
      createdAt: now,
    }).run();

    // Now inserting invite succeeds
    dbInstance.db.insert(invites).values({
      id: 'inv_1',
      token: 'token-abc',
      createdByUserId: 'usr_2',
      expiresAt: now,
    }).run();

    const found = dbInstance.db.select().from(invites).where(eq(invites.id, 'inv_1')).get();
    expect(found?.token).toBe('token-abc');

    // Deleting user cascades to invite
    dbInstance.db.delete(users).where(eq(users.id, 'usr_2')).run();
    const afterCascade = dbInstance.db.select().from(invites).where(eq(invites.id, 'inv_1')).get();
    expect(afterCascade).toBeUndefined();
  });

  it('supports download_requests lifecycle fields and defaults', () => {
    const now = new Date().toISOString();
    dbInstance.db.insert(users).values({
      id: 'usr_3',
      jellyfinUserId: 'jf_789',
      username: 'charlie',
      createdAt: now,
    }).run();

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_1',
      userId: 'usr_3',
      magnetLink: 'magnet:?xt=urn:btih:test',
      mediaType: 'movie',
      metadataId: '550',
      metadataSource: 'tmdb',
      title: 'Fight Club',
      year: 1999,
      requestedAt: now,
    }).run();

    const req = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_1')).get();
    expect(req).toBeDefined();
    expect(req?.title).toBe('Fight Club');
    expect(req?.status).toBe('queued');
    expect(req?.keepFlag).toBe(false);
  });

  it('enforces primary key and foreign key cascades on request_co_requesters', () => {
    const now = new Date().toISOString();

    dbInstance.db.insert(users).values({
      id: 'usr_owner',
      jellyfinUserId: 'jf_owner',
      username: 'alice',
      createdAt: now,
    }).run();

    dbInstance.db.insert(users).values({
      id: 'usr_co',
      jellyfinUserId: 'jf_co',
      username: 'bob',
      createdAt: now,
    }).run();

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_parent',
      userId: 'usr_owner',
      magnetLink: 'magnet:?xt=urn:btih:test',
      mediaType: 'movie',
      metadataId: '550',
      metadataSource: 'tmdb',
      title: 'Fight Club',
      requestedAt: now,
    }).run();

    // 1. Foreign key on invalid requestId fails
    expect(() => {
      dbInstance.db.insert(requestCoRequesters).values({
        requestId: 'non_existent_req',
        userId: 'usr_co',
        addedAt: now,
      }).run();
    }).toThrow();

    // 2. Foreign key on invalid userId fails
    expect(() => {
      dbInstance.db.insert(requestCoRequesters).values({
        requestId: 'req_parent',
        userId: 'non_existent_usr',
        addedAt: now,
      }).run();
    }).toThrow();

    // 3. Valid insert succeeds
    dbInstance.db.insert(requestCoRequesters).values({
      requestId: 'req_parent',
      userId: 'usr_co',
      addedAt: now,
    }).run();

    const row = dbInstance.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, 'req_parent')).get();
    expect(row).toBeDefined();
    expect(row?.userId).toBe('usr_co');

    // 4. Duplicate (requestId, userId) violates composite primary key
    expect(() => {
      dbInstance.db.insert(requestCoRequesters).values({
        requestId: 'req_parent',
        userId: 'usr_co',
        addedAt: now,
      }).run();
    }).toThrow();

    // 5. Deleting user cascades to request_co_requesters
    dbInstance.db.delete(users).where(eq(users.id, 'usr_co')).run();
    const afterUserDelete = dbInstance.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, 'req_parent')).get();
    expect(afterUserDelete).toBeUndefined();

    // Re-create user and re-insert co-requester
    dbInstance.db.insert(users).values({
      id: 'usr_co2',
      jellyfinUserId: 'jf_co2',
      username: 'bob2',
      createdAt: now,
    }).run();

    dbInstance.db.insert(requestCoRequesters).values({
      requestId: 'req_parent',
      userId: 'usr_co2',
      addedAt: now,
    }).run();

    // 6. Deleting parent download_request cascades to request_co_requesters
    dbInstance.db.delete(downloadRequests).where(eq(downloadRequests.id, 'req_parent')).run();
    const afterReqDelete = dbInstance.db.select().from(requestCoRequesters).where(eq(requestCoRequesters.requestId, 'req_parent')).get();
    expect(afterReqDelete).toBeUndefined();
  });

  it('enforces partial unique indexes on active download requests (race condition guard)', () => {
    const now = new Date().toISOString();

    dbInstance.db.insert(users).values({
      id: 'usr_idx',
      jellyfinUserId: 'jf_idx',
      username: 'idx_tester',
      createdAt: now,
    }).run();

    // 1. Active movie insert
    dbInstance.db.insert(downloadRequests).values({
      id: 'req_mov_1',
      userId: 'usr_idx',
      magnetLink: 'mag1',
      mediaType: 'movie',
      metadataId: '550',
      metadataSource: 'tmdb',
      title: 'Fight Club',
      status: 'downloading',
      requestedAt: now,
    }).run();

    // Duplicate active movie throws unique constraint
    expect(() => {
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_mov_2',
        userId: 'usr_idx',
        magnetLink: 'mag2',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
        status: 'queued',
        requestedAt: now,
      }).run();
    }).toThrow();

    // Deleting the first allows inserting another
    dbInstance.db.update(downloadRequests).set({ status: 'deleted' }).where(eq(downloadRequests.id, 'req_mov_1')).run();
    expect(() => {
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_mov_3',
        userId: 'usr_idx',
        magnetLink: 'mag3',
        mediaType: 'movie',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
        status: 'queued',
        requestedAt: now,
      }).run();
    }).not.toThrow();

    // 2. Duplicate active season pack throws
    dbInstance.db.insert(downloadRequests).values({
      id: 'req_sp_1',
      userId: 'usr_idx',
      magnetLink: 'mag_sp1',
      mediaType: 'tv_show',
      metadataId: '1396',
      metadataSource: 'tmdb',
      title: 'Breaking Bad',
      seasonNumber: 1,
      episodeNumber: null,
      status: 'downloading',
      requestedAt: now,
    }).run();

    expect(() => {
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_sp_2',
        userId: 'usr_idx',
        magnetLink: 'mag_sp2',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: null,
        status: 'queued',
        requestedAt: now,
      }).run();
    }).toThrow();

    // 3. Duplicate active episode throws, but different episode succeeds
    dbInstance.db.insert(downloadRequests).values({
      id: 'req_ep_1',
      userId: 'usr_idx',
      magnetLink: 'mag_ep1',
      mediaType: 'tv_show',
      metadataId: '1396',
      metadataSource: 'tmdb',
      title: 'Breaking Bad',
      seasonNumber: 2,
      episodeNumber: 1,
      status: 'downloading',
      requestedAt: now,
    }).run();

    expect(() => {
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_ep_1_dup',
        userId: 'usr_idx',
        magnetLink: 'mag_ep1_dup',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 2,
        episodeNumber: 1,
        status: 'queued',
        requestedAt: now,
      }).run();
    }).toThrow();

    // Different episode (S2E2) succeeds
    expect(() => {
      dbInstance.db.insert(downloadRequests).values({
        id: 'req_ep_2',
        userId: 'usr_idx',
        magnetLink: 'mag_ep2',
        mediaType: 'tv_show',
        metadataId: '1396',
        metadataSource: 'tmdb',
        title: 'Breaking Bad',
        seasonNumber: 2,
        episodeNumber: 2,
        status: 'queued',
        requestedAt: now,
      }).run();
    }).not.toThrow();
  });

  it('decorates fastify app with db and sqlite instances', async () => {
    const app = buildApp({ dbPath: ':memory:' });
    expect(app.db).toBeDefined();
    expect(app.sqlite).toBeDefined();

    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(res.statusCode).toBe(200);

    await app.close();
  });
});