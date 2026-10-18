import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { users } from '../src/db/schema';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';
import { IProwlarrService, PreferredIndexerCookieStatus, PreferredIndexerCookieResult } from '../src/services/prowlarr';
import { maskCookie } from '../src/services/prowlarr/prowlarrCookie';

class MockProwlarrService implements Partial<IProwlarrService> {
  public statusToReturn: PreferredIndexerCookieStatus = {
    configured: true,
    indexerId: 5,
    indexerName: 'BJ-Share',
    hasCookie: true,
    cookiePreview: '__cfbbid=123456...9876543210',
    isExpired: false,
    status: 'ok',
    message: 'Cookie is active and valid.',
    lastChecked: '2026-10-18T00:00:00.000Z',
  };

  public testResultToReturn: PreferredIndexerCookieResult = {
    ok: true,
    message: 'Cookie verified successfully for BJ-Share.',
  };

  public updateResultToReturn: PreferredIndexerCookieResult = {
    ok: true,
    message: 'Cookie updated and verified for BJ-Share.',
  };

  public lastTestedCookie?: string;
  public lastUpdatedCookie?: string;

  isConfigured(): boolean {
    return true;
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }

  async getPreferredIndexerCookieStatus(): Promise<PreferredIndexerCookieStatus> {
    return this.statusToReturn;
  }

  async testPreferredIndexerCookie(cookieOverride?: string): Promise<PreferredIndexerCookieResult> {
    this.lastTestedCookie = cookieOverride;
    return this.testResultToReturn;
  }

  async updatePreferredIndexerCookie(newCookie: string): Promise<PreferredIndexerCookieResult> {
    this.lastUpdatedCookie = newCookie;
    return this.updateResultToReturn;
  }
}

describe('Preferred Indexer Cookie Management API (Ticket #242)', () => {
  let app: FastifyInstance;
  let mockProwlarr: MockProwlarrService;
  let adminCookie: string;
  let userCookie: string;

  beforeEach(async () => {
    mockProwlarr = new MockProwlarrService();

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: new MockQBittorrentService(),
      prowlarrService: mockProwlarr as unknown as IProwlarrService,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    // 1. Create first user -> Admin (first user is promoted to admin automatically)
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_alice', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;

    // 2. Create second user -> Regular user
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

  describe('maskCookie helper', () => {
    it('masks long cookies properly', () => {
      const masked = maskCookie('__cfbbid=3139324337; session=74tmuojPnp8HcPCZtNWMsVIUkE2yhdeR==');
      expect(masked.startsWith('__cfbbid=31393')).toBe(true);
      expect(masked.endsWith('yhdeR==')).toBe(true);
      expect(masked).toContain('...');
    });

    it('handles short cookies safely', () => {
      expect(maskCookie('short_cookie')).toBe('********');
    });
  });

  describe('GET /admin/preferred-indexer/cookie', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/preferred-indexer/cookie',
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects regular users with 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/preferred-indexer/cookie',
        cookies: { token: userCookie },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns preferred indexer cookie status to admins', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/preferred-indexer/cookie',
        cookies: { token: adminCookie },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.configured).toBe(true);
      expect(body.indexerName).toBe('BJ-Share');
      expect(body.hasCookie).toBe(true);
      expect(body.cookiePreview).toBe('__cfbbid=123456...9876543210');
      expect(body.isExpired).toBe(false);
    });
  });

  describe('POST /admin/preferred-indexer/cookie/test', () => {
    it('returns 200 when cookie test passes', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/admin/preferred-indexer/cookie/test',
        cookies: { token: adminCookie },
        payload: { cookie: 'candidate_cookie_value' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.ok).toBe(true);
      expect(mockProwlarr.lastTestedCookie).toBe('candidate_cookie_value');
    });

    it('returns 400 when cookie test fails', async () => {
      mockProwlarr.testResultToReturn = {
        ok: false,
        message: 'Query successful, but no results were returned from your indexer.',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/admin/preferred-indexer/cookie/test',
        cookies: { token: adminCookie },
        payload: { cookie: 'expired_cookie' },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.ok).toBe(false);
      expect(body.message).toContain('Query successful, but no results were returned');
    });
  });

  describe('PUT /admin/preferred-indexer/cookie', () => {
    it('returns 400 when cookie payload is missing or empty', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/admin/preferred-indexer/cookie',
        cookies: { token: adminCookie },
        payload: { cookie: '   ' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe('Cookie string is required');
    });

    it('returns 200 when updating cookie succeeds', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/admin/preferred-indexer/cookie',
        cookies: { token: adminCookie },
        payload: { cookie: '__cfbbid=new; session=valid' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
      expect(mockProwlarr.lastUpdatedCookie).toBe('__cfbbid=new; session=valid');
    });

    it('returns 400 when Prowlarr rejects the updated cookie', async () => {
      mockProwlarr.updateResultToReturn = {
        ok: false,
        message: 'Validation failed in Prowlarr for indexer BJ-Share',
      };

      const res = await app.inject({
        method: 'PUT',
        url: '/admin/preferred-indexer/cookie',
        cookies: { token: adminCookie },
        payload: { cookie: 'bad_cookie' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().ok).toBe(false);
      expect(res.json().message).toContain('Validation failed');
    });
  });
});
