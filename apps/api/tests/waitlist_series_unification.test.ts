import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import { buildWatcherApp } from '../../watcher/src/app';
import { users, downloadRequests } from '../src/db/schema';
import { FastifyInstance } from 'fastify';

describe('Waitlist Series Unification and Target Episode Detection', () => {
  let mainApp: FastifyInstance;
  let watcherApp: FastifyInstance;
  let watcherUrl: string;

  const SERVICE_KEY = 'test-service-key-unification';

  beforeEach(async () => {
    // 1. Start watcher on ephemeral port
    watcherApp = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: SERVICE_KEY,
    });
    await watcherApp.listen({ port: 0, host: '127.0.0.1' });
    const port = (watcherApp.server.address() as any).port;
    watcherUrl = `http://127.0.0.1:${port}`;

    // 2. Start main API with watcherUrl
    mainApp = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      serviceApiKey: SERVICE_KEY,
      watcherUrl,
      jwtSecret: 'test-jwt-secret-key-32charslong!!',
      cleanupService: {
        isHostDiskSafe: () => true,
        isSpaceSufficient: () => ({ sufficient: true, percentFree: 50, threshold: 15 }),
      } as any,
      qbittorrentService: {
        addTorrent: async () => 'mock-hash-123',
        addTorrentFile: async () => 'mock-hash-123',
        getActiveTorrentCount: async () => 0,
      } as any,
    });
    await mainApp.ready();

    // 3. Seed test user
    mainApp.db.insert(users).values([
      {
        id: 'user-fabrino',
        username: 'fabrino',
        role: 'admin',
        jellyfinUserId: 'jf-fabrino',
        createdAt: new Date().toISOString(),
      },
    ]).run();

    // 4. Seed Lioness episodes 1 to 6 in season 3
    const lionessEntries = [1, 2, 3, 4, 5, 6].map((ep) => ({
      id: `lioness-s03e0${ep}`,
      userId: 'user-fabrino',
      magnetLink: 'magnet:?xt=urn:btih:lioness',
      mediaType: 'tv_show' as const,
      status: 'seeding' as const,
      metadataId: '113962',
      metadataSource: 'tmdb' as const,
      title: 'Lioness',
      year: 2023,
      seasonNumber: 3,
      episodeNumber: ep,
      requestedAt: new Date().toISOString(),
    }));
    mainApp.db.insert(downloadRequests).values(lionessEntries).run();

    // 5. Seed Exiled Heavy Knight episode 11 with romaji title
    mainApp.db.insert(downloadRequests).values([
      {
        id: 'exiled-knight-s01e11',
        userId: 'user-fabrino',
        magnetLink: 'magnet:?xt=urn:btih:exiled',
        mediaType: 'tv_show' as const,
        status: 'seeding' as const,
        metadataId: '270603',
        metadataSource: 'tmdb' as const,
        title: 'Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru - 11',
        year: 2026,
        seasonNumber: 1,
        episodeNumber: 11,
        requestedAt: new Date().toISOString(),
      },
    ]).run();
  });

  afterEach(async () => {
    await mainApp?.close();
    await watcherApp?.close();
  });

  function signToken() {
    return mainApp.jwt.sign({
      id: 'user-fabrino',
      username: 'fabrino',
      role: 'admin',
      jellyfinUserId: 'jf-fabrino',
    });
  }

  it('reproduces: Lioness waitlist entry should target S03E07 instead of S03E01', async () => {
    const token = signToken();

    const res = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '113962',
        metadataSource: 'tmdb',
        title: 'Lioness',
        year: 2023,
        seasonNumber: 3,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const entry = body.entry || body;

    // User symptom: looking for s03e01 instead of next one s03e07
    expect(entry.seasonNumber).toBe(3);
    expect(entry.targetEpisode).toBe(7);
  });

  it('reproduces: Exiled Heavy Knight waitlist entry should target S01E12 instead of S01E01', async () => {
    const token = signToken();

    const res = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '270603',
        metadataSource: 'tmdb',
        title: 'The Exiled Heavy Knight Knows How to Game the System',
        year: 2026,
        seasonNumber: 1,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const entry = body.entry || body;

    // User symptom: episode 11 already downloaded, should look for 12, not 1
    expect(entry.seasonNumber).toBe(1);
    expect(entry.targetEpisode).toBe(12);
  });

  it('GET /requests/series-progress returns accurate progress for Lioness', async () => {
    const token = signToken();

    const res = await mainApp.inject({
      method: 'GET',
      url: '/requests/series-progress?metadataId=113962&seasonNumber=3',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.hasExisting).toBe(true);
    expect(body.highestSeason).toBe(3);
    expect(body.highestEpisode).toBe(6);
    expect(body.existingEpisodes).toEqual([1, 2, 3, 4, 5, 6]);
    expect(body.suggestedSeason).toBe(3);
    expect(body.suggestedEpisode).toBe(7);
  });

  it('GET /requests/series-progress returns progress for Exiled Heavy Knight matching by metadataId', async () => {
    const token = signToken();

    const res = await mainApp.inject({
      method: 'GET',
      url: '/requests/series-progress?metadataId=270603&seasonNumber=1',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.hasExisting).toBe(true);
    expect(body.highestEpisode).toBe(11);
    expect(body.suggestedEpisode).toBe(12);
  });

  it('honors explicit targetEpisode when user manually specifies one', async () => {
    const token = signToken();

    const res = await mainApp.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '113962',
        metadataSource: 'tmdb',
        title: 'Lioness',
        year: 2023,
        seasonNumber: 3,
        targetEpisode: 9, // user explicitly wants episode 9
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const entry = body.entry || body;
    expect(entry.targetEpisode).toBe(9);
  });
});
