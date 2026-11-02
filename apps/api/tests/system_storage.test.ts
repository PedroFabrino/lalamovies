import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { MockJellyfinService } from './fixtures/mockJellyfin';

describe('System Storage REST Endpoint (#252)', () => {
  let app: FastifyInstance;
  let userCookie: string;
  let adminCookie: string;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    // Alice is first user -> promoted to admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice_admin', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0]?.value || '';

    // Bob is second user -> regular user role
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'bob_user', password: 'password123' },
    });
    userCookie = userRes.cookies[0]?.value || '';
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/system/storage',
    });
    expect(res.statusCode).toBe(401);
  });

  it('allows authenticated regular users to retrieve storage statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/system/storage',
      cookies: { token: userCookie },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toHaveProperty('storageQuotaGb');
    expect(data).toHaveProperty('storageQuotaBytes');
    expect(data).toHaveProperty('storageFootprintGb');
    expect(data).toHaveProperty('quotaUsedPercent');
    expect(data).toHaveProperty('percentFree');
    expect(data).toHaveProperty('percentUsed');
    expect(typeof data.storageQuotaGb).toBe('number');
    expect(typeof data.quotaUsedPercent).toBe('number');
  });

  it('allows authenticated admin users to retrieve storage statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/system/storage',
      cookies: { token: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.storageQuotaGb).toBe(150);
    expect(data.quotaUsedPercent).toBeGreaterThanOrEqual(0);
  });

  it('works on the /api/system/storage prefix alias', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/system/storage',
      cookies: { token: userCookie },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toHaveProperty('storageQuotaGb');
  });
});
