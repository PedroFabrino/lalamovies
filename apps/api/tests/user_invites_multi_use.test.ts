import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { users, invites } from '../src/db/schema';
import { MockJellyfinService } from './fixtures/mockJellyfin';

describe('Multi-Use Revocable User Invites (Spec #168)', () => {
  let app: FastifyInstance;
  let mockJellyfin: MockJellyfinService;
  let adminCookie: string;
  let aliceCookie: string;
  let bobCookie: string;
  let aliceUserId: string;

  beforeEach(async () => {
    mockJellyfin = new MockJellyfinService();
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: mockJellyfin,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    await app.ready();

    // Admin login (first user registered)
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_user', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;

    // Alice login (second user registered -> regular user)
    const aliceRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    aliceCookie = aliceRes.cookies[0].value;
    const aliceRow = app.db.select().from(users).where(eq(users.username, 'alice')).get()!;
    aliceUserId = aliceRow.id;

    // Bob login (third user registered -> regular user)
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

  it('regular user generates multi-use invite link with role forced to user and expiresAt null', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: aliceCookie },
      payload: { role: 'trusted', expiryHours: 10 }, // should be ignored for regular users
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.invite.role).toBe('user');
    expect(body.invite.expiresAt).toBeNull();
    expect(body.invite.createdByUserId).toBe(aliceUserId);
    expect(body.url).toContain(`/invite/${body.invite.token}`);

    // GET /invites/my-link returns the active link
    const myLinkRes = await app.inject({
      method: 'GET',
      url: '/invites/my-link',
      cookies: { token: aliceCookie },
    });
    expect(myLinkRes.statusCode).toBe(200);
    const myLinkBody = myLinkRes.json();
    expect(myLinkBody.invite.token).toBe(body.invite.token);
    expect(myLinkBody.url).toBe(body.url);
    expect(myLinkBody.invitedUsers).toEqual([]);
  });

  it('generating a new link automatically revokes previous active link for the caller', async () => {
    const firstRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: aliceCookie },
    });
    const firstToken = firstRes.json().invite.token;

    const secondRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: aliceCookie },
    });
    const secondToken = secondRes.json().invite.token;
    expect(secondToken).not.toBe(firstToken);

    // First invite should now be revoked in DB
    const firstRow = app.db.select().from(invites).where(eq(invites.token, firstToken)).get()!;
    expect(firstRow.revokedAt).not.toBeNull();

    // Second invite should be active
    const secondRow = app.db.select().from(invites).where(eq(invites.token, secondToken)).get()!;
    expect(secondRow.revokedAt).toBeNull();

    // Public check on first token reports revoked
    const checkFirst = await app.inject({
      method: 'GET',
      url: `/invites/${firstToken}`,
    });
    expect(checkFirst.statusCode).toBe(400);
    expect(checkFirst.json().reason).toBe('revoked');
  });

  it('allows multiple users to sequentially register using the same multi-use token with attribution', async () => {
    const inviteRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: aliceCookie },
    });
    const token = inviteRes.json().invite.token;

    // Check public invite info includes creator username
    const pubCheck = await app.inject({
      method: 'GET',
      url: `/invites/${token}`,
    });
    expect(pubCheck.statusCode).toBe(200);
    expect(pubCheck.json().creatorUsername).toBe('alice');

    // 1st friend accepts
    const accept1 = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      payload: { username: 'friend_one', password: 'password123' },
    });
    expect(accept1.statusCode).toBe(201);
    const user1 = app.db.select().from(users).where(eq(users.username, 'friend_one')).get()!;
    expect(user1.invitedByUserId).toBe(aliceUserId);
    expect(user1.inviteId).toBe(inviteRes.json().invite.id);

    // Multi-use token should still have usedAt = null
    const inviteRow = app.db.select().from(invites).where(eq(invites.token, token)).get()!;
    expect(inviteRow.usedAt).toBeNull();

    // 2nd friend accepts the exact same token
    const accept2 = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      payload: { username: 'friend_two', password: 'password123' },
    });
    expect(accept2.statusCode).toBe(201);
    const user2 = app.db.select().from(users).where(eq(users.username, 'friend_two')).get()!;
    expect(user2.invitedByUserId).toBe(aliceUserId);
    expect(user2.inviteId).toBe(inviteRes.json().invite.id);

    // Alice checks /invites/my-link and sees invited friends
    const myLink = await app.inject({
      method: 'GET',
      url: '/invites/my-link',
      cookies: { token: aliceCookie },
    });
    expect(myLink.statusCode).toBe(200);
    expect(myLink.json().invitedUsers).toEqual(expect.arrayContaining(['friend_one', 'friend_two']));
  });

  it('creator or admin can revoke invite, unauthorized users cannot', async () => {
    const inviteRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: aliceCookie },
    });
    const token = inviteRes.json().invite.token;

    // Bob attempts to revoke Alice's invite -> 403
    const bobRevoke = await app.inject({
      method: 'POST',
      url: `/invites/${token}/revoke`,
      cookies: { token: bobCookie },
    });
    expect(bobRevoke.statusCode).toBe(403);

    // Alice revokes her own invite -> 200
    const aliceRevoke = await app.inject({
      method: 'POST',
      url: `/invites/${token}/revoke`,
      cookies: { token: aliceCookie },
    });
    expect(aliceRevoke.statusCode).toBe(200);

    // Subsequent registration fails
    const failAccept = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      payload: { username: 'charlie', password: 'password123' },
    });
    expect(failAccept.statusCode).toBe(400);
    expect(failAccept.json().message).toContain('revoked');

    // Admin can also revoke any invite
    const inviteRes2 = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: aliceCookie },
    });
    const token2 = inviteRes2.json().invite.token;

    const adminRevoke = await app.inject({
      method: 'POST',
      url: `/invites/${token2}/revoke`,
      cookies: { token: adminCookie },
    });
    expect(adminRevoke.statusCode).toBe(200);
  });

  it('admin can toggle invitesEnabled permission and views referral reporting', async () => {
    // Disable Alice's invite permission
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/admin/users/${aliceUserId}/invites-permission`,
      cookies: { token: adminCookie },
      payload: { invitesEnabled: false },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().user.invitesEnabled).toBe(false);

    // Alice now blocked from generating invites
    const blockedRes = await app.inject({
      method: 'POST',
      url: '/invites',
      cookies: { token: aliceCookie },
    });
    expect(blockedRes.statusCode).toBe(403);

    // Admin lists users and verifies referral join and invitesEnabled flag
    const usersListRes = await app.inject({
      method: 'GET',
      url: '/admin/users',
      cookies: { token: adminCookie },
    });
    expect(usersListRes.statusCode).toBe(200);
    const usersBody = usersListRes.json();
    const aliceInList = usersBody.users.find((u: any) => u.id === aliceUserId);
    expect(aliceInList.invitesEnabled).toBe(false);

    // Admin lists invites and verifies usageCount and invitedUsers
    const invitesListRes = await app.inject({
      method: 'GET',
      url: '/invites',
      cookies: { token: adminCookie },
    });
    expect(invitesListRes.statusCode).toBe(200);
    const invitesBody = invitesListRes.json();
    expect(Array.isArray(invitesBody.invites)).toBe(true);
    for (const inv of invitesBody.invites) {
      expect(inv).toHaveProperty('usageCount');
      expect(inv).toHaveProperty('invitedUsers');
    }
  });
});
