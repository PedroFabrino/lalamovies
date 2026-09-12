import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { watchRequests, waitlistCoRequesters } from '../src/db/schema';
import { AutoDownloadSubmitter } from '../src/jobs/autoDownloadSubmitter';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';

describe('Auto-Download Submission After Grace Window (Ticket 06)', () => {
  const SERVICE_KEY = 'test-service-key-xyz';
  let app: FastifyInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    process.env.SERVICE_API_KEY = SERVICE_KEY;
    process.env.NOTIFY_GRACE_HOURS = '6';

    app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: SERVICE_KEY,
    });
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('only processes notified entries whose grace window (6h) has expired', async () => {
    const now = Date.now();
    const expiredNotifyAt = new Date(now - 7 * 60 * 60 * 1000).toISOString(); // 7h ago
    const pendingNotifyAt = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // 2h ago

    // 1. Entry past grace window
    app.db.insert(watchRequests).values({
      id: 'entry-due',
      userId: 'user-alice',
      mediaType: 'movie',
      metadataId: 'tmdb-1',
      metadataSource: 'tmdb',
      title: 'Due Movie',
      year: 2024,
      status: 'notified',
      notifyAt: expiredNotifyAt,
      prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:due123',
      discordMessageId: 'discord-msg-due',
      triggeredCount: 0,
      failureCount: 0,
      createdAt: expiredNotifyAt,
      updatedAt: expiredNotifyAt,
    }).run();

    // 2. Entry still within grace window
    app.db.insert(watchRequests).values({
      id: 'entry-pending',
      userId: 'user-alice',
      mediaType: 'movie',
      metadataId: 'tmdb-2',
      metadataSource: 'tmdb',
      title: 'Pending Movie',
      year: 2024,
      status: 'notified',
      notifyAt: pendingNotifyAt,
      prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:pending123',
      discordMessageId: 'discord-msg-pending',
      triggeredCount: 0,
      failureCount: 0,
      createdAt: pendingNotifyAt,
      updatedAt: pendingNotifyAt,
    }).run();

    // Main API returns 201 for the due entry
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'req-1' }),
    });
    // Discord delete returns 204
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const submitter = new AutoDownloadSubmitter({
      db: app.db,
      mainApiUrl: 'http://localhost:3000',
      serviceApiKey: SERVICE_KEY,
      graceHours: 6,
      webhookUrl: 'https://discord.com/api/webhooks/test/url',
    });

    const result = await submitter.submitOnce();
    expect(result.checked).toBe(2);
    expect(result.triggered).toBe(1);
    expect(result.failed).toBe(0);

    // Verify due entry transitioned to triggered and discord message deleted
    const dueEntry = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-due')).get();
    expect(dueEntry?.status).toBe('triggered');
    expect(dueEntry?.triggeredCount).toBe(1);
    expect(dueEntry?.discordMessageId).toBeNull();

    // Verify pending entry is untouched
    const pendingEntry = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-pending')).get();
    expect(pendingEntry?.status).toBe('notified');
    expect(pendingEntry?.triggeredCount).toBe(0);
  });

  it('calls POST /requests with correct payload and headers on Main API', async () => {
    const expiredNotifyAt = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    app.db.insert(watchRequests).values({
      id: 'entry-tv',
      userId: 'user-bob',
      mediaType: 'tv_show',
      metadataId: 'tmdb-tv-10',
      metadataSource: 'tmdb',
      title: 'Severance',
      year: 2022,
      seasonNumber: 2,
      targetEpisode: 3,
      status: 'notified',
      notifyAt: expiredNotifyAt,
      prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:sevS02E03',
      discordMessageId: 'discord-sev',
      triggeredCount: 0,
      failureCount: 0,
      createdAt: expiredNotifyAt,
      updatedAt: expiredNotifyAt,
    }).run();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'req-sev' }),
    });

    const submitter = new AutoDownloadSubmitter({
      db: app.db,
      mainApiUrl: 'http://127.0.0.1:3000',
      serviceApiKey: SERVICE_KEY,
      graceHours: 6,
    });

    await submitter.submitOnce();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('http://127.0.0.1:3000/requests');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-service-key': SERVICE_KEY,
      'x-user-id': 'user-bob',
    });

    const payload = JSON.parse(options.body);
    expect(payload).toEqual({
      magnetLink: 'magnet:?xt=urn:btih:sevS02E03',
      mediaType: 'tv_show',
      metadataId: 'tmdb-tv-10',
      metadataSource: 'tmdb',
      title: 'Severance',
      year: 2022,
      seasonNumber: 2,
      episodeNumber: 3,
    });
  });

  it('retries on HTTP 4xx/5xx and transitions to error with admin alert after 3 consecutive failures', async () => {
    const expiredNotifyAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();

    app.db.insert(watchRequests).values({
      id: 'entry-fail',
      userId: 'user-bob',
      mediaType: 'movie',
      metadataId: 'tmdb-bad',
      metadataSource: 'tmdb',
      title: 'Failed Movie',
      status: 'notified',
      notifyAt: expiredNotifyAt,
      prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:badmagnet',
      discordMessageId: 'discord-fail',
      triggeredCount: 0,
      failureCount: 0,
      createdAt: expiredNotifyAt,
      updatedAt: expiredNotifyAt,
    }).run();

    const submitter = new AutoDownloadSubmitter({
      db: app.db,
      mainApiUrl: 'http://localhost:3000',
      serviceApiKey: SERVICE_KEY,
      graceHours: 6,
      webhookUrl: 'https://discord.com/api/webhooks/admin/alert',
      adminRoleMention: '<@&999888>',
    });

    // Attempt 1: 500 error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Error',
    });
    await submitter.submitOnce();

    let entry = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-fail')).get();
    expect(entry?.status).toBe('notified');
    expect(entry?.failureCount).toBe(1);

    // Attempt 2: 422 error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => 'Disk full',
    });
    await submitter.submitOnce();

    entry = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-fail')).get();
    expect(entry?.status).toBe('notified');
    expect(entry?.failureCount).toBe(2);

    // Attempt 3: 500 error -> should transition to error and send admin notification
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Error 3',
    });
    // Admin notification webhook response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await submitter.submitOnce();

    entry = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-fail')).get();
    expect(entry?.status).toBe('error');
    expect(entry?.failureCount).toBe(3);

    // Verify admin notification was sent
    const adminAlertCall = fetchMock.mock.calls.find(
      ([url]) => url === 'https://discord.com/api/webhooks/admin/alert'
    );
    expect(adminAlertCall).toBeDefined();
    const alertBody = JSON.parse(adminAlertCall![1].body);
    expect(alertBody.content).toContain('<@&999888>');
    expect(alertBody.embeds[0].title).toContain('Waitlist Auto-Download Failed: Failed Movie');
    expect(alertBody.embeds[0].color).toBe(0xef4444);
  });

  it('guards against concurrent overlapping execution', async () => {
    const expiredNotifyAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();

    app.db.insert(watchRequests).values({
      id: 'entry-overlap',
      userId: 'user-bob',
      mediaType: 'movie',
      metadataId: 'tmdb-overlap',
      metadataSource: 'tmdb',
      title: 'Overlap Movie',
      status: 'notified',
      notifyAt: expiredNotifyAt,
      prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:overlap',
      triggeredCount: 0,
      failureCount: 0,
      createdAt: expiredNotifyAt,
      updatedAt: expiredNotifyAt,
    }).run();

    let resolveFirstFetch: (value: any) => void;
    const firstFetchPromise = new Promise((resolve) => {
      resolveFirstFetch = resolve;
    });

    fetchMock.mockImplementationOnce(() => firstFetchPromise);

    const submitter = new AutoDownloadSubmitter({
      db: app.db,
      mainApiUrl: 'http://localhost:3000',
      serviceApiKey: SERVICE_KEY,
      graceHours: 6,
    });

    // Run first submit (hangs on mock promise)
    const run1 = submitter.submitOnce();

    // Run second submit while first is still running
    const run2 = await submitter.submitOnce();
    expect(run2).toEqual({ checked: 0, triggered: 0, failed: 0 });

    // Complete first submit
    resolveFirstFetch!({
      ok: true,
      status: 201,
      json: async () => ({ id: 'req-ok' }),
    });
    const result1 = await run1;
    expect(result1.triggered).toBe(1);
  });

  it('passes coRequesterUserIds to Main API POST /requests', async () => {
    const expiredNotifyAt = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    app.db.insert(watchRequests).values({
      id: 'entry-with-coreqs',
      userId: 'user-primary',
      mediaType: 'movie',
      metadataId: 'tmdb-coreq-1',
      metadataSource: 'tmdb',
      title: 'CoReq Movie',
      year: 2025,
      status: 'notified',
      notifyAt: expiredNotifyAt,
      prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:coreq123',
      discordMessageId: null,
      triggeredCount: 0,
      failureCount: 0,
      createdAt: expiredNotifyAt,
      updatedAt: expiredNotifyAt,
    }).run();

    app.db.insert(waitlistCoRequesters).values([
      {
        waitlistId: 'entry-with-coreqs',
        userId: 'user-secondary-1',
        addedAt: expiredNotifyAt,
      },
      {
        waitlistId: 'entry-with-coreqs',
        userId: 'user-secondary-2',
        addedAt: expiredNotifyAt,
      },
    ]).run();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'req-coreq' }),
    });

    const submitter = new AutoDownloadSubmitter({
      db: app.db,
      mainApiUrl: 'http://localhost:3000',
      serviceApiKey: SERVICE_KEY,
      graceHours: 6,
    });

    await submitter.submitOnce();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.coRequesterUserIds).toEqual(['user-secondary-1', 'user-secondary-2']);
  });
});
