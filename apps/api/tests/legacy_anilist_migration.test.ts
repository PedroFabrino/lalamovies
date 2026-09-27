import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, users, downloadRequests } from '../src/db';
import { RequestsRepository } from '../src/services/requestsRepository';
import { runLegacyAnilistMigration } from '../src/services/legacyAnilistMigration';
import { IMetadataService, MetadataCandidate } from '../src/services/metadata';
import { buildApp } from '../src/app';

describe('Legacy AniList Database Migration (#180) - API', () => {
  let db: ReturnType<typeof initDatabase>['db'];
  let sqlite: ReturnType<typeof initDatabase>['sqlite'];
  let repo: RequestsRepository;

  beforeEach(() => {
    const initialized = initDatabase(':memory:');
    db = initialized.db;
    sqlite = initialized.sqlite;
    repo = new RequestsRepository(db as any);

    // Insert dummy user
    db.insert(users)
      .values({
        id: 'user-1',
        jellyfinUserId: 'jf-1',
        username: 'testuser',
        role: 'user',
        createdAt: new Date().toISOString(),
      })
      .run();
  });

  afterEach(() => {
    sqlite.close();
  });

  it('scans and migrates legacy anilist records to canonical tmdb IDs', async () => {
    // Insert 2 legacy requests: one movie, one series
    db.insert(downloadRequests)
      .values([
        {
          id: 'req-movie-1',
          userId: 'user-1',
          magnetLink: 'magnet:?xt=urn:btih:m1',
          mediaType: 'movie',
          metadataId: '1234', // AniList ID
          metadataSource: 'anilist',
          title: 'A Silent Voice',
          year: 2016,
          requestedAt: new Date().toISOString(),
        },
        {
          id: 'req-series-1',
          userId: 'user-1',
          magnetLink: 'magnet:?xt=urn:btih:s1',
          mediaType: 'anime',
          metadataId: '5678', // AniList ID
          metadataSource: 'anilist',
          title: 'Frieren: Beyond Journey\'s End',
          year: 2023,
          requestedAt: new Date().toISOString(),
        },
        {
          id: 'req-tmdb-1',
          userId: 'user-1',
          magnetLink: 'magnet:?xt=urn:btih:t1',
          mediaType: 'tv_show',
          metadataId: '99999',
          metadataSource: 'tmdb',
          title: 'Already TMDB',
          year: 2024,
          requestedAt: new Date().toISOString(),
        },
      ])
      .run();

    const mockMetadataService: Partial<IMetadataService> = {
      searchMovies: async (title: string) => {
        if (title.includes('Silent Voice')) {
          return [
            {
              id: '378064',
              source: 'tmdb',
              title: 'A Silent Voice',
              year: 2016,
              posterUrl: null,
              overview: null,
            } as MetadataCandidate,
          ];
        }
        return [];
      },
      searchSeries: async (title: string) => {
        if (title.includes('Frieren')) {
          return [
            {
              id: '209867',
              source: 'tmdb',
              title: 'Frieren: Beyond Journey\'s End',
              year: 2023,
              posterUrl: null,
              overview: null,
            } as MetadataCandidate,
          ];
        }
        return [];
      },
    };

    const logged: string[] = [];
    const result = await runLegacyAnilistMigration({
      requestsRepo: repo,
      metadataService: mockMetadataService as IMetadataService,
      logger: {
        info: (msg) => logged.push(`INFO: ${msg}`),
        warn: (msg) => logged.push(`WARN: ${msg}`),
        error: (msg) => logged.push(`ERROR: ${msg}`),
      },
    });

    expect(result.scanned).toBe(2);
    expect(result.migrated).toBe(2);
    expect(result.failed).toBe(0);

    // Verify database rows
    const movieRow = repo.findById('req-movie-1');
    expect(movieRow?.metadataSource).toBe('tmdb');
    expect(movieRow?.metadataId).toBe('378064');

    const seriesRow = repo.findById('req-series-1');
    expect(seriesRow?.metadataSource).toBe('tmdb');
    expect(seriesRow?.metadataId).toBe('209867');

    // Untouched TMDB row
    const tmdbRow = repo.findById('req-tmdb-1');
    expect(tmdbRow?.metadataSource).toBe('tmdb');
    expect(tmdbRow?.metadataId).toBe('99999');
  });

  it('safely handles and flags unresolvable legacy records without throwing', async () => {
    db.insert(downloadRequests)
      .values([
        {
          id: 'req-unknown-1',
          userId: 'user-1',
          magnetLink: 'magnet:?xt=urn:btih:u1',
          mediaType: 'anime',
          metadataId: '999999',
          metadataSource: 'anilist',
          title: 'Extremely Obscure Unknown Anime',
          year: 1980,
          requestedAt: new Date().toISOString(),
        },
      ])
      .run();

    const mockMetadataService: Partial<IMetadataService> = {
      searchSeries: async () => [],
    };

    const warnings: string[] = [];
    const result = await runLegacyAnilistMigration({
      requestsRepo: repo,
      metadataService: mockMetadataService as IMetadataService,
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

    // Row remains intact for manual reconciliation
    const row = repo.findById('req-unknown-1');
    expect(row?.metadataSource).toBe('anilist');
    expect(row?.metadataId).toBe('999999');
  });

  it('runs migration on startup even when startPoller is false', async () => {
    const testApp = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      metadataService: {
        searchMovies: async () => [],
        searchSeries: async (title: string) => {
          if (title.includes('Frieren')) {
            return [
              {
                id: '209867',
                source: 'tmdb',
                title: "Frieren: Beyond Journey's End",
                year: 2023,
                posterUrl: null,
                overview: null,
              } as MetadataCandidate,
            ];
          }
          return [];
        },
      } as any,
    });

    testApp.db.insert(users).values({
      id: 'user-app-1',
      username: 'testapp',
      role: 'user',
      jellyfinUserId: 'jf-app-1',
      createdAt: new Date().toISOString(),
    }).run();

    testApp.db.insert(downloadRequests).values({
      id: 'req-app-series-1',
      userId: 'user-app-1',
      magnetLink: 'magnet:?xt=urn:btih:s-app',
      mediaType: 'anime',
      metadataId: '5678',
      metadataSource: 'anilist',
      title: "Frieren: Beyond Journey's End",
      year: 2023,
      requestedAt: new Date().toISOString(),
    }).run();

    await testApp.ready();

    const migratedRow = testApp.requestsRepo.findById('req-app-series-1');
    expect(migratedRow?.metadataSource).toBe('tmdb');
    expect(migratedRow?.metadataId).toBe('209867');

    await testApp.close();
  });
});
