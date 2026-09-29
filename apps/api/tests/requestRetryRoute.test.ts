import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests } from '../src/db/schema';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';

class MockCleanupService implements ICleanupService {
  public spaceSufficient = true;
  public percentFree = 50;
  public hostDiskSafe = true;

  isSpaceSufficient(): SpaceCheckResult {
    return {
      sufficient: this.spaceSufficient && this.hostDiskSafe,
      percentFree: this.percentFree,
      threshold: 15,
    };
  }

  isHostDiskSafe(): boolean {
    return this.hostDiskSafe;
  }
}

describe('POST /requests/:id/retry', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let adminCookie: string;
  let testUserId: string;

  beforeEach(async () => {
    mockQb = new MockQBittorrentService();
    const mockCleanup = new MockCleanupService();

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: mockQb,
      cleanupService: mockCleanup,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    // 1. Admin user
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_alice', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;

    // 2. Regular user
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'user_bob', password: 'password123' },
    });
    testUserId = userRes.json().user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 400 if request is not in error state', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req_downloading_1',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:1111',
      mediaType: 'movie',
      status: 'downloading',
      metadataId: '10',
      metadataSource: 'tmdb',
      title: 'Active Movie',
      requestedAt: new Date().toISOString(),
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_downloading_1/retry',
      cookies: { token: adminCookie },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('Only requests in error state can be retried');
  });

  it('resets incomplete torrent to downloading status', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req_err_retry_1',
      userId: testUserId,
      magnetLink: 'magnet:?xt=urn:btih:2222',
      mediaType: 'movie',
      status: 'error',
      metadataId: '20',
      metadataSource: 'tmdb',
      title: 'Error Movie Incomplete',
      errorMessage: 'Connection lost',
      requestedAt: new Date().toISOString(),
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_err_retry_1/retry',
      cookies: { token: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().request.status).toBe('downloading');
    expect(res.json().request.errorMessage).toBeNull();
  });

  it('completes request to seeding if files already exist on disk', async () => {
    const tmpFile = path.resolve(process.cwd(), 'tests_retry_sample.mkv');
    fs.writeFileSync(tmpFile, 'test media content');

    try {
      app.db.insert(downloadRequests).values({
        id: 'req_err_retry_complete',
        userId: testUserId,
        magnetLink: 'magnet:?xt=urn:btih:3333',
        mediaType: 'movie',
        status: 'error',
        metadataId: '30',
        metadataSource: 'tmdb',
        title: 'Error Movie On Disk',
        errorMessage: 'Failed to refresh Jellyfin library: HTTP 401',
        jellyfinPath: tmpFile,
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_err_retry_complete/retry',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().request.status).toBe('seeding');
      expect(res.json().request.errorMessage).toBeNull();
      expect(res.json().request.jellyfinPath).toBe(tmpFile);
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  });

  it('retries completed torrent from qBittorrent and delegates to processAndHardlinkTorrent', async () => {
    const stagingDir = path.resolve(process.cwd(), 'downloads', 'staging');
    fs.mkdirSync(stagingDir, { recursive: true });
    const testMovieName = 'Retry.Movie.2024.mkv';
    const stagingFile = path.join(stagingDir, testMovieName);
    fs.writeFileSync(stagingFile, 'Retry movie media');

    const torrentHash = 'hash_retry_qb_success';
    mockQb.allTorrents = [
      {
        hash: torrentHash,
        name: testMovieName,
        size: 123456,
        progress: 1.0,
        state: 'uploading',
      },
    ];
    mockQb.torrentFiles.set(torrentHash, [
      { name: testMovieName, size: 123456 },
    ]);

    try {
      app.db.insert(downloadRequests).values({
        id: 'req_retry_qb_ok',
        userId: testUserId,
        magnetLink: `magnet:?xt=urn:btih:${torrentHash}`,
        mediaType: 'movie',
        status: 'error',
        metadataId: '40',
        metadataSource: 'tmdb',
        title: 'Retry Movie Success',
        year: 2024,
        qbTorrentHash: torrentHash,
        errorMessage: 'Old download error',
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_retry_qb_ok/retry',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().request.status).toBe('seeding');
      expect(res.json().request.errorMessage).toBeNull();
      expect(fs.existsSync(res.json().request.jellyfinPath)).toBe(true);
    } finally {
      if (fs.existsSync(stagingFile)) {
        fs.unlinkSync(stagingFile);
      }
      const createdFolder = path.resolve(process.cwd(), 'media', 'movies', 'Retry Movie Success (2024)');
      if (fs.existsSync(createdFolder)) {
        fs.rmSync(createdFolder, { recursive: true, force: true });
      }
    }
  });

  it('returns 502 and marks error when processAndHardlinkTorrent throws during retry', async () => {
    const torrentHash = 'hash_retry_qb_fail';
    mockQb.allTorrents = [
      {
        hash: torrentHash,
        name: 'NonExistent.File.2024.mkv',
        size: 500000,
        progress: 1.0,
        state: 'uploading',
      },
    ];
    mockQb.torrentFiles.set(torrentHash, [
      { name: 'NonExistent.File.2024.mkv', size: 500000 },
    ]);

    app.db.insert(downloadRequests).values({
      id: 'req_retry_qb_fail',
      userId: testUserId,
      magnetLink: `magnet:?xt=urn:btih:${torrentHash}`,
      mediaType: 'movie',
      status: 'error',
      metadataId: '50',
      metadataSource: 'tmdb',
      title: 'Retry Movie Fail',
      year: 2024,
      qbTorrentHash: torrentHash,
      errorMessage: 'Initial error',
      requestedAt: new Date().toISOString(),
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_retry_qb_fail/retry',
      cookies: { token: adminCookie },
    });

    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe('Bad Gateway');
    expect(res.json().message).toContain('Failed to process and hardlink torrent');

    const row = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_retry_qb_fail')).get();
    expect(row?.status).toBe('error');
    expect(row?.errorMessage).toContain('Source file does not exist for hardlink');
  });

  it('calls stateMachine.transition exactly once with refreshJellyfin: true and no direct jellyfin.refreshLibrary', async () => {
    const tmpFile = path.resolve(process.cwd(), 'tests_retry_sm_sample.mkv');
    fs.writeFileSync(tmpFile, 'test media');

    const smSpy = vi.spyOn(app.stateMachine, 'transition').mockResolvedValue({
      id: 'req_err_retry_sm',
      status: 'seeding',
    } as any);
    const jfSpy = vi.spyOn(app.jellyfin, 'refreshLibrary');

    try {
      app.db.insert(downloadRequests).values({
        id: 'req_err_retry_sm',
        userId: testUserId,
        magnetLink: 'magnet:?xt=urn:btih:4444',
        mediaType: 'movie',
        status: 'error',
        metadataId: '35',
        metadataSource: 'tmdb',
        title: 'Retry Movie SM',
        jellyfinPath: tmpFile,
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/requests/req_err_retry_sm/retry',
        cookies: { token: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(smSpy).toHaveBeenCalledTimes(1);
      expect(smSpy).toHaveBeenCalledWith(
        'req_err_retry_sm',
        'seeding',
        expect.objectContaining({ refreshJellyfin: true })
      );
      expect(jfSpy).not.toHaveBeenCalled();
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      smSpy.mockRestore();
      jfSpy.mockRestore();
    }
  });
});
