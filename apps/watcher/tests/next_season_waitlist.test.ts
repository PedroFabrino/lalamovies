import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { watchRequests } from '../src/db/schema';
import { ReleaseGatingService } from '../src/services/releaseGating';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';

describe('Season Pack Next-Season Waitlist Entry (Ticket 08)', () => {
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

  it('sets status=pending_release and tmdb_release_date=null when isNextSeason=true and TMDB has no date yet', async () => {
    // TMDB returns 404 (season not yet announced/dated)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-service-key',
        'x-user-id': 'user-alice',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '1000',
        metadataSource: 'tmdb',
        title: 'Stranger Things',
        seasonNumber: 5,
        isNextSeason: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('pending_release');
    expect(body.tmdbReleaseDate).toBeNull();
    expect(body.seasonNumber).toBe(5);
  });

  it('sets status=pending_release and stores date when isNextSeason=true and TMDB has confirmed future premiere date', async () => {
    // TMDB returns confirmed future date
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        air_date: '2027-05-15',
      }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-service-key',
        'x-user-id': 'user-alice',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '1000',
        metadataSource: 'tmdb',
        title: 'Stranger Things',
        seasonNumber: 5,
        isNextSeason: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('pending_release');
    expect(body.tmdbReleaseDate).toBe('2027-05-15');
  });

  it('pollUnconfirmedFutureSeasons queries /tv/{id}/season/{n} for air_date and updates entry', async () => {
    // Seed pending_release entry with tmdb_release_date = null
    app.db.insert(watchRequests).values({
      id: 'entry-unconfirmed-season',
      userId: 'user-alice',
      mediaType: 'tv_show',
      metadataId: '2000',
      metadataSource: 'tmdb',
      title: 'Wednesday',
      seasonNumber: 2,
      targetEpisode: 1,
      triggeredCount: 0,
      status: 'pending_release',
      tmdbReleaseDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();

    // Mock TMDB /tv/2000/season/2 returning confirmed air_date
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        air_date: '2026-11-20',
      }),
    });

    const releaseGating = new ReleaseGatingService({
      db: app.db,
      tmdbApiKey: TMDB_API_KEY,
    });

    const updatedCount = await releaseGating.pollUnconfirmedFutureSeasons('2026-09-11');
    expect(updatedCount).toBe(1);

    const entry = app.db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-unconfirmed-season')).get();
    expect(entry?.tmdbReleaseDate).toBe('2026-11-20');
    expect(entry?.status).toBe('pending_release');
  });
});
