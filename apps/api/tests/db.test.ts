import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { initDatabase, users, invites, downloadRequests, systemConfig } from '../src/db';
import { buildApp } from '../src/app';

describe('Database Schema & Migrations', () => {
  let dbInstance: ReturnType<typeof initDatabase>;

  beforeEach(() => {
    dbInstance = initDatabase(':memory:');
  });

  afterEach(() => {
    dbInstance.sqlite.close();
  });

  it('runs migrations and creates all four tables', () => {
    const tables = dbInstance.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('invites');
    expect(tableNames).toContain('download_requests');
    expect(tableNames).toContain('system_config');
  });

  it('seeds default system_config rows on first run', () => {
    const configs = dbInstance.db.select().from(systemConfig).all();
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    expect(configMap).toEqual({
      concurrent_limit: '2',
      disk_warn_threshold: '20',
      disk_reject_threshold: '15',
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