import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { users, featureFlags } from '../src/db/schema';
import { requireFeature, isFeatureEnabled } from '../src/middleware/featureFlags';
import { CleanupCron } from '../src/jobs/cleanupCron';
import { DiscordNotifier } from '../src/services/notifications';

describe('Feature Flags Foundation (Subtask #85)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jwtSecret: 'test-jwt-secret-key-32-chars-long!!',
    });
    await app.ready();

    adminId = 'admin_123';
    userId = 'user_456';

    app.db
      .insert(users)
      .values([
        {
          id: adminId,
          jellyfinUserId: 'jf_admin',
          username: 'admin_user',
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
        {
          id: userId,
          jellyfinUserId: 'jf_user',
          username: 'regular_user',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      ])
      .run();

    adminToken = app.jwt.sign({
      id: adminId,
      username: 'admin_user',
      role: 'admin',
      jellyfinUserId: 'jf_admin',
    });

    userToken = app.jwt.sign({
      id: userId,
      username: 'regular_user',
      role: 'user',
      jellyfinUserId: 'jf_user',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('automatically seeds all default feature flags with enabled: true', async () => {
    const all = app.db.select().from(featureFlags).all();
    expect(all).toHaveLength(11);

    const expectedFlags = [
      'discovery_feed',
      'up_next',
      'streaming',
      'manual_torrents',
      'batch_uploads',
      'waitlist',
      'jellyfin_library_view',
      'automated_cleanup',
      'discord_notifications',
      'user_invites',
      'transcription_enabled',
    ];

    for (const flagId of expectedFlags) {
      const found = all.find((f) => f.id === flagId);
      expect(found).toBeDefined();
      expect(Boolean(found?.enabled)).toBe(true);
      expect(found?.name).toBeDefined();
      expect(found?.description).toBeDefined();
      expect(['discovery', 'downloads', 'automation']).toContain(found?.category);
    }
  });

  it('GET /admin/features requires admin role and returns all flags', async () => {
    // Unauthenticated
    const resNoAuth = await app.inject({
      method: 'GET',
      url: '/admin/features',
    });
    expect(resNoAuth.statusCode).toBe(401);

    // Regular user
    const resUser = await app.inject({
      method: 'GET',
      url: '/admin/features',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });
    expect(resUser.statusCode).toBe(403);

    // Admin
    const resAdmin = await app.inject({
      method: 'GET',
      url: '/admin/features',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(resAdmin.statusCode).toBe(200);
    const body = resAdmin.json();
    expect(body.features).toHaveLength(11);
    expect(body.features[0]).toHaveProperty('id');
    expect(body.features[0]).toHaveProperty('name');
    expect(body.features[0]).toHaveProperty('category');
    expect(body.features[0]).toHaveProperty('enabled');
    expect(body.features[0]).toHaveProperty('updatedAt');
  });

  it('PATCH /admin/features/:id updates flag state and silently records audit user', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/features/streaming',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        enabled: false,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.feature.id).toBe('streaming');
    expect(Boolean(body.feature.enabled)).toBe(false);
    expect(body.feature.updatedByUserId).toBe(adminId);
    expect(body.flags.streaming).toBe(false);

    // Check DB directly
    const row = app.db.select().from(featureFlags).where(require('drizzle-orm').eq(featureFlags.id, 'streaming')).get();
    expect(Boolean(row?.enabled)).toBe(false);
    expect(row?.updatedByUserId).toBe(adminId);
  });

  it('PATCH /admin/features/:id rejects invalid payload or unknown flag', async () => {
    const resBad = await app.inject({
      method: 'PATCH',
      url: '/admin/features/streaming',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        enabled: 'not_a_boolean',
      },
    });
    expect(resBad.statusCode).toBe(400);

    const resUnknown = await app.inject({
      method: 'PATCH',
      url: '/admin/features/unknown_flag',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        enabled: false,
      },
    });
    expect(resUnknown.statusCode).toBe(404);
  });

  it('GET /features returns lightweight public dictionary of all flags', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/features',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.streaming).toBe(true);
    expect(body.waitlist).toBe(true);
    expect(body.discovery_feed).toBe(true);

    // Disable a flag via admin
    await app.inject({
      method: 'PATCH',
      url: '/admin/features/waitlist',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        enabled: false,
      },
    });

    // Public /features reflects the change
    const resAfter = await app.inject({
      method: 'GET',
      url: '/api/features',
    });
    expect(resAfter.statusCode).toBe(200);
    expect(resAfter.json().waitlist).toBe(false);
  });

  it('requireFeature preHandler guard returns HTTP 503 FEATURE_DISABLED when disabled', async () => {
    const testApp = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jwtSecret: 'test-jwt-secret-key-32-chars-long!!',
    });

    testApp.get('/test-guarded', { preHandler: [requireFeature('streaming')] }, async () => {
      return { success: true };
    });

    await testApp.ready();

    // When streaming is enabled -> 200
    const resEnabled = await testApp.inject({
      method: 'GET',
      url: '/test-guarded',
    });
    expect(resEnabled.statusCode).toBe(200);

    // Disable streaming in DB
    testApp.db
      .update(featureFlags)
      .set({ enabled: false })
      .where(require('drizzle-orm').eq(featureFlags.id, 'streaming'))
      .run();

    // When streaming is disabled -> 503 FEATURE_DISABLED
    const resDisabled = await testApp.inject({
      method: 'GET',
      url: '/test-guarded',
    });
    expect(resDisabled.statusCode).toBe(503);
    const body = resDisabled.json();
    expect(body.error).toBe('FEATURE_DISABLED');
    expect(body.code).toBe('FEATURE_DISABLED');

    await testApp.close();
  });

  it('POST /streams returns HTTP 503 FEATURE_DISABLED when streaming flag is false (Subtask #90)', async () => {
    // Disable streaming flag
    app.db
      .update(featureFlags)
      .set({ enabled: false })
      .where(require('drizzle-orm').eq(featureFlags.id, 'streaming'))
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/streams',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:abcdef1234567890',
        title: 'Test Stream',
      },
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error).toBe('FEATURE_DISABLED');
    expect(body.code).toBe('FEATURE_DISABLED');
    expect(body.message).toContain('streaming');
  });

  it('POST /requests returns HTTP 503 FEATURE_DISABLED when manual_torrents is false (Subtask #91)', async () => {
    app.db
      .update(featureFlags)
      .set({ enabled: false })
      .where(require('drizzle-orm').eq(featureFlags.id, 'manual_torrents'))
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:1234567890abcdef',
        mediaType: 'movie',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'Inception',
      },
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error).toBe('FEATURE_DISABLED');
    expect(body.code).toBe('FEATURE_DISABLED');
    expect(body.message).toContain('manual_torrents');
  });

  it('POST /requests/batch returns HTTP 503 FEATURE_DISABLED when batch_uploads is false (Subtask #91)', async () => {
    app.db
      .update(featureFlags)
      .set({ enabled: false })
      .where(require('drizzle-orm').eq(featureFlags.id, 'batch_uploads'))
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/batch',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        items: [{ magnetLink: 'magnet:?xt=urn:btih:item1' }],
      },
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error).toBe('FEATURE_DISABLED');
    expect(body.code).toBe('FEATURE_DISABLED');
    expect(body.message).toContain('batch_uploads');
  });

  it('POST /waitlist returns HTTP 503 FEATURE_DISABLED when waitlist is false (Subtask #91)', async () => {
    app.db
      .update(featureFlags)
      .set({ enabled: false })
      .where(require('drizzle-orm').eq(featureFlags.id, 'waitlist'))
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        mediaType: 'movie',
        metadataId: '200',
        metadataSource: 'tmdb',
        title: 'Interstellar',
      },
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error).toBe('FEATURE_DISABLED');
    expect(body.code).toBe('FEATURE_DISABLED');
    expect(body.message).toContain('waitlist');
  });

  it('CleanupCron skips execution when automated_cleanup is disabled, but admin manual cleanup is unblocked (Subtask #92)', async () => {
    let cronCleanCalled = false;
    const mockCleanupService: any = {
      checkDiskAndClean: vi.fn(async () => {
        cronCleanCalled = true;
      }),
      executePendingCleanups: vi.fn(async () => {}),
    };

    // Disabled flag
    const cron = new CleanupCron({
      cleanupService: mockCleanupService,
      isCleanupEnabled: async () => false,
    });

    await cron.runOnce();
    expect(cronCleanCalled).toBe(false);

    // Enabled flag
    const cronEnabled = new CleanupCron({
      cleanupService: mockCleanupService,
      isCleanupEnabled: async () => true,
    });
    await cronEnabled.runOnce();
    expect(cronCleanCalled).toBe(true);

    // Ensure admin manual cleanup endpoint is unblocked even when automated_cleanup is false in DB
    app.db
      .update(featureFlags)
      .set({ enabled: false })
      .where(require('drizzle-orm').eq(featureFlags.id, 'automated_cleanup'))
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/admin/cleanup/trigger',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    // Should NOT be 503 FEATURE_DISABLED (returns 200)
    expect(res.statusCode).not.toBe(503);
  });

  it('DiscordNotifier skips webhook when discord_notifications flag is false (Subtask #92)', async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as any;

    try {
      // With flag disabled
      const notifierDisabled = new DiscordNotifier(
        'https://discord.com/api/webhooks/test',
        () => false
      );
      await notifierDisabled.send('download.completed', { title: 'Test Movie' });
      expect(fetchCalled).toBe(false);

      // With flag enabled
      const notifierEnabled = new DiscordNotifier(
        'https://discord.com/api/webhooks/test',
        () => true
      );
      await notifierEnabled.send('download.completed', { title: 'Test Movie' });
      expect(fetchCalled).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('POST /invites and POST /invites/:token/accept return 503 FEATURE_DISABLED when user_invites is false (Subtask #92)', async () => {
    // 1. When user_invites is false, POST /invites returns 503
    app.db
      .update(featureFlags)
      .set({ enabled: false })
      .where(require('drizzle-orm').eq(featureFlags.id, 'user_invites'))
      .run();

    const resCreate = await app.inject({
      method: 'POST',
      url: '/invites',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(resCreate.statusCode).toBe(503);
    expect(resCreate.json().error).toBe('FEATURE_DISABLED');
    expect(resCreate.json().message).toContain('user_invites');

    // 2. When user_invites is false, POST /invites/:token/accept returns 503
    const resAccept = await app.inject({
      method: 'POST',
      url: '/invites/any-test-token/accept',
      payload: {
        username: 'testuser',
        password: 'password123',
      },
    });
    expect(resAccept.statusCode).toBe(503);
    expect(resAccept.json().error).toBe('FEATURE_DISABLED');
    expect(resAccept.json().message).toContain('user_invites');
  });
});
