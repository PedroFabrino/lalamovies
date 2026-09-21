import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq, asc } from 'drizzle-orm';
import { FileSystemService } from '../src/services/fileSystem';
import { DownloadPoller } from '../src/jobs/downloadPoller';
import { initDatabase, users, downloadRequests, systemConfig } from '../src/db';
import { MockQBittorrent as MockQBService } from './fixtures/mockQBittorrent';
import { MockJellyfin } from './fixtures/mockJellyfin';

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

  it('buildLibraryPath reuses established show folder and derives episode filename prefix from it (#106)', () => {
    const epPath = fsService.buildLibraryPath({
      mediaType: 'anime',
      title: 'The Exiled Heavy Knight Knows How to Game the System',
      year: 2026,
      seasonNumber: 1,
      episodeNumber: 12,
      mediaBasePath: '/media',
      existingShowFolder: 'Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru (2026)',
    });
    expect(epPath.replace(/\\/g, '/')).toBe(
      '/media/anime/Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru (2026)/Season 01/Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru S01E12.mkv'
    );
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

  describe('getStorageFootprintBytes', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdm-fs-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns 0 if path does not exist', async () => {
      await expect(fsService.getStorageFootprintBytes(path.join(tmpDir, 'does-not-exist'))).resolves.toBe(0);
    });

    it('calculates physical footprint without double-counting hardlinked files', async () => {
      const stagingDir = path.join(tmpDir, 'staging');
      const libraryDir = path.join(tmpDir, 'library');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(libraryDir, { recursive: true });

      // Create a 1 MB file in staging
      const testFile1 = path.join(stagingDir, 'movie.mkv');
      const buffer1MB = Buffer.alloc(1024 * 1024, 1);
      fs.writeFileSync(testFile1, buffer1MB);

      // Create another 512 KB standalone file
      const testFile2 = path.join(stagingDir, 'sample.mkv');
      const buffer512KB = Buffer.alloc(512 * 1024, 2);
      fs.writeFileSync(testFile2, buffer512KB);

      // Hardlink movie.mkv into library
      const hardlinkedFile = path.join(libraryDir, 'movie.mkv');
      fs.linkSync(testFile1, hardlinkedFile);

      // Total physical bytes on disk should be 1.5 MB (1024*1024 + 512*1024), NOT 2.5 MB!
      const totalFootprint = await fsService.getStorageFootprintBytes(tmpDir);
      expect(totalFootprint).toBe(1024 * 1024 + 512 * 1024);
    });

    it('ignores hidden directories such as .zurg and stream directory when calculating footprint', async () => {
      const stagingDir = path.join(tmpDir, 'staging');
      const zurgMountDir = path.join(tmpDir, '.zurg');
      const streamDir = path.join(tmpDir, 'stream');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(zurgMountDir, { recursive: true });
      fs.mkdirSync(streamDir, { recursive: true });

      // Create a 1 MB file in staging
      fs.writeFileSync(path.join(stagingDir, 'real-file.mkv'), Buffer.alloc(1024 * 1024, 1));

      // Create a 10 MB dummy file in .zurg and 5 MB in stream
      fs.writeFileSync(path.join(zurgMountDir, 'cloud-virtual.mkv'), Buffer.alloc(10 * 1024 * 1024, 2));
      fs.writeFileSync(path.join(streamDir, 'ephemeral.mkv'), Buffer.alloc(5 * 1024 * 1024, 3));

      // Total physical footprint must ONLY be the 1 MB file in staging
      const totalFootprint = await fsService.getStorageFootprintBytes(tmpDir);
      expect(totalFootprint).toBe(1024 * 1024);
    });

    it('caches footprint results and invalidates cache when requested', async () => {
      const stagingDir = path.join(tmpDir, 'staging');
      const mediaDir = path.join(tmpDir, 'media');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(mediaDir, { recursive: true });

      const prevStaging = process.env.STAGING_PATH;
      process.env.STAGING_PATH = stagingDir;

      try {
        const testFs = new FileSystemService(mediaDir);
        const baseline = await testFs.getStorageFootprintBytes(undefined, true);

        // Add 1MB file without invalidating cache
        fs.writeFileSync(path.join(mediaDir, 'test.mkv'), Buffer.alloc(1024 * 1024, 1));
        const cached = await testFs.getStorageFootprintBytes();
        expect(cached).toBe(baseline); // Cache hit

        // Invalidate cache and verify recalculation includes the new file
        testFs.invalidateFootprintCache();
        const fresh = await testFs.getStorageFootprintBytes();
        expect(fresh).toBe(baseline + 1024 * 1024); // Cache miss
      } finally {
        process.env.STAGING_PATH = prevStaging;
      }
    });

    it('coalesces concurrent calls to getStorageFootprintBytes into a single in-flight traversal', async () => {
      const stagingDir = path.join(tmpDir, 'staging');
      const mediaDir = path.join(tmpDir, 'media');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(mediaDir, { recursive: true });

      const prevStaging = process.env.STAGING_PATH;
      process.env.STAGING_PATH = stagingDir;

      try {
        const testFs = new FileSystemService(mediaDir);
        fs.writeFileSync(path.join(mediaDir, 'test.mkv'), Buffer.alloc(1024 * 1024, 1));

        const [res1, res2, res3] = await Promise.all([
          testFs.getStorageFootprintBytes(),
          testFs.getStorageFootprintBytes(),
          testFs.getStorageFootprintBytes(),
        ]);

        expect(res1).toBeGreaterThan(0);
        expect(res1).toBe(res2);
        expect(res2).toBe(res3);
      } finally {
        process.env.STAGING_PATH = prevStaging;
      }
    });
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
  let broadcastMsgs: any[];

  beforeEach(() => {
    broadcastMsgs = [];
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
      broadcast: (msg) => broadcastMsgs.push(msg),
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

  it('triggers openSubtitles.fetchBest on download completion', async () => {
    const fetchBestMock = vi.fn().mockResolvedValue(true);
    const mockOpenSubtitles = {
      isConfigured: () => true,
      fetchBest: fetchBestMock,
    } as any;

    const pollerWithSubs = new DownloadPoller({
      db: dbInstance.db,
      qbittorrent: mockQb,
      fileSystem: fsService,
      jellyfin: mockJf,
      openSubtitles: mockOpenSubtitles,
      stagingPath: stagingDir,
    });

    const downloadedFileName = 'Matrix.1999.mkv';
    const stagingFilePath = path.join(stagingDir, downloadedFileName);
    fs.writeFileSync(stagingFilePath, 'matrix content');

    const hash = 'matrix_123';
    mockQb.torrents.set(hash, {
      hash,
      name: downloadedFileName,
      progress: 1.0,
      dlspeed: 0,
      eta: 0,
      state: 'uploading',
      size: 600000,
    });

    dbInstance.db
      .insert(downloadRequests)
      .values({
        id: 'req_matrix',
        userId: 'usr_1',
        magnetLink: 'magnet:?xt=urn:btih:matrix_123',
        mediaType: 'movie',
        status: 'downloading',
        metadataId: '603',
        metadataSource: 'tmdb',
        title: 'The Matrix',
        year: 1999,
        qbTorrentHash: hash,
        requestedAt: new Date().toISOString(),
      })
      .run();

    await pollerWithSubs.pollOnce();

    expect(fetchBestMock).toHaveBeenCalledTimes(1);
    const [params, dest] = fetchBestMock.mock.calls[0];
    expect(params.title).toBe('The Matrix');
    expect(dest).toContain('.pt-BR.srt');
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

  it('does not promote queued requests when quota headroom is zero or negative', async () => {
    // Footprint is 130 GB -> availableHeadroom <= 0 (cap is 85% of 150GB = 127.5GB)
    vi.spyOn(fsService, 'getStorageFootprintBytes').mockResolvedValue(130 * 1024 * 1024 * 1024);

    dbInstance.db.insert(downloadRequests).values({
      id: 'q_over_quota',
      userId: 'usr_1',
      magnetLink: 'magnet:?xt=urn:btih:over_quota',
      mediaType: 'movie',
      status: 'queued',
      metadataId: '101',
      metadataSource: 'tmdb',
      title: 'Over Quota Movie',
      requestedAt: '2026-09-01T10:00:00.000Z',
    }).run();

    await poller.pollOnce();

    const req = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'q_over_quota')).get();
    expect(req?.status).toBe('queued');
    expect(req?.deferredReason).toBe('waiting_for_space');
    expect(req?.qbTorrentHash).toBeNull();
  });

  it('implements greedy best-fit FIFO: skips large queued item that exceeds headroom and promotes subsequent smaller item', async () => {
    // 150 GB * 0.85 = 127.5 GB cap.
    // Set footprint to cap - 5 GB, so availableHeadroom = 5 GB
    const quotaCapBytes = Math.floor(150 * 1024 * 1024 * 1024 * 0.85);
    vi.spyOn(fsService, 'getStorageFootprintBytes').mockResolvedValue(quotaCapBytes - 5 * 1024 * 1024 * 1024);

    // Oldest item is 10 GB (too big for 5 GB headroom)
    // Newer item is 2 GB (fits within 5 GB headroom)
    dbInstance.db.insert(downloadRequests).values([
      {
        id: 'q_large',
        userId: 'usr_1',
        magnetLink: 'magnet:?xt=urn:btih:large_item',
        mediaType: 'movie',
        status: 'queued',
        metadataId: '201',
        metadataSource: 'tmdb',
        title: 'Large 4K Movie',
        sizeBytes: 10 * 1024 * 1024 * 1024,
        requestedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'q_small',
        userId: 'usr_1',
        magnetLink: 'magnet:?xt=urn:btih:small_item',
        mediaType: 'movie',
        status: 'queued',
        metadataId: '202',
        metadataSource: 'tmdb',
        title: 'Small 1080p Movie',
        sizeBytes: 2 * 1024 * 1024 * 1024,
        requestedAt: '2026-09-01T11:00:00.000Z',
      },
    ]).run();

    await poller.pollOnce();

    const qLarge = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'q_large')).get();
    const qSmall = dbInstance.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'q_small')).get();

    // qLarge remains queued with waiting_for_space
    expect(qLarge?.status).toBe('queued');
    expect(qLarge?.deferredReason).toBe('waiting_for_space');
    expect(qLarge?.qbTorrentHash).toBeNull();

    // qSmall is promoted to downloading, deferredReason cleared
    expect(qSmall?.status).toBe('downloading');
    expect(qSmall?.deferredReason).toBeNull();
    expect(qSmall?.qbTorrentHash).toBeDefined();

    // WebSocket broadcast sent for promoted request
    const smallBroadcast = broadcastMsgs.find(msg => msg.requestId === 'q_small');
    expect(smallBroadcast).toBeDefined();
    expect(smallBroadcast).toEqual({
      type: 'status',
      requestId: 'q_small',
      status: 'downloading',
    });
  });

  it('locates established series directory across anime/shows and reuses directory and filename prefix (#106)', async () => {
    // 1. Establish existing episode in DB under anime
    const establishedDir = path.join(
      mediaDir,
      'anime',
      'Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru (2026)',
      'Season 01'
    );
    fs.mkdirSync(establishedDir, { recursive: true });
    const existingEpPath = path.join(
      establishedDir,
      'Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru S01E11.mkv'
    );
    fs.writeFileSync(existingEpPath, 'existing episode content');

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_ep11',
      userId: 'usr_1',
      magnetLink: 'magnet:?xt=urn:btih:hash_ep11',
      mediaType: 'anime',
      status: 'completed',
      metadataId: '270603',
      metadataSource: 'tmdb',
      title: 'Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru',
      year: 2026,
      seasonNumber: 1,
      episodeNumber: 11,
      jellyfinPath: existingEpPath,
      requestedAt: '2026-09-01T10:00:00.000Z',
    }).run();

    // 2. Add incoming request with different title and mediaType: 'tv_show'
    const downloadedFileName = 'Heavy.Knight.S01E12.mkv';
    const stagingFilePath = path.join(stagingDir, downloadedFileName);
    fs.writeFileSync(stagingFilePath, 'episode 12 content');

    const hash = 'hk_hash_12';
    mockQb.torrents.set(hash, {
      hash,
      name: downloadedFileName,
      progress: 1.0,
      dlspeed: 0,
      eta: 0,
      state: 'uploading',
      size: 500000,
    });

    dbInstance.db.insert(downloadRequests).values({
      id: 'req_ep12',
      userId: 'usr_1',
      magnetLink: 'magnet:?xt=urn:btih:hash_ep12',
      mediaType: 'tv_show',
      status: 'downloading',
      qbTorrentHash: hash,
      metadataId: '270603',
      metadataSource: 'tmdb',
      title: 'The Exiled Heavy Knight Knows How to Game the System',
      year: 2026,
      seasonNumber: 1,
      episodeNumber: 12,
      requestedAt: '2026-09-01T12:00:00.000Z',
    }).run();

    await poller.pollOnce();

    const updatedReq = dbInstance.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, 'req_ep12'))
      .get();

    expect(updatedReq?.status).toBe('seeding');
    expect(updatedReq?.mediaType).toBe('anime');
    expect(updatedReq?.title).toBe('Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru');

    const expectedDest = path.join(
      establishedDir,
      'Tsuihou sareta Tensei Juukishi wa Game Chishiki de Musou suru S01E12.mkv'
    );
    expect(updatedReq?.jellyfinPath).toBe(expectedDest);
    expect(fs.existsSync(expectedDest)).toBe(true);
  });
});