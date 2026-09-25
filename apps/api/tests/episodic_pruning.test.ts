import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildApp } from '../src/app';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';

describe('Episodic Pruning & Tracking', () => {
  let app: FastifyInstance;
  let mockQb: MockQBittorrentService;
  let mockJellyfin: MockJellyfinService;
  let adminCookie: string;
  let userCookie: string;
  let adminUserId: string;
  let regularUserId: string;
  let tempDir: string;
  let stagingDir: string;
  let libraryDir: string;

  let originalStagingPath: string | undefined;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdm-episodes-test-'));
    stagingDir = path.join(tempDir, 'staging');
    libraryDir = path.join(tempDir, 'library');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(libraryDir, { recursive: true });

    originalStagingPath = process.env.STAGING_PATH;
    process.env.STAGING_PATH = stagingDir;

    mockQb = new MockQBittorrentService();
    mockJellyfin = new MockJellyfinService();

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: mockJellyfin,
      qbittorrentService: mockQb,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    // Login Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_user', password: 'password123' },
    });
    adminCookie = adminRes.cookies[0].value;
    adminUserId = adminRes.json().user.id;

    // Login User
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'regular_user', password: 'password123' },
    });
    userCookie = userRes.cookies[0].value;
    regularUserId = userRes.json().user.id;
  });

  afterEach(async () => {
    await app.close();
    if (originalStagingPath !== undefined) {
      process.env.STAGING_PATH = originalStagingPath;
    } else {
      delete process.env.STAGING_PATH;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('handles GET, PATCH keep, and DELETE episode routes', async () => {
    // 1. Create a parent request
    const req = app.requestsRepo.create({
      id: crypto.randomUUID(),
      userId: adminUserId,
      title: 'Breaking Bad Season 1',
      mediaType: 'tv_show',
      status: 'seeding',
      qbTorrentHash: 'bb_hash_1',
      magnetLink: 'magnet:?xt=urn:btih:mock',
      metadataId: 'meta-123',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
      jellyfinPath: path.join(libraryDir, 'Breaking Bad'),
    });

    // Create staging and library files
    const ep1Staging = path.join(stagingDir, 'BB_S01E01.mkv');
    const ep1Lib = path.join(libraryDir, 'Breaking Bad', 'Season 01', 'Breaking Bad - S01E01.mkv');
    fs.mkdirSync(path.dirname(ep1Lib), { recursive: true });
    fs.writeFileSync(ep1Staging, 'video_ep1');
    fs.writeFileSync(ep1Lib, 'video_ep1');

    const ep2Staging = path.join(stagingDir, 'BB_S01E02.mkv');
    const ep2Lib = path.join(libraryDir, 'Breaking Bad', 'Season 01', 'Breaking Bad - S01E02.mkv');
    fs.writeFileSync(ep2Staging, 'video_ep2');
    fs.writeFileSync(ep2Lib, 'video_ep2');

    const [ep1, ep2] = app.episodesRepo.createMany([
      {
        requestId: req.id,
        seasonNumber: 1,
        episodeNumber: 1,
        fileIndex: 0,
        relativePath: 'BB_S01E01.mkv',
        jellyfinPath: ep1Lib,
        sizeBytes: 9,
      },
      {
        requestId: req.id,
        seasonNumber: 1,
        episodeNumber: 2,
        fileIndex: 1,
        relativePath: 'BB_S01E02.mkv',
        jellyfinPath: ep2Lib,
        sizeBytes: 9,
      },
    ]);

    // GET /requests/:id/episodes
    const getRes = await app.inject({
      method: 'GET',
      url: `/requests/${req.id}/episodes`,
      cookies: { token: adminCookie },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.episodes).toHaveLength(2);
    expect(getBody.episodes[0].episodeNumber).toBe(1);

    // PATCH /requests/:id/episodes/:episodeId/keep (toggle on)
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/requests/${req.id}/episodes/${ep1.id}/keep`,
      cookies: { token: adminCookie },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().episode.keepFlag).toBe(true);

    // Toggle off
    const patchRes2 = await app.inject({
      method: 'PATCH',
      url: `/requests/${req.id}/episodes/${ep1.id}/keep`,
      cookies: { token: adminCookie },
    });
    expect(patchRes2.statusCode).toBe(200);
    expect(patchRes2.json().episode.keepFlag).toBe(false);

    // DELETE /requests/:id/episodes/:episodeId — prune ep1
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/requests/${req.id}/episodes/${ep1.id}`,
      cookies: { token: adminCookie },
    });
    expect(delRes.statusCode).toBe(200);
    expect(delRes.json().result.wholeRequestDeleted).toBe(false);

    // Verify qb priority set to 0
    expect(mockQb.filePriorities).toContainEqual({ hash: 'bb_hash_1', fileIndex: 0, priority: 0 });

    // Verify ep1 unlinked, ep2 remains
    expect(fs.existsSync(ep1Lib)).toBe(false);
    expect(fs.existsSync(ep1Staging)).toBe(false);
    expect(fs.existsSync(ep2Lib)).toBe(true);

    // Parent request is NOT deleted
    const parentAfterEp1 = app.requestsRepo.findById(req.id);
    expect(parentAfterEp1?.status).toBe('seeding');

    // DELETE ep2 (last remaining episode)
    const delRes2 = await app.inject({
      method: 'DELETE',
      url: `/requests/${req.id}/episodes/${ep2.id}`,
      cookies: { token: adminCookie },
    });
    expect(delRes2.statusCode).toBe(200);
    expect(delRes2.json().result.wholeRequestDeleted).toBe(true);

    // Verify torrent removed from qBittorrent
    expect(mockQb.removedTorrents).toContainEqual({ hash: 'bb_hash_1', deleteFiles: true });

    // Verify parent request is deleted
    const parentAfterEp2 = app.requestsRepo.findById(req.id);
    expect(parentAfterEp2?.status).toBe('deleted');
    expect(parentAfterEp2?.deletionReason).toBe('cleanup');
  });

  it('updates episode play history without marking entire season pack consumed prematurely', async () => {
    const req = app.requestsRepo.create({
      id: crypto.randomUUID(),
      userId: adminUserId,
      title: 'Anime Season Pack',
      mediaType: 'anime',
      status: 'seeding',
      qbTorrentHash: 'anime_hash',
      magnetLink: 'magnet:?xt=urn:btih:mock',
      metadataId: 'meta-123',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
      jellyfinPath: path.join(libraryDir, 'Anime'),
    });

    const ep1Lib = path.join(libraryDir, 'Anime', 'S01E01.mkv');
    const ep2Lib = path.join(libraryDir, 'Anime', 'S01E02.mkv');
    fs.mkdirSync(path.dirname(ep1Lib), { recursive: true });
    fs.writeFileSync(ep1Lib, 'anime1');
    fs.writeFileSync(ep2Lib, 'anime2');

    const [ep1, ep2] = app.episodesRepo.createMany([
      {
        requestId: req.id,
        seasonNumber: 1,
        episodeNumber: 1,
        fileIndex: 0,
        relativePath: 'S01E01.mkv',
        jellyfinPath: ep1Lib,
        sizeBytes: 6,
      },
      {
        requestId: req.id,
        seasonNumber: 1,
        episodeNumber: 2,
        fileIndex: 1,
        relativePath: 'S01E02.mkv',
        jellyfinPath: ep2Lib,
        sizeBytes: 6,
      },
    ]);

    // Admin plays ep1 only
    mockJellyfin.playHistory[ep1Lib] = '2026-09-25T12:00:00Z';
    mockJellyfin.userPlayHistories['jf_admin_user'] = {
      [ep1Lib]: '2026-09-25T12:00:00Z',
    };

    await app.cleanup.refreshPlayHistory();

    // Episode 1 has lastPlayedAt updated
    const ep1Updated = app.episodesRepo.findById(ep1.id);
    expect(ep1Updated?.lastPlayedAt).toBe('2026-09-25T12:00:00Z');

    // Episode 2 still null
    const ep2Updated = app.episodesRepo.findById(ep2.id);
    expect(ep2Updated?.lastPlayedAt).toBeNull();

    // Parent request is NOT fully consumed
    let candidates = await app.cleanup.getCandidates();
    expect(candidates.find((c) => c.id === req.id)?.isFullyConsumed).toBe(false);

    // Now admin plays ep2
    mockJellyfin.playHistory[ep2Lib] = '2026-09-25T13:00:00Z';
    mockJellyfin.userPlayHistories['jf_admin_user'][ep2Lib] = '2026-09-25T13:00:00Z';

    candidates = await app.cleanup.getCandidates();

    // Now all constituent episodes played -> parent request marked fully consumed
    expect(candidates.find((c) => c.id === req.id)?.isFullyConsumed).toBe(true);
  });

  it('prunes consumed episodes under storage pressure while respecting keep flags', async () => {
    const req = app.requestsRepo.create({
      id: crypto.randomUUID(),
      userId: adminUserId,
      title: 'Cleanable Show',
      mediaType: 'tv_show',
      status: 'seeding',
      qbTorrentHash: 'clean_hash',
      magnetLink: 'magnet:?xt=urn:btih:mock',
      metadataId: 'meta-123',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
      jellyfinPath: path.join(libraryDir, 'Cleanable Show'),
    });

    const ep1Lib = path.join(libraryDir, 'Cleanable Show', 'S01E01.mkv');
    const ep2Lib = path.join(libraryDir, 'Cleanable Show', 'S01E02.mkv');
    const ep1Staging = path.join(stagingDir, 'S01E01.mkv');
    const ep2Staging = path.join(stagingDir, 'S01E02.mkv');
    fs.mkdirSync(path.dirname(ep1Lib), { recursive: true });
    fs.writeFileSync(ep1Lib, 'c1');
    fs.writeFileSync(ep2Lib, 'c2');
    fs.writeFileSync(ep1Staging, 'c1');
    fs.writeFileSync(ep2Staging, 'c2');

    const [ep1, ep2] = app.episodesRepo.createMany([
      {
        requestId: req.id,
        seasonNumber: 1,
        episodeNumber: 1,
        fileIndex: 0,
        relativePath: 'S01E01.mkv',
        jellyfinPath: ep1Lib,
        sizeBytes: 1000,
        lastPlayedAt: '2026-09-20T00:00:00Z', // Consumed
        keepFlag: false,
      },
      {
        requestId: req.id,
        seasonNumber: 1,
        episodeNumber: 2,
        fileIndex: 1,
        relativePath: 'S01E02.mkv',
        jellyfinPath: ep2Lib,
        sizeBytes: 1000,
        lastPlayedAt: '2026-09-21T00:00:00Z',
        keepFlag: true, // Kept!
      },
    ]);

    // Prune under pressure for 500 bytes deficit
    const freed = await app.episodicPruning.pruneConsumedEpisodesUnderPressure(500);
    expect(freed).toBe(1000);

    // ep1 was pruned, ep2 kept
    const ep1Post = app.episodesRepo.findById(ep1.id);
    expect(ep1Post?.status).toBe('pruned');

    const ep2Post = app.episodesRepo.findById(ep2.id);
    expect(ep2Post?.status).toBe('downloaded');
  });

  it('backfills existing season packs from disk and qBittorrent', async () => {
    const req = app.requestsRepo.create({
      id: crypto.randomUUID(),
      userId: adminUserId,
      title: 'Legacy Season Pack',
      mediaType: 'tv_show',
      seasonNumber: 1,
      status: 'seeding',
      qbTorrentHash: 'legacy_hash',
      magnetLink: 'magnet:?xt=urn:btih:mock',
      metadataId: 'meta-123',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
      jellyfinPath: path.join(libraryDir, 'Legacy Show'),
    });

    const ep1Lib = path.join(libraryDir, 'Legacy Show', 'Season 1', 'Legacy.S01E01.mkv');
    const ep2Lib = path.join(libraryDir, 'Legacy Show', 'Season 1', 'Legacy.S01E02.mkv');
    fs.mkdirSync(path.dirname(ep1Lib), { recursive: true });
    fs.writeFileSync(ep1Lib, 'leg1');
    fs.writeFileSync(ep2Lib, 'leg2');

    mockQb.torrentFiles.set('legacy_hash', [
      { name: 'Legacy Show/Legacy.S01E01.mkv', size: 100 },
      { name: 'Legacy Show/Legacy.S01E02.mkv', size: 100 },
    ]);

    const count = await app.episodicPruning.backfillExistingSeasonPacks();
    expect(count).toBe(2);

    const episodes = app.episodesRepo.findByRequestId(req.id);
    expect(episodes).toHaveLength(2);
    expect(episodes.map((e) => e.episodeNumber).sort()).toEqual([1, 2]);
  });
});
