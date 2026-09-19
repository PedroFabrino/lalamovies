import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { downloadRequests, users } from '../src/db/schema';
import { OpenSubtitlesService } from '../src/services/openSubtitles';

describe('Subtitle Routes (GET/POST /requests/:id/subtitles)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let otherUserToken: string;
  let tmpDir: string;
  let mockOpenSubtitles: any;
  let refreshLibraryCalled = 0;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subtitle-routes-test-'));
    refreshLibraryCalled = 0;

    mockOpenSubtitles = {
      isConfigured: vi.fn().mockReturnValue(true),
      searchSubtitles: vi.fn().mockResolvedValue([
        {
          fileId: 101,
          uploaderName: 'Uploader1',
          downloadCount: 5000,
          uploadDate: '2023-01-01',
          releaseName: 'Release.1080p',
        },
        {
          fileId: 102,
          uploaderName: 'Uploader2',
          downloadCount: 2000,
          uploadDate: '2023-01-02',
          releaseName: 'Release.720p',
        },
      ]),
      downloadAndWrite: vi.fn().mockResolvedValue(true),
      downloadAndWriteMultiple: vi.fn().mockResolvedValue(2),
      fetchBest: vi.fn().mockResolvedValue(true),
    };

    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jwtSecret: 'test-jwt-secret-at-least-32-characters-long',
      openSubtitlesService: mockOpenSubtitles,
      jellyfinService: {
        refreshLibrary: async () => {
          refreshLibraryCalled++;
        },
      } as any,
    });
    await app.ready();

    app.db
      .insert(users)
      .values([
        { id: 'usr_admin', username: 'admin', jellyfinUserId: 'jf_admin', role: 'admin', createdAt: new Date().toISOString() },
        { id: 'usr_normal', username: 'normal', jellyfinUserId: 'jf_normal', role: 'user', createdAt: new Date().toISOString() },
        { id: 'usr_other', username: 'other', jellyfinUserId: 'jf_other', role: 'user', createdAt: new Date().toISOString() },
      ])
      .run();

    adminToken = app.jwt.sign({ id: 'usr_admin', username: 'admin', role: 'admin' });
    userToken = app.jwt.sign({ id: 'usr_normal', username: 'normal', role: 'user' });
    otherUserToken = app.jwt.sign({ id: 'usr_other', username: 'other', role: 'user' });
  });

  afterEach(async () => {
    await app.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('rejects GET /requests/:id/subtitles when unauthenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/requests/req_1/subtitles',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 when request does not exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/requests/nonexistent/subtitles',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when request is still downloading (not seeding or done)', async () => {
    app.db
      .insert(downloadRequests)
      .values({
        id: 'req_downloading',
        userId: 'usr_normal',
        magnetLink: 'magnet:?xt=urn:btih:111',
        mediaType: 'movie',
        status: 'downloading',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'Downloading Movie',
        requestedAt: new Date().toISOString(),
      })
      .run();

    const res = await app.inject({
      method: 'GET',
      url: '/requests/req_downloading/subtitles',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).message).toContain('completed');
  });

  it('returns 503 when OpenSubtitles is not configured', async () => {
    mockOpenSubtitles.isConfigured.mockReturnValue(false);

    app.db
      .insert(downloadRequests)
      .values({
        id: 'req_done',
        userId: 'usr_normal',
        magnetLink: 'magnet:?xt=urn:btih:111',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'Seeding Movie',
        jellyfinPath: path.join(tmpDir, 'movie.mkv'),
        requestedAt: new Date().toISOString(),
      })
      .run();

    const res = await app.inject({
      method: 'GET',
      url: '/requests/req_done/subtitles',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(503);
  });

  it('returns search results for completed movie request', async () => {
    app.db
      .insert(downloadRequests)
      .values({
        id: 'req_done_movie',
        userId: 'usr_normal',
        magnetLink: 'magnet:?xt=urn:btih:111',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '550',
        metadataSource: 'tmdb',
        title: 'Fight Club',
        year: 1999,
        jellyfinPath: path.join(tmpDir, 'Fight Club (1999).mkv'),
        requestedAt: new Date().toISOString(),
      })
      .run();

    const res = await app.inject({
      method: 'GET',
      url: '/requests/req_done_movie/subtitles',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.subtitles).toHaveLength(2);
    expect(body.subtitles[0].fileId).toBe(101);
    expect(mockOpenSubtitles.searchSubtitles).toHaveBeenCalledWith({
      tmdbId: '550',
      title: 'Fight Club',
      year: 1999,
      seasonNumber: null,
      episodeNumber: null,
    });
  });

  it('POST /requests/:id/subtitles/fetch applies specific fileId and triggers Jellyfin refresh', async () => {
    const mediaPath = path.join(tmpDir, 'Movie (2020).mkv');
    fs.writeFileSync(mediaPath, 'dummy media');

    app.db
      .insert(downloadRequests)
      .values({
        id: 'req_apply_single',
        userId: 'usr_normal',
        magnetLink: 'magnet:?xt=urn:btih:111',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '200',
        metadataSource: 'tmdb',
        title: 'Movie',
        jellyfinPath: mediaPath,
        requestedAt: new Date().toISOString(),
      })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_apply_single/subtitles/fetch',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { fileId: 101 },
    });

    expect(res.statusCode).toBe(200);
    expect(mockOpenSubtitles.downloadAndWrite).toHaveBeenCalledWith(
      101,
      mediaPath.replace(/\.mkv$/, '.pt-BR.srt')
    );
    expect(refreshLibraryCalled).toBe(1);
  });

  it('POST /requests/:id/subtitles/fetch applies multiple fileIds and triggers Jellyfin refresh', async () => {
    const mediaPath = path.join(tmpDir, 'Movie (2020).mkv');
    fs.writeFileSync(mediaPath, 'dummy media');

    app.db
      .insert(downloadRequests)
      .values({
        id: 'req_apply_multi',
        userId: 'usr_normal',
        magnetLink: 'magnet:?xt=urn:btih:111',
        mediaType: 'movie',
        status: 'seeding',
        metadataId: '200',
        metadataSource: 'tmdb',
        title: 'Movie',
        jellyfinPath: mediaPath,
        requestedAt: new Date().toISOString(),
      })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_apply_multi/subtitles/fetch',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { fileIds: [101, 102] },
    });

    expect(res.statusCode).toBe(200);
    expect(mockOpenSubtitles.downloadAndWriteMultiple).toHaveBeenCalledWith(
      [101, 102],
      mediaPath
    );
    expect(refreshLibraryCalled).toBe(1);
  });

  it('POST /requests/:id/subtitles/fetch re-fetches best when no fileId or fileIds given', async () => {
    const mediaPath = path.join(tmpDir, 'Movie (2020).mkv');
    fs.writeFileSync(mediaPath, 'dummy media');

    app.db
      .insert(downloadRequests)
      .values({
        id: 'req_refetch_best',
        userId: 'usr_normal',
        magnetLink: 'magnet:?xt=urn:btih:111',
        mediaType: 'movie',
        status: 'done',
        metadataId: '200',
        metadataSource: 'tmdb',
        title: 'Movie',
        year: 2020,
        jellyfinPath: mediaPath,
        requestedAt: new Date().toISOString(),
      })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_refetch_best/subtitles/fetch',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(mockOpenSubtitles.fetchBest).toHaveBeenCalledTimes(1);
    expect(refreshLibraryCalled).toBe(1);
  });

  it('returns 502 when OpenSubtitles download returns false/fails', async () => {
    mockOpenSubtitles.downloadAndWrite.mockResolvedValue(false);

    const mediaPath = path.join(tmpDir, 'Movie.mkv');
    app.db
      .insert(downloadRequests)
      .values({
        id: 'req_fail',
        userId: 'usr_normal',
        magnetLink: 'magnet:?xt=urn:btih:111',
        mediaType: 'movie',
        status: 'done',
        metadataId: '200',
        metadataSource: 'tmdb',
        title: 'Movie',
        jellyfinPath: mediaPath,
        requestedAt: new Date().toISOString(),
      })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_fail/subtitles/fetch',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { fileId: 999 },
    });

    expect(res.statusCode).toBe(502);
  });
});
