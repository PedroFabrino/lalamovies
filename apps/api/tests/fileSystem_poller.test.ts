import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq, asc } from 'drizzle-orm';
import { FileSystemService } from '../src/services/fileSystem';
import { DownloadPoller } from '../src/jobs/downloadPoller';
import { initDatabase, users, downloadRequests, systemConfig } from '../src/db';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { IJellyfinService } from '../src/services/jellyfin';

class MockQBService implements IQBittorrentService {
  public torrents = new Map<string, TorrentInfo>();
  public activeCount = 1;
  public addedTorrents: { magnet: string; savePath?: string }[] = [];

  async addTorrent(magnet: string, savePath?: string) {
    const hash = `hash_${Date.now()}`;
    this.addedTorrents.push({ magnet, savePath });
    this.torrents.set(hash, {
      hash,
      name: 'new_download.mkv',
      progress: 0,
      dlspeed: 500000,
      eta: 300,
      state: 'downloading',
      size: 1000000,
    });
    return hash;
  }

  async getActiveTorrentCount() {
    return this.activeCount;
  }

  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    return this.torrents.get(hash) || null;
  }

  async removeTorrent(hash: string) {
    this.torrents.delete(hash);
  }
}

class MockJellyfin implements IJellyfinService {
  public refreshCalled = 0;
  async authenticateUser() { return {} as any; }
  async createUser() { return 'uid'; }
  async deleteUser() {}
  async refreshLibrary() {
    this.refreshCalled++;
  }
}

describe('FileSystemService', () => {
  const fsService = new FileSystemService('/test_media');

  it('buildLibraryPath formats movies correctly', () => {
    const p1 = fsService.buildLibraryPath({
      mediaType: 'movie',
      title: 'The Matrix',
      year: 1999,
      ext: 'mkv',
      mediaBasePath: '/media',
    });
    expect(p1.replace(/\\/g, '/')).toBe('/media/movies/The Matrix (1999)/The Matrix (1999).mkv');

    const p2 = fsService.buildLibraryPath({
      mediaType: 'movie',
      title: 'Inception',
      mediaBasePath: '/media',
    });
    expect(p2.replace(/\\/g, '/')).toBe('/media/movies/Inception/Inception.mkv');
  });

  it('buildLibraryPath formats TV shows correctly for single episodes and season packs', () => {
    const epPath = fsService.buildLibraryPath({
      mediaType: 'tv_show',
      title: 'Breaking Bad',
      seasonNumber: 1,
      episodeNumber: 5,
      mediaBasePath: '/media',
    });
    expect(epPath.replace(/\\/g, '/')).toBe('/media/shows/Breaking Bad/Season 01/Breaking Bad S01E05.mkv');

    const packPath = fsService.buildLibraryPath({
      mediaType: 'tv_show',
      title: 'Breaking Bad',
      seasonNumber: 2,
      isSeasonPack: true,
      mediaBasePath: '/media',
    });
    expect(packPath.replace(/\\/g, '/')).toBe('/media/shows/Breaking Bad/Season 02');
  });

  it('buildLibraryPath formats anime correctly', () => {
    const animeEp = fsService.buildLibraryPath({
      mediaType: 'anime',
      title: 'Frieren',
      seasonNumber: 1,
      episodeNumber: 28,
      mediaBasePath: '/media',
    });
    expect(animeEp.replace(/\\/g, '/')).toBe('/media/anime/Frieren/Season 01/Frieren S01E28.mkv');

    const animePack = fsService.buildLibraryPath({
      mediaType: 'anime',
      title: 'Attack on Titan',
      seasonNumber: 4,
      isSeasonPack: true,
      mediaBasePath: '/media',
    });
    expect(animePack.replace(/\\/g, '/')).toBe('/media/anime/Attack on Titan/Season 04');
  });

  it('sanitizes illegal path characters from titles', () => {
    const sanitized = fsService.buildLibraryPath({
      mediaType: 'movie',
      title: 'Mission: Impossible / Fallout *2018*?',
      year: 2018,
      mediaBasePath: '/media',
    });
    expect(sanitized.replace(/\\/g, '/')).toBe(
      '/media/movies/Mission Impossible  Fallout 2018 (2018)/Mission Impossible  Fallout 2018 (2018).mkv'
    );
  });
});

