import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { eq } from 'drizzle-orm';
import { watchRequests } from '../src/db/schema';
import * as notifications from '../src/services/notifications';

describe('In-Place Target Episode Adjustment Backend Seam (#223)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows primary requester to adjust target season/episode and updates release date', async () => {
    const mockFetchAirDate = vi.fn().mockResolvedValue('2026-11-20');
    const mockReleaseGating = {
      fetchReleaseDate: mockFetchAirDate,
      promoteDueEntries: vi.fn(),
      pollUnconfirmedFutureSeasons: vi.fn(),
      checkOrHealEntry: vi.fn(),
      startCrons: vi.fn(),
      stopCrons: vi.fn(),
    };

    const mockChecker = {
      pollNow: vi.fn(),
      checkAndDiagnoseEntry: vi.fn().mockResolvedValue({ message: 'Checked', entry: {} }),
    };

    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      releaseGatingService: mockReleaseGating as any,
      waitlistCheckService: mockChecker as any,
    });

    // 1. Create an episodic entry as user-1
    const createRes = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '54321',
        metadataSource: 'tmdb',
        title: 'Severance',
        seasonNumber: 2,
        targetEpisode: 1,
        tmdbReleaseDate: '2026-01-15',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const entryId = createRes.json().id;

    // 2. Adjust target episode from S02E01 to S02E02 as user-1 (primary requester)
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        seasonNumber: 2,
        targetEpisode: 2,
      },
    });

    expect(patchRes.statusCode).toBe(200);
    const patched = patchRes.json();
    expect(patched.ok).toBe(true);
    expect(patched.entry.seasonNumber).toBe(2);
    expect(patched.entry.targetEpisode).toBe(2);
    expect(patched.entry.tmdbReleaseDate).toBe('2026-11-20');
    expect(patched.entry.status).toBe('pending_release');

    // Verify TMDB air date fetcher was called with new season and episode
    expect(mockFetchAirDate).toHaveBeenCalledWith('tv_show', '54321', 2, 2, 'tmdb');

    // Verify database record
    const dbEntry = app.db.select().from(watchRequests).where(eq(watchRequests.id, entryId)).get()!;
    expect(dbEntry.seasonNumber).toBe(2);
    expect(dbEntry.targetEpisode).toBe(2);
    expect(dbEntry.tmdbReleaseDate).toBe('2026-11-20');
    expect(dbEntry.status).toBe('pending_release');
  });

  it('allows Admin to adjust target on any user entry, but forbids non-owner and non-admin', async () => {
    const mockReleaseGating = {
      fetchReleaseDate: vi.fn().mockResolvedValue('2026-12-01'),
    };

    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      releaseGatingService: mockReleaseGating as any,
    });

    // Create entry as user-1
    const createRes = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'anime',
        metadataId: '98765',
        metadataSource: 'tmdb',
        title: 'Chainsaw Man',
        seasonNumber: 2,
        targetEpisode: 1,
      },
    });
    const entryId = createRes.json().id;

    // Unauthorized attempt by user-2 (non-admin, not owner)
    const forbiddenRes = await app.inject({
      method: 'PATCH',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
      payload: {
        seasonNumber: 2,
        targetEpisode: 5,
      },
    });
    expect(forbiddenRes.statusCode).toBe(403);

    // Authorized attempt by admin
    const adminRes = await app.inject({
      method: 'PATCH',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
      },
      payload: {
        seasonNumber: 2,
        targetEpisode: 5,
      },
    });
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.json().entry.targetEpisode).toBe(5);
  });

  it('rejects target adjustments on inactive entries (completed, cancelled, rejected)', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
    });

    // Create entry
    const createRes = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '11111',
        metadataSource: 'tmdb',
        title: 'Dark',
        seasonNumber: 1,
        targetEpisode: 1,
      },
    });
    const entryId = createRes.json().id;

    // Test completed status
    app.db.update(watchRequests).set({ status: 'completed' }).where(eq(watchRequests.id, entryId)).run();

    const patchCompleted = await app.inject({
      method: 'PATCH',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: { targetEpisode: 2 },
    });
    expect(patchCompleted.statusCode).toBe(400);
    expect(patchCompleted.json().message).toContain("status 'completed'");

    // Test cancelled status
    app.db.update(watchRequests).set({ status: 'cancelled' }).where(eq(watchRequests.id, entryId)).run();
    const patchCancelled = await app.inject({
      method: 'PATCH',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: { targetEpisode: 2 },
    });
    expect(patchCancelled.statusCode).toBe(400);

    // Test rejected status
    app.db.update(watchRequests).set({ status: 'rejected' }).where(eq(watchRequests.id, entryId)).run();
    const patchRejected = await app.inject({
      method: 'PATCH',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: { targetEpisode: 2 },
    });
    expect(patchRejected.statusCode).toBe(400);
  });

  it('revokes Discord notification message and clears candidate release fields when adjusting notified entry', async () => {
    const deleteDiscordSpy = vi.spyOn(notifications, 'deleteDiscordMessage').mockResolvedValue(true);

    const mockReleaseGating = {
      fetchReleaseDate: vi.fn().mockResolvedValue('2026-10-15'),
    };

    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      releaseGatingService: mockReleaseGating as any,
    });

    // Create entry
    const createRes = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '22222',
        metadataSource: 'tmdb',
        title: 'Stranger Things',
        seasonNumber: 5,
        targetEpisode: 1,
      },
    });
    const entryId = createRes.json().id;

    // Simulate entry in notified state with Discord message and torrent candidate
    app.db
      .update(watchRequests)
      .set({
        status: 'notified',
        discordMessageId: 'discord-msg-999',
        prowlarrReleaseTitle: 'Stranger.Things.S05E01.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:fake',
        prowlarrReleaseScore: 250,
        notifyAt: '2026-10-09T12:00:00Z',
        lastCheckResult: 'Found release candidate',
      })
      .where(eq(watchRequests.id, entryId))
      .run();

    // Adjust target episode
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        seasonNumber: 5,
        targetEpisode: 2,
      },
    });

    expect(patchRes.statusCode).toBe(200);

    // Discord message should have been deleted
    expect(deleteDiscordSpy).toHaveBeenCalledWith('discord-msg-999', undefined, expect.anything());

    // Candidate fields in DB should be wiped clean and status reset to pending_release
    const updated = app.db.select().from(watchRequests).where(eq(watchRequests.id, entryId)).get()!;
    expect(updated.status).toBe('pending_release');
    expect(updated.discordMessageId).toBeNull();
    expect(updated.prowlarrReleaseTitle).toBeNull();
    expect(updated.prowlarrReleaseMagnet).toBeNull();
    expect(updated.prowlarrReleaseScore).toBeNull();
    expect(updated.notifyAt).toBeNull();
    expect(updated.lastCheckResult).toBeNull();
    expect(updated.targetEpisode).toBe(2);
    expect(updated.tmdbReleaseDate).toBe('2026-10-15');
  });
});
