import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import { users, downloadRequests } from '../src/db/schema';
import { FastifyInstance } from 'fastify';

describe('Series Canonical Metadata Inheritance (#105)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
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
    await app.ready();

    app.db.insert(users).values([
      {
        id: 'user-fabrino',
        username: 'fabrino',
        role: 'admin',
        jellyfinUserId: 'jf-fabrino',
        createdAt: new Date().toISOString(),
      },
    ]).run();

    // Seed Episode 11 of Heavy Knight as anime with Romaji title
    app.db.insert(downloadRequests).values([
      {
        id: 'knight-ep-11',
        userId: 'user-fabrino',
        magnetLink: 'magnet:?xt=urn:btih:knight11',
        mediaType: 'anime',
        status: 'seeding',
        metadataId: '270603',
        metadataSource: 'tmdb',
        title: 'Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru',
        year: 2026,
        seasonNumber: 1,
        episodeNumber: 11,
        requestedAt: new Date().toISOString(),
      },
    ]).run();
  });

  afterEach(async () => {
    await app?.close();
  });

  function signToken() {
    return app.jwt.sign({
      id: 'user-fabrino',
      username: 'fabrino',
      role: 'admin',
      jellyfinUserId: 'jf-fabrino',
    });
  }

  it('POST /requests inherits title and mediaType from existing series for the same metadataId', async () => {
    const token = signToken();

    // Client submits episode 12 as tv_show with English title
    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:knight12',
        mediaType: 'tv_show',
        metadataId: '270603',
        metadataSource: 'tmdb',
        title: 'The Exiled Heavy Knight Knows How to Game the System',
        year: 2026,
        seasonNumber: 1,
        episodeNumber: 12,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.request.mediaType).toBe('anime');
    expect(body.request.title).toBe('Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru');

    // Verify database record
    const saved = app.db.select().from(downloadRequests).where(downloadRequests.id.eq ? (downloadRequests as any).id.eq(body.request.id) : undefined as any).get();
  });

  it('GET /requests/series-progress returns existingMediaType alongside existingTitle', async () => {
    const token = signToken();

    const res = await app.inject({
      method: 'GET',
      url: '/requests/series-progress?metadataId=270603&seasonNumber=1',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.hasExisting).toBe(true);
    expect(body.existingTitle).toBe('Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru');
    expect(body.existingMediaType).toBe('anime');
  });

  it('POST /requests/batch inherits canonical title and mediaType for existing series', async () => {
    const token = signToken();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/batch',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mediaType: 'tv_show',
        metadataId: '270603',
        metadataSource: 'tmdb',
        title: 'The Exiled Heavy Knight Knows How to Game the System',
        year: 2026,
        seasonNumber: 1,
        items: [
          {
            magnetLink: 'magnet:?xt=urn:btih:knight12',
            seasonNumber: 1,
            episodeNumber: 12,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.requests[0].mediaType).toBe('anime');
    expect(body.requests[0].title).toBe('Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru');
  });

  it('POST /requests preserves submitted title and mediaType when no existing series exists', async () => {
    const token = signToken();

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:newseries01',
        mediaType: 'tv_show',
        metadataId: '999999',
        metadataSource: 'tmdb',
        title: 'Brand New Show',
        year: 2026,
        seasonNumber: 1,
        episodeNumber: 1,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.request.mediaType).toBe('tv_show');
    expect(body.request.title).toBe('Brand New Show');
  });
});
