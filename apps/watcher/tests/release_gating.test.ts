import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { buildWatcherApp } from '../src/app';
import { initWatcherDatabase } from '../src/db';
import { watchRequests } from '../src/db/schema';
import {
  evaluateInitialStatus,
  ReleaseGatingService,
} from '../src/services/releaseGating';

describe('TMDB Release-Date Gating', () => {
  it('evaluateInitialStatus correctly evaluates future, past, and null dates', () => {
    const today = '2026-09-11';

    // Future date
    const future = evaluateInitialStatus('2026-12-25', today);
    expect(future.status).toBe('pending_release');
    expect(future.tmdbReleaseDate).toBe('2026-12-25');

    // Past date
    const past = evaluateInitialStatus('2026-01-15', today);
    expect(past.status).toBe('checking');
    expect(past.tmdbReleaseDate).toBe('2026-01-15');

    // Today
    const sameDay = evaluateInitialStatus('2026-09-11', today);
    expect(sameDay.status).toBe('checking');
    expect(sameDay.tmdbReleaseDate).toBe('2026-09-11');

    // Null
    const empty = evaluateInitialStatus(null, today);
    expect(empty.status).toBe('checking');
    expect(empty.tmdbReleaseDate).toBeNull();
  });

  it('fetchReleaseDate returns earliest digital/theatrical date for movie', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const service = new ReleaseGatingService({
      db,
      tmdbApiKey: 'test-tmdb-key',
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/movie/')) {
        return {
          ok: true,
          json: async () => ({
            id: 100,
            release_date: '2026-12-25',
            release_dates: {
              results: [
                {
                  release_dates: [
                    { type: 3, release_date: '2026-12-20T00:00:00.000Z' }, // Theatrical (earlier)
                    { type: 4, release_date: '2027-01-10T00:00:00.000Z' }, // Digital
                  ],
                },
              ],
            },
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    try {
      const date = await service.fetchReleaseDate('movie', '100');
      expect(date).toBe('2026-12-20');
    } finally {
      global.fetch = originalFetch;
      sqlite.close();
    }
  });

  it('fetchReleaseDate returns air_date for TV season', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const service = new ReleaseGatingService({
      db,
      tmdbApiKey: 'test-tmdb-key',
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/tv/')) {
        return {
          ok: true,
          json: async () => ({
            air_date: '2026-11-05',
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    try {
      const date = await service.fetchReleaseDate('tv_show', '200', 2);
      expect(date).toBe('2026-11-05');
    } finally {
      global.fetch = originalFetch;
      sqlite.close();
    }
  });

  it('handles TMDB fetch failure gracefully and returns null', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const warnMock = vi.fn();
    const service = new ReleaseGatingService({
      db,
      tmdbApiKey: 'test-tmdb-key',
      logger: {
        info: vi.fn(),
        warn: warnMock,
        error: vi.fn(),
      },
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    try {
      const date = await service.fetchReleaseDate('movie', '999');
      expect(date).toBeNull();
    } finally {
      global.fetch = originalFetch;
      sqlite.close();
    }
  });

  it('promoteDueEntries promotes entries where tmdb_release_date <= today to checking', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const service = new ReleaseGatingService({ db, tmdbApiKey: 'test-key' });

    const now = new Date().toISOString();
    db.insert(watchRequests).values([
      {
        id: 'entry-due',
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '1',
        metadataSource: 'tmdb',
        title: 'Due Movie',
        status: 'pending_release',
        tmdbReleaseDate: '2026-09-10', // yesterday
        triggeredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'entry-future',
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '2',
        metadataSource: 'tmdb',
        title: 'Future Movie',
        status: 'pending_release',
        tmdbReleaseDate: '2026-12-25', // future
        triggeredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]).run();

    const promotedCount = await service.promoteDueEntries('2026-09-11');
    expect(promotedCount).toBe(1);

    const entries = db.select().from(watchRequests).all();
    const dueEntry = entries.find((e) => e.id === 'entry-due');
    const futureEntry = entries.find((e) => e.id === 'entry-future');

    expect(dueEntry?.status).toBe('checking');
    expect(futureEntry?.status).toBe('pending_release');

    sqlite.close();
  });

  it('pollUnconfirmedFutureSeasons updates null tmdbReleaseDate when premiere confirmed', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const service = new ReleaseGatingService({ db, tmdbApiKey: 'test-key' });

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-unconfirmed',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: 'tv-500',
      metadataSource: 'tmdb',
      title: 'Unconfirmed Show',
      seasonNumber: 3,
      status: 'pending_release',
      tmdbReleaseDate: null,
      triggeredCount: 0,
      createdAt: now,
      updatedAt: now,
    }).run();

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          next_episode_to_air: {
            season_number: 3,
            air_date: '2026-11-15',
          },
        }),
      } as any;
    });

    try {
      const updatedCount = await service.pollUnconfirmedFutureSeasons('2026-09-11');
      expect(updatedCount).toBe(1);

      const entry = db
        .select()
        .from(watchRequests)
        .where(eq(watchRequests.id, 'entry-unconfirmed'))
        .all()[0];
      expect(entry.tmdbReleaseDate).toBe('2026-11-15');
      expect(entry.status).toBe('pending_release');
    } finally {
      global.fetch = originalFetch;
      sqlite.close();
    }
  });

  it('POST /waitlist automatically sets pending_release when TMDB date is in the future', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/movie/future-movie')) {
        return {
          ok: true,
          json: async () => ({
            release_date: '2099-01-01',
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      tmdbApiKey: 'test-tmdb-key',
    });

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/waitlist',
        headers: {
          'x-service-key': 'test-secret',
          'x-user-id': 'user-1',
          'x-user-role': 'user',
        },
        payload: {
          mediaType: 'movie',
          metadataId: 'future-movie',
          metadataSource: 'tmdb',
          title: 'Future Film',
        },
      });

      expect(res.statusCode).toBe(201);
      const entry = res.json();
      expect(entry.status).toBe('pending_release');
      expect(entry.tmdbReleaseDate).toBe('2099-01-01');
    } finally {
      global.fetch = originalFetch;
      await app.close();
    }
  });
});