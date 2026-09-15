import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { users, downloadRequests, requestCoRequesters, featureFlags } from '../src/db/schema';
import { IJellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService } from '../src/services/qbittorrent';
import { FileSystemService } from '../src/services/fileSystem';

class MockJellyfin implements Partial<IJellyfinService> {
  public refreshCount = 0;
  async refreshLibrary(): Promise<void> {
    this.refreshCount++;
  }
}

class MockQBittorrent implements Partial<IQBittorrentService> {
  public removedTorrents: { hash: string; deleteFiles?: boolean }[] = [];
  async removeTorrent(hash: string, deleteFiles?: boolean): Promise<void> {
    this.removedTorrents.push({ hash, deleteFiles });
  }
  async getActiveTorrentCount(): Promise<number> {
    return 0;
  }
  async addTorrent(): Promise<string> {
    return 'mock_hash';
  }
}

describe('Media Library API & Capabilities (Subtasks #95, #96, #97)', () => {
  let app: FastifyInstance;
  let tempMediaDir: string;
  let mockJf: MockJellyfin;
  let mockQb: MockQBittorrent;

  let adminToken: string;
  let aliceToken: string;
  let bobToken: string;

  const adminId = 'usr_admin';
  const aliceId = 'usr_alice';
  const bobId = 'usr_bob';

  beforeEach(async () => {
    tempMediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdm-lib-test-'));
    mockJf = new MockJellyfin();
    mockQb = new MockQBittorrent();

    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jwtSecret: 'test-jwt-secret-key-32-chars-long!!',
      jellyfinService: mockJf as any,
      qbittorrentService: mockQb as any,
      fileSystemService: new FileSystemService(tempMediaDir),
    });
    await app.ready();

    // Insert users
    app.db
      .insert(users)
      .values([
        { id: adminId, username: 'admin', role: 'admin', jellyfinUserId: 'jf_admin', createdAt: new Date().toISOString() },
        { id: aliceId, username: 'alice', role: 'user', jellyfinUserId: 'jf_alice', createdAt: new Date().toISOString() },
        { id: bobId, username: 'bob', role: 'user', jellyfinUserId: 'jf_bob', createdAt: new Date().toISOString() },
      ])
      .run();

    adminToken = app.jwt.sign({ id: adminId, username: 'admin', role: 'admin', jellyfinUserId: 'jf_admin' });
    aliceToken = app.jwt.sign({ id: aliceId, username: 'alice', role: 'user', jellyfinUserId: 'jf_alice' });
    bobToken = app.jwt.sign({ id: bobId, username: 'bob', role: 'user', jellyfinUserId: 'jf_bob' });
  });

  afterEach(async () => {
    await app.close();
    try {
      if (fs.existsSync(tempMediaDir)) {
        fs.rmSync(tempMediaDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }
  });

  describe('Feature Flag & Authentication Guarding', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/library' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects requests with 503 when jellyfin_library_view is disabled', async () => {
      app.db
        .update(featureFlags)
        .set({ enabled: false })
        .where(eq(featureFlags.id, 'jellyfin_library_view'))
        .run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: { authorization: `Bearer ${aliceToken}` },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('FEATURE_DISABLED');
    });
  });

  describe('GET /api/library (Subtask #95)', () => {
    it('returns empty lists when no completed downloads exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: { authorization: `Bearer ${aliceToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ movies: [], shows: [], anime: [] });
    });

    it('strictly excludes incomplete or deleted downloads (queued, downloading, hardlinking, error, deleted)', async () => {
      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values([
          { id: 'req_q', userId: aliceId, magnetLink: 'magnet:?1', mediaType: 'movie', status: 'queued', metadataId: '1', metadataSource: 'tmdb', title: 'Queued Movie', requestedAt: now },
          { id: 'req_d', userId: aliceId, magnetLink: 'magnet:?2', mediaType: 'movie', status: 'downloading', metadataId: '2', metadataSource: 'tmdb', title: 'Downloading Movie', requestedAt: now },
          { id: 'req_h', userId: aliceId, magnetLink: 'magnet:?3', mediaType: 'movie', status: 'hardlinking', metadataId: '3', metadataSource: 'tmdb', title: 'Hardlinking Movie', requestedAt: now },
          { id: 'req_e', userId: aliceId, magnetLink: 'magnet:?4', mediaType: 'movie', status: 'error', metadataId: '4', metadataSource: 'tmdb', title: 'Error Movie', requestedAt: now },
          { id: 'req_del', userId: aliceId, magnetLink: 'magnet:?5', mediaType: 'movie', status: 'deleted', metadataId: '5', metadataSource: 'tmdb', title: 'Deleted Movie', requestedAt: now },
        ])
        .run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: { authorization: `Bearer ${aliceToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().movies).toHaveLength(0);
    });

    it('returns completed movies with ownership flags, badges, and co-requesters', async () => {
      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values([
          {
            id: 'mov_1',
            userId: aliceId,
            magnetLink: 'magnet:?1',
            mediaType: 'movie',
            status: 'done',
            metadataId: 'm1',
            metadataSource: 'tmdb',
            title: 'Inception',
            year: 2010,
            sizeBytes: 2500000000,
            jellyfinPath: path.join(tempMediaDir, 'movies', 'Inception (2010)', 'Inception.mkv'),
            requestedAt: now,
          },
          {
            id: 'mov_2',
            userId: bobId,
            magnetLink: 'magnet:?2',
            mediaType: 'movie',
            status: 'seeding',
            metadataId: 'm2',
            metadataSource: 'tmdb',
            title: 'Interstellar',
            year: 2014,
            sizeBytes: 4500000000,
            jellyfinPath: path.join(tempMediaDir, 'movies', 'Interstellar (2014)', 'Interstellar.mkv'),
            requestedAt: now,
          },
        ])
        .run();

      // Alice is co-requester on Bob's Interstellar
      app.db
        .insert(requestCoRequesters)
        .values({ requestId: 'mov_2', userId: aliceId, addedAt: now })
        .run();

      // As Alice:
      const resAlice = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: { authorization: `Bearer ${aliceToken}` },
      });
      expect(resAlice.statusCode).toBe(200);
      const moviesAlice = resAlice.json().movies;
      expect(moviesAlice).toHaveLength(2);

      const inception = moviesAlice.find((m: any) => m.title === 'Inception');
      expect(inception.canManage).toBe(true);
      expect(inception.requestedBy.username).toBe('alice');

      const interstellar = moviesAlice.find((m: any) => m.title === 'Interstellar');
      expect(interstellar.canManage).toBe(false); // Alice is only co-requester
      expect(interstellar.requestedBy.username).toBe('bob');
      expect(interstellar.coRequesters).toHaveLength(1);
      expect(interstellar.coRequesters[0].username).toBe('alice');

      // As Admin: canManage should be true for all
      const resAdmin = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const moviesAdmin = resAdmin.json().movies;
      expect(moviesAdmin.every((m: any) => m.canManage)).toBe(true);
    });

    it('groups episodic TV shows and Anime at title level with season/episode breakdown', async () => {
      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values([
          {
            id: 'ep_1',
            userId: aliceId,
            magnetLink: 'magnet:?1',
            mediaType: 'tv_show',
            status: 'done',
            metadataId: 'tv_1',
            metadataSource: 'tmdb',
            title: 'Severance',
            year: 2022,
            seasonNumber: 1,
            episodeNumber: 1,
            sizeBytes: 1000000,
            jellyfinPath: path.join(tempMediaDir, 'shows', 'Severance (2022)', 'Season 01', 'Severance S01E01.mkv'),
            requestedAt: now,
          },
          {
            id: 'ep_2',
            userId: aliceId,
            magnetLink: 'magnet:?2',
            mediaType: 'tv_show',
            status: 'done',
            metadataId: 'tv_1',
            metadataSource: 'tmdb',
            title: 'Severance',
            year: 2022,
            seasonNumber: 1,
            episodeNumber: 2,
            sizeBytes: 1200000,
            jellyfinPath: path.join(tempMediaDir, 'shows', 'Severance (2022)', 'Season 01', 'Severance S01E02.mkv'),
            requestedAt: now,
          },
          {
            id: 'anime_1',
            userId: bobId,
            magnetLink: 'magnet:?3',
            mediaType: 'anime',
            status: 'done',
            metadataId: 'ani_1',
            metadataSource: 'anilist',
            title: 'Frieren',
            year: 2023,
            seasonNumber: 1,
            episodeNumber: 1,
            sizeBytes: 800000,
            jellyfinPath: path.join(tempMediaDir, 'anime', 'Frieren', 'Season 01', 'Frieren S01E01.mkv'),
            requestedAt: now,
          },
        ])
        .run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/library',
        headers: { authorization: `Bearer ${aliceToken}` },
      });

      expect(res.statusCode).toBe(200);
      const { shows, anime } = res.json();

      expect(shows).toHaveLength(1);
      const severance = shows[0];
      expect(severance.title).toBe('Severance');
      expect(severance.requestIds).toEqual(['ep_1', 'ep_2']);
      expect(severance.sizeBytes).toBe(2200000);
      expect(severance.seasons).toHaveLength(1);
      expect(severance.seasons[0].seasonNumber).toBe(1);
      expect(severance.seasons[0].episodeCount).toBe(2);
      expect(severance.canManage).toBe(true);

      expect(anime).toHaveLength(1);
      const frieren = anime[0];
      expect(frieren.title).toBe('Frieren');
      expect(frieren.canManage).toBe(false); // Alice is not owner
    });
  });

  describe('POST /api/library/move (Subtask #96)', () => {
    it('rejects relocation if user does not own all requested items (HTTP 403)', async () => {
      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values({
          id: 'bob_show',
          userId: bobId,
          magnetLink: 'magnet:?1',
          mediaType: 'tv_show',
          status: 'done',
          metadataId: 's1',
          metadataSource: 'tmdb',
          title: 'Bob Show',
          requestedAt: now,
        })
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/library/move',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { requestIds: ['bob_show'], targetMediaType: 'anime' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('FORBIDDEN');
    });

    it('moves directory on disk, preserves hardlinks, updates DB and triggers Jellyfin rescan', async () => {
      const srcDir = path.join(tempMediaDir, 'shows', 'Attack on Titan', 'Season 01');
      fs.mkdirSync(srcDir, { recursive: true });
      const srcFile = path.join(srcDir, 'Attack on Titan S01E01.mkv');
      fs.writeFileSync(srcFile, 'video-data-content');

      const srcStat = fs.statSync(srcFile);

      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values({
          id: 'req_aot',
          userId: aliceId,
          magnetLink: 'magnet:?1',
          mediaType: 'tv_show',
          status: 'done',
          metadataId: 'aot_1',
          metadataSource: 'anilist',
          title: 'Attack on Titan',
          seasonNumber: 1,
          episodeNumber: 1,
          jellyfinPath: srcFile,
          requestedAt: now,
        })
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/library/move',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { requestIds: ['req_aot'], targetMediaType: 'anime' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      // Verify DB update
      const updated = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, 'req_aot'))
        .get();

      expect(updated?.mediaType).toBe('anime');
      expect(updated?.jellyfinPath).toContain(path.join('anime', 'Attack on Titan', 'Season 01'));
      expect(fs.existsSync(updated!.jellyfinPath!)).toBe(true);

      // Inode check: renameSync preserves inode
      const destStat = fs.statSync(updated!.jellyfinPath!);
      expect(destStat.ino).toBe(srcStat.ino);

      // Verify old empty folder was removed
      expect(fs.existsSync(srcDir)).toBe(false);

      // Verify Jellyfin rescan called
      expect(mockJf.refreshCount).toBe(1);
    });

    it('allows admin to move items requested by any user', async () => {
      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values({
          id: 'bob_movie',
          userId: bobId,
          magnetLink: 'magnet:?1',
          mediaType: 'movie',
          status: 'done',
          metadataId: 'm_bob',
          metadataSource: 'tmdb',
          title: 'Anime Movie',
          requestedAt: now,
        })
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/library/move',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { requestIds: ['bob_movie'], targetMediaType: 'anime' },
      });

      expect(res.statusCode).toBe(200);
      const updated = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, 'bob_movie'))
        .get();
      expect(updated?.mediaType).toBe('anime');
    });
  });

  describe('POST /api/library/delete (Subtask #97)', () => {
    it('rejects deletion if user is only a co-requester or non-owner (HTTP 403)', async () => {
      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values({
          id: 'bob_item',
          userId: bobId,
          magnetLink: 'magnet:?1',
          mediaType: 'movie',
          status: 'done',
          metadataId: 'b1',
          metadataSource: 'tmdb',
          title: 'Bob Exclusive',
          requestedAt: now,
        })
        .run();

      // Alice is added as co-requester
      app.db
        .insert(requestCoRequesters)
        .values({ requestId: 'bob_item', userId: aliceId, addedAt: now })
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/library/delete',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { requestIds: ['bob_item'] },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('FORBIDDEN');
    });

    it('cleans up disk files, torrents, transitions status to deleted, and rescans Jellyfin', async () => {
      const movieDir = path.join(tempMediaDir, 'movies', 'To Delete (2020)');
      fs.mkdirSync(movieDir, { recursive: true });
      const movieFile = path.join(movieDir, 'To Delete.mkv');
      fs.writeFileSync(movieFile, 'dummy-movie');

      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values({
          id: 'del_me',
          userId: aliceId,
          magnetLink: 'magnet:?del',
          mediaType: 'movie',
          status: 'done',
          metadataId: 'del_1',
          metadataSource: 'tmdb',
          title: 'To Delete',
          year: 2020,
          qbTorrentHash: 'hash_to_delete',
          jellyfinPath: movieFile,
          requestedAt: now,
        })
        .run();

      app.db
        .insert(requestCoRequesters)
        .values({ requestId: 'del_me', userId: bobId, addedAt: now })
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/library/delete',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { requestIds: ['del_me'] },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      // Verify torrent was removed from qBittorrent
      expect(mockQb.removedTorrents).toHaveLength(1);
      expect(mockQb.removedTorrents[0].hash).toBe('hash_to_delete');

      // Verify files deleted from disk
      expect(fs.existsSync(movieFile)).toBe(false);

      // Verify DB status is 'deleted' and co-requester record cleared
      const updated = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, 'del_me'))
        .get();
      expect(updated?.status).toBe('deleted');

      const coReqs = app.db
        .select()
        .from(requestCoRequesters)
        .where(eq(requestCoRequesters.requestId, 'del_me'))
        .all();
      expect(coReqs).toHaveLength(0);

      // Verify Jellyfin refresh was triggered
      expect(mockJf.refreshCount).toBeGreaterThan(0);
    });

    it('allows admin to delete items requested by another user', async () => {
      const now = new Date().toISOString();
      app.db
        .insert(downloadRequests)
        .values({
          id: 'admin_del_item',
          userId: bobId,
          magnetLink: 'magnet:?admin',
          mediaType: 'movie',
          status: 'done',
          metadataId: 'adm_1',
          metadataSource: 'tmdb',
          title: 'Admin Deleted Item',
          requestedAt: now,
        })
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/library/delete',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { requestIds: ['admin_del_item'] },
      });

      expect(res.statusCode).toBe(200);
      const updated = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, 'admin_del_item'))
        .get();
      expect(updated?.status).toBe('deleted');
    });
  });
});
