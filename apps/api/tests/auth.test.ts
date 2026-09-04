import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { IJellyfinService, InvalidCredentialsError, JellyfinApiError } from '../src/services/jellyfin';
import { authMiddleware, adminGuard } from '../src/middleware/auth';

class MockJellyfinService implements IJellyfinService {
  async authenticateUser(username: string, password: string) {
    if (username === 'bad_user' || password === 'wrong_pass') {
      throw new InvalidCredentialsError();
    }
    if (username === 'server_error') {
      throw new JellyfinApiError('Connection refused');
    }
    return {
      accessToken: `token_${username}`,
      userId: `jf_${username}`,
      username,
      isAdmin: false,
    };
  }
}

describe('Auth Integration', () => {
  let app: FastifyInstance;
  let mockJellyfin: MockJellyfinService;

  beforeEach(async () => {
    mockJellyfin = new MockJellyfinService();
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: mockJellyfin,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    // Add a test route guarded by adminGuard for testing role enforcement
    app.get(
      '/admin-only-test',
      { preHandler: [authMiddleware, adminGuard] },
      async (_req, reply) => reply.send({ secret: 'admin-access-granted' })
    );

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('validates request body on POST /auth/login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Bad Request');
  });

  it('returns 401 for invalid Jellyfin credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'bad_user',
        password: 'wrong_pass',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
    expect(res.json().message).toBe('Invalid Jellyfin username or password');
  });

  it('returns 500 when Jellyfin server encounters an unexpected error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'server_error',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(500);
  });

  it('first user to log in is automatically promoted to admin and receives JWT cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'alice',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.username).toBe('alice');
    expect(body.user.role).toBe('admin');
    expect(body.user.id).toBeDefined();

    const cookieHeader = res.headers['set-cookie'] as string;
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain('token=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('SameSite=Strict');
  });

  it('subsequent user to log in receives user role', async () => {
    // First user -> admin
    await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });

    // Second user -> user
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'bob', password: 'password123' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.username).toBe('bob');
    expect(res.json().user.role).toBe('user');
  });

  it('existing user logging in again does not duplicate record', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    const id1 = res1.json().user.id;

    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    const id2 = res2.json().user.id;

    expect(id1).toBe(id2);
  });

  it('GET /auth/me returns 401 without cookie, and 200 with valid cookie', async () => {
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });
    expect(unauthRes.statusCode).toBe(401);

    // Log in
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    const cookies = loginRes.cookies;

    const authRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: {
        token: cookies[0].value,
      },
    });

    expect(authRes.statusCode).toBe(200);
    expect(authRes.json().user.username).toBe('alice');
  });

  it('POST /auth/logout clears cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    const cookieHeader = res.headers['set-cookie'] as string;
    expect(cookieHeader).toContain('token=;');
  });

  it('adminGuard allows admin but rejects regular user with 403', async () => {
    // Admin login
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    const adminCookie = adminLogin.cookies[0].value;

    // User login
    const userLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'bob', password: 'password123' },
    });
    const userCookie = userLogin.cookies[0].value;

    // Regular user accessing admin route -> 403
    const forbiddenRes = await app.inject({
      method: 'GET',
      url: '/admin-only-test',
      cookies: { token: userCookie },
    });
    expect(forbiddenRes.statusCode).toBe(403);
    expect(forbiddenRes.json().error).toBe('Forbidden');

    // Admin accessing admin route -> 200
    const allowedRes = await app.inject({
      method: 'GET',
      url: '/admin-only-test',
      cookies: { token: adminCookie },
    });
    expect(allowedRes.statusCode).toBe(200);
    expect(allowedRes.json().secret).toBe('admin-access-granted');
  });
});