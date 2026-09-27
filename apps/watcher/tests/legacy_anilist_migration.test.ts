import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { initWatcherDatabase } from '../src/db';
import * as schema from '../src/db/schema';
import { runWatcherLegacyAnilistMigration } from '../src/services/legacyAnilistMigration';

describe('Legacy AniList Database Migration (#180) - Watcher', () => {
  let sqlite: ReturnType<typeof initWatcherDatabase>['sqlite'];
  let db: ReturnType<typeof initWatcherDatabase>['db'];

  beforeEach(() => {
    const initialized = initWatcherDatabase(':memory:');
    sqlite = initialized.sqlite;
    db = initialized.db;
  });

  afterEach(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  it('scans and migrates legacy watch_requests to canonical tmdb IDs', async () => {
    // Insert 1 movie and 1 series
    db.insert(schema.watchRequests)
      .values([
        {
          id: 'watch-movie-1',
          userId: 'user-1',
          mediaType: 'movie',
          metadataId: '1234',
          metadataSource: 'anilist',
          title: 'Kimi no Na wa',
          year: 2016,
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'watch-series-1',
          userId: 'user-1',
          mediaType: 'anime',
          metadataId: '5678',
          metadataSource: 'anilist',
          title: 'Sousou no Frieren',
          year: 2023,
          seasonNumber: 1,
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'watch-tmdb-1',
          userId: 'user-1',
          mediaType: 'tv_show',
          metadataId: '11111',
          metadataSource: 'tmdb',
          title: 'Already TMDB',
          year: 2024,
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .run();

    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/search/movie')) {
        return {
          ok: true,
          json: async () => ({
            results: [{ id: 372058, title: 'Your Name.' }],
          }),
        } as Response;
      }
      if (urlStr.includes('/search/tv')) {
        return {
          ok: true,
          json: async () => ({
            results: [{ id: 209867, name: "Frieren: Beyond Journey's End" }],
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const result = await runWatcherLegacyAnilistMigration({
      db: db as any,
      tmdbApiKey: 'test-key',
    });

    expect(result.scanned).toBe(2);
    expect(result.migrated).toBe(2);
    expect(result.failed).toBe(0);

    const movie = db
      .select()
      .from(schema.watchRequests)
      .where(eq(schema.watchRequests.id, 'watch-movie-1'))
      .get();
    expect(movie?.metadataSource).toBe('tmdb');
    expect(movie?.metadataId).toBe('372058');

    const series = db
      .select()
      .from(schema.watchRequests)
      .where(eq(schema.watchRequests.id, 'watch-series-1'))
      .get();
    expect(series?.metadataSource).toBe('tmdb');
    expect(series?.metadataId).toBe('209867');

    const tmdb = db
      .select()
      .from(schema.watchRequests)
      .where(eq(schema.watchRequests.id, 'watch-tmdb-1'))
      .get();
    expect(tmdb?.metadataSource).toBe('tmdb');
    expect(tmdb?.metadataId).toBe('11111');
  });

  it('safely handles unresolvable legacy records without throwing', async () => {
    db.insert(schema.watchRequests)
      .values([
        {
          id: 'watch-unknown-1',
          userId: 'user-1',
          mediaType: 'anime',
          metadataId: '999999',
          metadataSource: 'anilist',
          title: 'Unknown Title',
          year: 1980,
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .run();

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({ results: [] }),
      } as Response;
    });

    const warnings: string[] = [];
    const result = await runWatcherLegacyAnilistMigration({
      db: db as any,
      tmdbApiKey: 'test-key',
      logger: {
        info: () => {},
        warn: (msg) => warnings.push(msg),
        error: () => {},
      },
    });

    expect(result.scanned).toBe(1);
    expect(result.migrated).toBe(0);
    expect(result.failed).toBe(1);
    expect(warnings.some((w) => w.includes('Unable to resolve TMDB match'))).toBe(true);

    const row = db
      .select()
      .from(schema.watchRequests)
      .where(eq(schema.watchRequests.id, 'watch-unknown-1'))
      .get();
    expect(row?.metadataSource).toBe('anilist');
    expect(row?.metadataId).toBe('999999');
  });
});
