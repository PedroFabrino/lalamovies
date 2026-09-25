import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildWatcherApp } from '../src/app';
import { watchRequests } from '../src/db/schema';
import { ReleaseGatingService } from '../src/services/releaseGating';
import { initWatcherDatabase } from '../src/db';

describe('Unconfirmed Release Dates and TBA Gating (Spec 164)', () => {
  const TMDB_API_KEY = 'test-tmdb-key';
  let app: FastifyInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    process.env.TMDB_API_KEY = TMDB_API_KEY;
    process.env.SERVICE_API_KEY = 'test-service-key';

    app = buildWatcherApp({
      dbPath: ':memory:',
      tmdbApiKey: TMDB_API_KEY,
      serviceApiKey: 'test-service-key',
    });
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POST /waitlist sets status=pending_release and tmdbReleaseDate=null when no date is provided or date is null', async () => {
    // Upstream TMDB returns 404 (unannounced)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-service-key',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: '5555',
        metadataSource: 'tmdb',
        title: 'Undated Anime Season 3',
        seasonNumber: 3,
        tmdbReleaseDate: null,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('pending_release');
    expect(body.tmdbReleaseDate).toBeNull();
  });

  it('watcherPoller.pollOnce skips entries in pending_release state', async () => {
    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'pending-entry-1',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: 'tv-100',
      metadataSource: 'tmdb',
      title: 'Stranger Things Season 5',
      seasonNumber: 5,
      status: 'pending_release',
      tmdbReleaseDate: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const searchSpy = vi.spyOn(app.prowlarr, 'searchForEntry');

    const result = await app.poller!.pollOnce();
    expect(result.polled).toBe(0);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('pollUnconfirmedFutureSeasons checks AniList GraphQL and updates air date', async () => {
    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'anilist-entry-1',
      userId: 'user-1',
      mediaType: 'anime',
      metadataId: '123456',
      metadataSource: 'anilist',
      title: 'Old Country Bumpkin Season 3',
      seasonNumber: 3,
      status: 'pending_release',
      tmdbReleaseDate: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Mock AniList GraphQL response with future release date
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('graphql.anilist.co')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              Media: {
                startDate: { year: 2027, month: 4, day: 5 },
                nextAiringEpisode: null,
                status: 'NOT_YET_RELEASED',
              },
            },
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const updatedCount = await app.releaseGating!.pollUnconfirmedFutureSeasons('2026-09-25');
    expect(updatedCount).toBe(1);

    const updated = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'anilist-entry-1')).get();
    expect(updated?.tmdbReleaseDate).toBe('2027-04-05');
    expect(updated?.status).toBe('pending_release');
  });

  it('pollUnconfirmedFutureSeasons promotes entry to checking when discovered air date is in the past or today', async () => {
    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'tmdb-entry-due',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: '200',
      metadataSource: 'tmdb',
      title: 'Secret Invasion Season 2',
      seasonNumber: 2,
      status: 'pending_release',
      tmdbReleaseDate: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Mock TMDB response returning a past date
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/tv/200/season/2')) {
        return {
          ok: true,
          json: async () => ({
            air_date: '2026-09-01',
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const updatedCount = await app.releaseGating!.pollUnconfirmedFutureSeasons('2026-09-25');
    expect(updatedCount).toBe(1);

    const updated = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'tmdb-entry-due')).get();
    expect(updated?.tmdbReleaseDate).toBe('2026-09-01');
    expect(updated?.status).toBe('checking');
  });

  it('POST /waitlist/:id/check keeps pending_release and returns toast message when still unannounced', async () => {
    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'check-tba-1',
      userId: 'user-1',
      mediaType: 'anime',
      metadataId: '77777',
      metadataSource: 'anilist',
      title: 'Unannounced Anime',
      seasonNumber: 2,
      status: 'pending_release',
      tmdbReleaseDate: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Mock AniList returning null startDate
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('graphql.anilist.co')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              Media: {
                startDate: { year: null, month: null, day: null },
                nextAiringEpisode: null,
                status: 'NOT_YET_RELEASED',
              },
            },
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const searchSpy = vi.spyOn(app.prowlarr, 'searchForEntry');

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/check-tba-1/check',
      headers: {
        'x-service-key': 'test-service-key',
        'x-user-id': 'user-1',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toContain('Checked APIs — still no confirmed release date announced');
    expect(body.entry.status).toBe('pending_release');
    expect(body.entry.tmdbReleaseDate).toBeNull();
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('POST /waitlist/:id/check self-heals corrupted entry with stale Season 1 date on Season 3', async () => {
    const now = new Date().toISOString();
    // Entry was corrupted by frontend bug: has Season 3, but status is 'checking' and date is from Season 1 (2020-01-01)
    app.db.insert(watchRequests).values({
      id: 'corrupted-entry-1',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: '999',
      metadataSource: 'tmdb',
      title: 'Corrupted Show Season 3',
      seasonNumber: 3,
      status: 'checking',
      tmdbReleaseDate: '2020-01-01',
      createdAt: now,
      updatedAt: now,
    }).run();

    // TMDB upstream confirms Season 3 has no air date yet (404)
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/tv/999')) {
        return { ok: false, status: 404 } as any;
      }
      return { ok: false } as any;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/corrupted-entry-1/check',
      headers: {
        'x-service-key': 'test-service-key',
        'x-user-id': 'user-1',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toContain('Checked APIs — still no confirmed release date announced');
    expect(body.entry.status).toBe('pending_release');
    expect(body.entry.tmdbReleaseDate).toBeNull();

    // Verify database state is healed
    const healed = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'corrupted-entry-1')).get();
    expect(healed?.status).toBe('pending_release');
    expect(healed?.tmdbReleaseDate).toBeNull();
  });

  it('POST /waitlist/:id/check promotes to checking and searches trackers when air date has arrived', async () => {
    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'check-promoted-1',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: '888',
      metadataSource: 'tmdb',
      title: 'Newly Aired Show Season 2',
      seasonNumber: 2,
      status: 'pending_release',
      tmdbReleaseDate: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // TMDB upstream returns air date in the past
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/tv/888/season/2')) {
        return {
          ok: true,
          json: async () => ({
            air_date: '2026-09-01',
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const searchSpy = vi.spyOn(app.prowlarr, 'searchForEntry').mockResolvedValue([]);

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/check-promoted-1/check',
      headers: {
        'x-service-key': 'test-service-key',
        'x-user-id': 'user-1',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.entry.status).toBe('checking');
    expect(body.entry.tmdbReleaseDate).toBe('2026-09-01');
    expect(searchSpy).toHaveBeenCalled();
  });
});
