import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';

class MockCleanupService implements ICleanupService {
  isSpaceSufficient(): SpaceCheckResult {
    return { sufficient: true, percentFree: 50, threshold: 15 };
  }
  isHostDiskSafe(): boolean {
    return true;
  }
  async cleanItem(): Promise<void> {}
}

describe('Force Download Bypass (Issue #186)', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let cookie: string;

  beforeEach(async () => {
    mockQb = new MockQBittorrentService();
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: mockQb,
      cleanupService: new MockCleanupService(),
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });
    await app.ready();

    const authRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'tester', password: 'password123' },
    });
    cookie = authRes.cookies[0].value;
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows downloading duplicate request when force is true', async () => {
    // 1. Initial request for Season 1 pack (or Part 1)
    const res1 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: cookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:part1hash',
        mediaType: 'anime',
        metadataId: '270603',
        metadataSource: 'tmdb',
        title: 'The Exiled Heavy Knight Knows How to Game the System',
        seasonNumber: 1,
      },
    });
    expect(res1.statusCode).toBe(201);
    const id1 = res1.json().request.id;

    // 2. Duplicate without force -> absorbed
    const res2 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: cookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:part2hash',
        mediaType: 'anime',
        metadataId: '270603',
        metadataSource: 'tmdb',
        title: 'The Exiled Heavy Knight Knows How to Game the System',
        seasonNumber: 1,
      },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().request.id).toBe(id1);

    // 3. Duplicate with force: true -> creates new download
    const res3 = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: cookie },
      payload: {
        magnetLink: 'magnet:?xt=urn:btih:part2hash',
        mediaType: 'anime',
        metadataId: '270603',
        metadataSource: 'tmdb',
        title: 'The Exiled Heavy Knight Knows How to Game the System',
        seasonNumber: 1,
        force: true,
      },
    });
    expect(res3.statusCode).toBe(201);
    expect(res3.json().request.id).not.toBe(id1);
    expect(mockQb.addedTorrents).toHaveLength(2);
  });
});
