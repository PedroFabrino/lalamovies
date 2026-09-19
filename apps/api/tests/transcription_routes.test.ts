import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { downloadRequests, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { DownloadPoller } from '../src/jobs/downloadPoller';
import { ISubtitleInspectionService } from '../src/services/subtitleInspection';

describe('Transcription Routes & Detection Hook (Subtask #100)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let trustedToken: string;
  let userToken: string;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jwtSecret: 'test-jwt-secret-at-least-32-characters-long',
    });
    await app.ready();

    // Create users
    app.db.insert(users).values([
      { id: 'usr_admin', username: 'admin', jellyfinUserId: 'jf_admin', role: 'admin', createdAt: new Date().toISOString() },
      { id: 'usr_trusted', username: 'trusted', jellyfinUserId: 'jf_trusted', role: 'trusted', createdAt: new Date().toISOString() },
      { id: 'usr_normal', username: 'normal', jellyfinUserId: 'jf_normal', role: 'user', createdAt: new Date().toISOString() },
    ]).run();

    adminToken = app.jwt.sign({ id: 'usr_admin', username: 'admin', role: 'admin' });
    trustedToken = app.jwt.sign({ id: 'usr_trusted', username: 'trusted', role: 'trusted' });
    userToken = app.jwt.sign({ id: 'usr_normal', username: 'normal', role: 'user' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects POST /requests/:id/transcribe when unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_1/transcribe',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 when request does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/requests/nonexistent/transcribe',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 403 when regular user attempts to trigger transcription', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req_priv_1',
      userId: 'usr_normal',
      magnetLink: 'magnet:?xt=urn:btih:1111',
      mediaType: 'private',
      status: 'seeding',
      metadataId: 'priv_1',
      metadataSource: 'tmdb',
      title: 'Private Movie',
      requestedAt: new Date().toISOString(),
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_priv_1/transcribe',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when trusted user attempts to trigger transcription on another users private request', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req_priv_other',
      userId: 'usr_admin',
      magnetLink: 'magnet:?xt=urn:btih:2222',
      mediaType: 'private',
      status: 'seeding',
      metadataId: 'priv_2',
      metadataSource: 'tmdb',
      title: 'Admin Private Movie',
      requestedAt: new Date().toISOString(),
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_priv_other/transcribe',
      headers: { authorization: `Bearer ${trustedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows trusted user to trigger transcription for their own private request and clears error', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req_trusted_priv',
      userId: 'usr_trusted',
      magnetLink: 'magnet:?xt=urn:btih:3333',
      mediaType: 'private',
      status: 'seeding',
      metadataId: 'priv_3',
      metadataSource: 'tmdb',
      title: 'Trusted Private Movie',
      requestedAt: new Date().toISOString(),
      transcriptionStatus: 'failed',
      transcriptionError: 'Previous error message',
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_trusted_priv/transcribe',
      headers: { authorization: `Bearer ${trustedToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.request.transcriptionStatus).toBe('pending');
    expect(body.request.transcriptionError).toBeNull();

    const inDb = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_trusted_priv')).get();
    expect(inDb?.transcriptionStatus).toBe('pending');
    expect(inDb?.transcriptionError).toBeNull();
  });

  it('allows admin to trigger transcription for any private request', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req_admin_test',
      userId: 'usr_trusted',
      magnetLink: 'magnet:?xt=urn:btih:4444',
      mediaType: 'private',
      status: 'seeding',
      metadataId: 'priv_4',
      metadataSource: 'tmdb',
      title: 'Another Private Movie',
      requestedAt: new Date().toISOString(),
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/requests/req_admin_test/transcribe',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.request.transcriptionStatus).toBe('pending');
  });

  it('auto-enqueues transcription_status = pending in DownloadPoller when private download has zero subtitles', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'poller-trans-test-1-'));
    const stagingDir = path.join(tmpDir, 'staging');
    const mediaDir = path.join(tmpDir, 'media');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    const fileName = 'Torrent.Name.mkv';
    fs.writeFileSync(path.join(stagingDir, fileName), 'dummy content');

    const mockSubtitleInspection: ISubtitleInspectionService = {
      inspect: vi.fn().mockResolvedValue({
        hasSubtitles: false,
        externalSubtitles: [],
        embeddedSubtitlesCount: 0,
      }),
      probeContainer: vi.fn().mockResolvedValue(0),
    };

    const mockQbit: any = {
      getTorrentStatus: vi.fn().mockResolvedValue({
        hash: 'hash_test_1',
        progress: 1,
        state: 'uploading',
        name: fileName,
        size: 1000000,
      }),
      getTorrentFiles: vi.fn().mockResolvedValue([
        { name: fileName, size: 1000000 },
      ]),
    };

    const mockFs: any = {
      buildLibraryPath: vi.fn().mockReturnValue(path.join(mediaDir, 'private/movies/Movie (2024)/Movie (2024).mkv')),
      hardlinkDirectory: vi.fn(),
      hardlink: vi.fn(),
    };

    const mockJellyfin: any = {
      refreshLibrary: vi.fn().mockResolvedValue(undefined),
    };

    const poller = new DownloadPoller({
      db: app.db,
      qbittorrent: mockQbit,
      fileSystem: mockFs,
      jellyfin: mockJellyfin,
      subtitleInspection: mockSubtitleInspection,
      stagingPath: stagingDir,
    });

    app.db.insert(downloadRequests).values({
      id: 'req_poller_priv_nosub',
      userId: 'usr_trusted',
      magnetLink: 'magnet:?xt=urn:btih:hash_test_1',
      qbTorrentHash: 'hash_test_1',
      mediaType: 'private',
      status: 'downloading',
      metadataId: 'poller_priv_1',
      metadataSource: 'tmdb',
      title: 'Poller Private Movie',
      requestedAt: new Date().toISOString(),
    }).run();

    await poller.pollOnce();

    const updated = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_poller_priv_nosub')).get();
    expect(updated?.status).toBe('seeding');
    expect(updated?.transcriptionStatus).toBe('pending');
    expect(mockSubtitleInspection.inspect).toHaveBeenCalled();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sets transcription_status = none in DownloadPoller when private download already has subtitles', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'poller-trans-test-2-'));
    const stagingDir = path.join(tmpDir, 'staging');
    const mediaDir = path.join(tmpDir, 'media');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    const fileName = 'Torrent2.Name.mkv';
    fs.writeFileSync(path.join(stagingDir, fileName), 'dummy content');

    const mockSubtitleInspection: ISubtitleInspectionService = {
      inspect: vi.fn().mockResolvedValue({
        hasSubtitles: true,
        externalSubtitles: ['/some/sub.en.srt'],
        embeddedSubtitlesCount: 1,
      }),
      probeContainer: vi.fn().mockResolvedValue(1),
    };

    const mockQbit: any = {
      getTorrentStatus: vi.fn().mockResolvedValue({
        hash: 'hash_test_2',
        progress: 1,
        state: 'uploading',
        name: fileName,
        size: 1000000,
      }),
      getTorrentFiles: vi.fn().mockResolvedValue([
        { name: fileName, size: 1000000 },
      ]),
    };

    const mockFs: any = {
      buildLibraryPath: vi.fn().mockReturnValue(path.join(mediaDir, 'private/movies/Movie2 (2024)/Movie2 (2024).mkv')),
      hardlinkDirectory: vi.fn(),
      hardlink: vi.fn(),
    };

    const poller = new DownloadPoller({
      db: app.db,
      qbittorrent: mockQbit,
      fileSystem: mockFs,
      jellyfin: { refreshLibrary: vi.fn().mockResolvedValue(undefined) } as any,
      subtitleInspection: mockSubtitleInspection,
      stagingPath: stagingDir,
    });

    app.db.insert(downloadRequests).values({
      id: 'req_poller_priv_sub',
      userId: 'usr_trusted',
      magnetLink: 'magnet:?xt=urn:btih:hash_test_2',
      qbTorrentHash: 'hash_test_2',
      mediaType: 'private',
      status: 'downloading',
      metadataId: 'poller_priv_2',
      metadataSource: 'tmdb',
      title: 'Poller Movie With Subs',
      requestedAt: new Date().toISOString(),
    }).run();

    await poller.pollOnce();

    const updated = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_poller_priv_sub')).get();
    expect(updated?.status).toBe('seeding');
    expect(updated?.transcriptionStatus).toBe('none');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('includes transcriptionStatus and transcriptionError in GET /requests across page reloads', async () => {
    app.db.insert(downloadRequests).values({
      id: 'req_list_trans_test',
      userId: 'usr_trusted',
      magnetLink: 'magnet:?xt=urn:btih:5555',
      mediaType: 'private',
      status: 'seeding',
      metadataId: 'priv_5',
      metadataSource: 'tmdb',
      title: 'Persistent Status Movie',
      requestedAt: new Date().toISOString(),
      transcriptionStatus: 'transcribing',
      transcriptionError: null,
    }).run();

    const res = await app.inject({
      method: 'GET',
      url: '/requests',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const target = body.requests.find((r: any) => r.id === 'req_list_trans_test');
    expect(target).toBeDefined();
    expect(target.transcriptionStatus).toBe('transcribing');
    expect(target.transcriptionError).toBeNull();
  });
});

