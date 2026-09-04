import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { IJellyfinService, JellyfinApiError } from '../src/services/jellyfin';
import { users, invites } from '../src/db/schema';

class MockJellyfinService implements IJellyfinService {
  public createdUsers: { username: string; id: string }[] = [];
  public deletedUsers: string[] = [];
  public shouldFailCreate = false;

  async authenticateUser(username: string) {
    return {
      accessToken: `token_${username}`,
      userId: `jf_${username}`,
      username,
      isAdmin: false,
    };
  }

  async createUser(username: string) {
    if (this.shouldFailCreate) {
      throw new JellyfinApiError('Jellyfin user creation error', 500);
    }
    const id = `jf_${username}_${Date.now()}`;
    this.createdUsers.push({ username, id });
    return id;
  }

  async deleteUser(userId: string) {
    this.deletedUsers.push(userId);
  }
}

describe('Invite Flow Integration', () => {
  let app: FastifyInstance;
  let mockJellyfin: MockJellyfinService;
  let adminCookie: string;
  let userCookie: string;

  beforeEach(async () => {
    mockJellyfin = new MockJellyfinService();
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: mockJellyfin,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    await app.ready();

    // 1. First login -> admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_user', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;

    // 2. Second login -> normal user
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'regular_user', password: 'password123' },
    });
    userCookie = userRes.cookies[0].value;
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects POST /invites if unauthenticated or non-admin', async () => {
    const unauth = await app.inject({
      method: 'POST',
      url: '/invites',
    });
    expect(unauth.statusCode).toBe(401);

    const nonAdmin = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: userCookie },
    });
    expect(nonAdmin.statusCode).toBe(403);
  });

  it('admin can generate an invite with 48h expiry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: adminCookie },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.invite.token).toBeDefined();
    expect(body.url).toContain(body.invite.token);

    const expiry = new Date(body.invite.expiresAt).getTime();
    const now = Date.now();
    const diffHours = (expiry - now) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(47);
    expect(diffHours).toBeLessThanOrEqual(48);
  });

  it('admin can list all invites with status', async () => {
    // Create an invite
    await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: adminCookie },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/invites',
      cookies: { token: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.invites.length).toBe(1);
    expect(body.invites[0].status).toBe('pending');
    expect(body.invites[0].creatorUsername).toBe('admin_user');
  });

  it('GET /invites/:token validates invite token state', async () => {
    // 404 for unknown token
    const notFound = await app.inject({
      method: 'GET',
      url: '/invites/non-existent-token',
    });
    expect(notFound.statusCode).toBe(404);
    expect(notFound.json().valid).toBe(false);

    // Fresh token -> valid
    const createRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: adminCookie },
    });
    const token = createRes.json().invite.token;

    const validRes = await app.inject({
      method: 'GET',
      url: `/invites/${token}`,
    });
    expect(validRes.statusCode).toBe(200);
    expect(validRes.json().valid).toBe(true);

    // Expired token -> 400
    app.db
      .update(invites)
      .set({ expiresAt: new Date(Date.now() - 10000).toISOString() })
      .where(eq(invites.token, token))
      .run();

    const expiredRes = await app.inject({
      method: 'GET',
      url: `/invites/${token}`,
    });
    expect(expiredRes.statusCode).toBe(400);
    expect(expiredRes.json().reason).toBe('expired');
  });

  it('friend can accept invite: creates Jellyfin user, DB user, marks used, and logs in', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: adminCookie },
    });
    const token = createRes.json().invite.token;

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      payload: {
        username: 'friend_bob',
        password: 'securePassword123',
      },
    });

    expect(acceptRes.statusCode).toBe(201);
    const body = acceptRes.json();
    expect(body.user.username).toBe('friend_bob');
    expect(body.user.role).toBe('user');

    // Jellyfin user created
    expect(mockJellyfin.createdUsers.some((u) => u.username === 'friend_bob')).toBe(true);

    // Database user exists
    const dbUser = app.db
      .select()
      .from(users)
      .where(eq(users.username, 'friend_bob'))
      .get();
    expect(dbUser).toBeDefined();

    // Invite marked as used
    const inviteRow = app.db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .get();
    expect(inviteRow?.usedAt).toBeDefined();

    // JWT cookie received and allows authenticated calls
    const friendCookie = acceptRes.cookies[0].value;
    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { token: friendCookie },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.username).toBe('friend_bob');

    // Re-accepting used invite fails
    const reAccept = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      payload: {
        username: 'another_friend',
        password: 'anotherPassword123',
      },
    });
    expect(reAccept.statusCode).toBe(400);
    expect(reAccept.json().message).toContain('already been used');
  });

  it('handles Jellyfin failure during invite accept gracefully without creating DB user', async () => {
    mockJellyfin.shouldFailCreate = true;

    const createRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: adminCookie },
    });
    const token = createRes.json().invite.token;

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      payload: {
        username: 'failed_user',
        password: 'password123',
      },
    });

    expect(acceptRes.statusCode).toBe(502);

    // No user created in DB
    const dbUser = app.db
      .select()
      .from(users)
      .where(eq(users.username, 'failed_user'))
      .get();
    expect(dbUser).toBeUndefined();

    // Invite still unused
    const inviteRow = app.db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .get();
    expect(inviteRow?.usedAt).toBeNull();
  });

  it('admin can revoke an unused invite with DELETE /invites/:token', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: adminCookie },
    });
    const token = createRes.json().invite.token;

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/invites/${token}`,
      cookies: { token: adminCookie },
    });
    expect(deleteRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: 'GET',
      url: `/invites/${token}`,
    });
    expect(getRes.statusCode).toBe(404);
  });
});