describe('DownloadPoller & Hardlink Integration', () => {
  let tmpDir: string;
  let stagingDir: string;
  let mediaDir: string;
  let dbInstance: ReturnType<typeof initDatabase>;
  let mockQb: MockQBService;
  let mockJf: MockJellyfin;
  let fsService: FileSystemService;
  let poller: DownloadPoller;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdm-test-'));
    stagingDir = path.join(tmpDir, 'staging');
    mediaDir = path.join(tmpDir, 'media');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    dbInstance = initDatabase(':memory:');
    mockQb = new MockQBService();
    mockJf = new MockJellyfin();
        fsService = new FileSystemService(mediaDir);

    dbInstance.db.insert(users).values({
      id: 'usr_1',
      jellyfinUserId: 'jf_usr_1',
      username: 'poller_tester',
      createdAt: new Date().toISOString(),
    }).run();

    poller = new DownloadPoller({
      db: dbInstance.db,
      qbittorrent: mockQb,
      fileSystem: fsService,
      jellyfin: mockJf,
      stagingPath: stagingDir,
    });
  });

  afterEach(() => {
    poller.stop();
    dbInstance.sqlite.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects completed download, hardlinks file, calls Jellyfin refresh, and sets status to seeding', async () => {
    // 1. Create a dummy file in staging
    const downloadedFileName = 'Fight.Club.1999.mkv';
    const stagingFilePath = path.join(stagingDir, downloadedFileName);
    fs.writeFileSync(stagingFilePath, 'dummy video content');

    const hash = 'fc_hash_123';
    mockQb.torrents.set(hash, {
      hash,
      name: downloadedFileName,
      progress: 1.0,
      dlspeed: 0,
      eta: 0,
      state: 'uploading',
      size: 500000,
    });

    // Insert user & downloading request in DB
    const now = new Date().toISOString();
    dbInstance.db.insert(downloadRequests).values({
      id: 'req_1',
      userId: 'usr_1',
      magnetLink: 'magnet:?xt=urn:btih:fc_hash_123',
      mediaType: 'movie',
      status: 'downloading',
      metadataId: '550',
      metadataSource: 'tmdb',
      title: 'Fight Club',
      year: 1999,
      qbTorrentHash: hash,
      requestedAt: now,
    }).run();

    // Run one poll cycle
    await poller.pollOnce();

    // Verify status updated to seeding
    const updated = dbInstance.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, 'req_1'))
      .get();

    expect(updated?.status).toBe('seeding');
    expect(updated?.downloadedAt).toBeDefined();
    expect(updated?.sizeBytes).toBe(500000);
    expect(updated?.jellyfinPath).toBeDefined();

    // Verify file was hardlinked to media directory
    expect(fs.existsSync(updated!.jellyfinPath!)).toBe(true);
    expect(fs.readFileSync(updated!.jellyfinPath!, 'utf-8')).toBe('dummy video content');

    // Verify Jellyfin refresh was called
    expect(mockJf.refreshCalled).toBe(1);
  });

  it('promotes queued requests to downloading when slot opens under concurrent_limit', async () => {
    mockQb.activeCount = 1; // 1 active, limit is 2 -> 1 slot available

    // Insert 2 queued requests
    dbInstance.db.insert(downloadRequests).values([
      {
        id: 'q_1',
        userId: 'usr_1',
        magnetLink: 'magnet:?xt=urn:btih:first_queued',
        mediaType: 'movie',
        status: 'queued',
        metadataId: '10',
        metadataSource: 'tmdb',
        title: 'First Movie',
        requestedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'q_2',
        userId: 'usr_1',
        magnetLink: 'magnet:?xt=urn:btih:second_queued',
        mediaType: 'movie',
        status: 'queued',
        metadataId: '20',
        metadataSource: 'tmdb',
        title: 'Second Movie',
        requestedAt: '2026-09-01T11:00:00.000Z',
      },
    ]).run();

    // Run one poll cycle
    await poller.pollOnce();

    // Exactly the oldest queued item (q_1) should have been started
    const q1 = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'q_1')).get();
    const q2 = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'q_2')).get();

    expect(q1?.status).toBe('downloading');
    expect(q1?.qbTorrentHash).toBeDefined();

    expect(q2?.status).toBe('queued');
    expect(q2?.qbTorrentHash).toBeNull();
  });

  it('transitions to error status if hardlinking fails', async () => {
    const hash = 'missing_file_hash';
    mockQb.torrents.set(hash, {
      hash,
      name: 'NonExistentFile.mkv',
      progress: 1.0,
      dlspeed: 0,
      eta: 0,
      state: 'completed',
      size: 100,
    });

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_err',
      userId: 'usr_1',
      magnetLink: 'magnet:?xt=urn:btih:missing',
      mediaType: 'movie',
      status: 'downloading',
      metadataId: '99',
      metadataSource: 'tmdb',
      title: 'Missing File Movie',
      qbTorrentHash: hash,
      requestedAt: new Date().toISOString(),
    }).run();

    // Run poll cycle - source file does not exist in staging
    await poller.pollOnce();

    const result = dbInstance.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, 'req_err'))
      .get();

    expect(result?.status).toBe('error');
    expect(result?.errorMessage).toContain('Source file does not exist');
  });
});