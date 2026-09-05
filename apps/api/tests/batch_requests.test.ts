import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IMetadataService } from '../src/services/metadata';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { FileSystemService } from '../src/services/fileSystem';
import { downloadRequests, systemConfig } from '../src/db/schema';
import { parseTorrentBuffer } from '../src/services/torrentParser';

function createDummyTorrentBuffer(name: string, length = 123456): { buffer: Buffer; infoHash: string } {
  const infoDict = `d6:lengthi${length}e4:name${name.length}:${name}e`;
  const fullTorrent = `d4:info${infoDict}e`;
  const infoHash = crypto.createHash('sha1').update(Buffer.from(infoDict)).digest('hex').toLowerCase();
  return { buffer: Buffer.from(fullTorrent), infoHash };
}

class MockJellyfin implements IJellyfinService {
  async authenticateUser(username: string) {
    return { accessToken: 'tk', userId: `uid_${username}`, username, isAdmin: false };
  }
  async createUser() { return 'new_id'; }
  async deleteUser() {}
}

class MockQBittorrent implements IQBittorrentService {
  public activeCount = 0;
  public addedTorrents: { magnetLink: string; savePath?: string }[] = [];
  public addedTorrentFiles: { buffer: Buffer | Uint8Array; savePath?: string; fileName?: string }[] = [];

  async addTorrent(magnetLink: string, savePath?: string) {
    this.addedTorrents.push({ magnetLink, savePath });
    return 'mock_hash_magnet';
  }

  async addTorrentFile(fileBuffer: Buffer | Uint8Array, savePath?: string, fileName?: string) {
    this.addedTorrentFiles.push({ buffer: fileBuffer, savePath, fileName });
    const { infoHash } = parseTorrentBuffer(fileBuffer);
    return infoHash;
  }

  async getActiveTorrentCount() {
    return this.activeCount;
  }

  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    return null;
  }

  async removeTorrent() {}
}

class MockMetadata implements IMetadataService {
  async searchTMDB(query: string, mediaType: string) {
    return [
      { id: 'tmdb_1', source: 'tmdb' as const, title: query, year: 2024, posterUrl: null, overview: 'Overview' },
    ];
  }
  async searchAniList(query: string) {
    return [
      { id: 'anilist_1', source: 'anilist' as const, title: query, year: 2024, posterUrl: null, overview: 'Overview' },
    ];
  }
  extractTitleFromMagnet(magnet: string) {
    return 'Extracted Title';
  }
}

class MockCleanup implements ICleanupService {
  public safe = true;
  public percentFree = 50;

  isHostDiskSafe(): boolean {
    return this.safe;
  }
  isSpaceSufficient(): SpaceCheckResult {
    return { sufficient: this.safe, percentFree: this.percentFree, threshold: 15 };
  }
  async runAutoCleanup() { return { cleanedCount: 0, bytesFreed: 0 }; }
  async scheduleCleanupWarning() {}
}

describe('Batch Requests & Directory Structure API (#8)', () => {
  let app: FastifyInstance;
  let qb: MockQBittorrent;
  let cleanup: MockCleanup;
  let userToken: string;

  beforeEach(async () => {
    qb = new MockQBittorrent();
    cleanup = new MockCleanup();

    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jellyfinService: new MockJellyfin(),
      metadataService: new MockMetadata(),
      qbittorrentService: qb,
      cleanupService: cleanup,
    });

    await app.ready();

    // Login user
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });

    const cookieHeader = loginRes.headers['set-cookie'] as string;
    const match = cookieHeader?.match(/token=([^;]+)/);
    userToken = match ? match[1] : '';
  });

  afterEach(async () => {
    await app.close();
  });

  describe('buildLibraryPath directory hierarchy', () => {
    const fsService = new FileSystemService('/test_media');

    it('formats anime with year into Season folder and SXXEXX naming', () => {
      const p = fsService.buildLibraryPath({
        mediaType: 'anime',
        title: 'Frieren Beyond Journeys End',
        year: 2023,
        seasonNumber: 1,
        episodeNumber: 12,
        mediaBasePath: '/media',
      });

      expect(p.replace(/\\/g, '/')).toBe(
        '/media/anime/Frieren Beyond Journeys End (2023)/Season 01/Frieren Beyond Journeys End S01E12.mkv'
      );
    });

    it('formats TV shows with year into Season folder and SXXEXX naming', () => {
      const p = fsService.buildLibraryPath({
        mediaType: 'tv_show',
        title: 'House of the Dragon',
        year: 2022,
        seasonNumber: 2,
        episodeNumber: 4,
        ext: 'mp4',
        mediaBasePath: '/media',
      });

      expect(p.replace(/\\/g, '/')).toBe(
        '/media/shows/House of the Dragon (2022)/Season 02/House of the Dragon S02E04.mp4'
      );
    });
  });

  describe('POST /requests/batch', () => {
    it('creates batch download requests with episodeNumber and seasonNumber', async () => {
      const { buffer: buf1 } = createDummyTorrentBuffer('Show - 01.mkv', 1000);
      const { buffer: buf2 } = createDummyTorrentBuffer('Show - 02.mkv', 2000);

      // Concurrent limit is 2 by default; activeCount is 0, so both should start downloading
      const res = await app.inject({
        method: 'POST',
        url: '/requests/batch',
        cookies: { token: userToken },
        payload: {
          mediaType: 'anime',
          metadataId: 'anilist_123',
          metadataSource: 'anilist',
          title: 'Solo Leveling',
          year: 2024,
          seasonNumber: 1,
          items: [
            {
              torrentFileBase64: buf1.toString('base64'),
              torrentFileName: 'Solo Leveling - 01.torrent',
              episodeNumber: 1,
            },
            {
              torrentFileBase64: buf2.toString('base64'),
              torrentFileName: 'Solo Leveling - 02.torrent',
              episodeNumber: 2,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.count).toBe(2);
      expect(json.requests).toHaveLength(2);

      expect(json.requests[0].title).toBe('Solo Leveling');
      expect(json.requests[0].seasonNumber).toBe(1);
      expect(json.requests[0].episodeNumber).toBe(1);
      expect(json.requests[0].status).toBe('downloading');

      expect(json.requests[1].title).toBe('Solo Leveling');
      expect(json.requests[1].seasonNumber).toBe(1);
      expect(json.requests[1].episodeNumber).toBe(2);
      expect(json.requests[1].status).toBe('downloading');

      // Verify records in DB
      const inDb = app.db.select().from(downloadRequests).all();
      expect(inDb).toHaveLength(2);
      expect(inDb[0].episodeNumber).toBe(1);
      expect(inDb[1].episodeNumber).toBe(2);
    });

    it('works identically via /api/requests/batch endpoint prefix', async () => {
      const { buffer } = createDummyTorrentBuffer('Show - 01.mkv', 1000);

      const res = await app.inject({
        method: 'POST',
        url: '/api/requests/batch',
        cookies: { token: userToken },
        payload: {
          mediaType: 'anime',
          metadataId: 'anilist_123',
          metadataSource: 'anilist',
          title: 'DanDaDan',
          year: 2024,
          items: [
            {
              torrentFileBase64: buffer.toString('base64'),
              torrentFileName: 'DanDaDan - 01.torrent',
              seasonNumber: 1,
              episodeNumber: 1,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.count).toBe(1);
      expect(json.requests[0].episodeNumber).toBe(1);
    });

    it('allocates download slots up to concurrent limit and defers rest to queued (waiting_for_slot)', async () => {
      // Set concurrent limit to 2
      app.db
        .insert(systemConfig)
        .values({ key: 'concurrent_limit', value: '2' })
        .onConflictDoUpdate({ target: systemConfig.key, set: { value: '2' } })
        .run();

      const { buffer: b1 } = createDummyTorrentBuffer('Ep1.mkv');
      const { buffer: b2 } = createDummyTorrentBuffer('Ep2.mkv');
      const { buffer: b3 } = createDummyTorrentBuffer('Ep3.mkv');

      const res = await app.inject({
        method: 'POST',
        url: '/requests/batch',
        cookies: { token: userToken },
        payload: {
          mediaType: 'tv_show',
          metadataId: 'tmdb_99',
          metadataSource: 'tmdb',
          title: 'Severance',
          year: 2022,
          seasonNumber: 1,
          items: [
            { torrentFileBase64: b1.toString('base64'), episodeNumber: 1 },
            { torrentFileBase64: b2.toString('base64'), episodeNumber: 2 },
            { torrentFileBase64: b3.toString('base64'), episodeNumber: 3 },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.count).toBe(3);

      expect(json.requests[0].status).toBe('downloading');
      expect(json.requests[1].status).toBe('downloading');
      expect(json.requests[2].status).toBe('queued');
      expect(json.requests[2].deferredReason).toBe('waiting_for_slot');
    });

    it('defers all batch items into queued (waiting_for_space) when storage quota is exceeded', async () => {
      // Mock storage quota exceeded: 100 GB quota, 90 GB footprint (90% >= 85%)
      app.db
        .insert(systemConfig)
        .values({ key: 'storage_quota_gb', value: '100' })
        .onConflictDoUpdate({ target: systemConfig.key, set: { value: '100' } })
        .run();

      // Override getStorageFootprintBytes
      app.fileSystem.getStorageFootprintBytes = () => 90 * 1024 * 1024 * 1024;

      const { buffer } = createDummyTorrentBuffer('Frieren - 01.mkv');

      const res = await app.inject({
        method: 'POST',
        url: '/requests/batch',
        cookies: { token: userToken },
        payload: {
          mediaType: 'anime',
          metadataId: 'ani_1',
          metadataSource: 'anilist',
          title: 'Frieren',
          items: [
            { torrentFileBase64: buffer.toString('base64'), episodeNumber: 1 },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.requests[0].status).toBe('queued');
      expect(json.requests[0].deferredReason).toBe('waiting_for_space');
    });

    it('rejects with 422 Unprocessable Entity when host disk is not safe', async () => {
      cleanup.safe = false;

      const { buffer } = createDummyTorrentBuffer('Test.mkv');

      const res = await app.inject({
        method: 'POST',
        url: '/requests/batch',
        cookies: { token: userToken },
        payload: {
          mediaType: 'movie',
          metadataId: 'tmdb_1',
          metadataSource: 'tmdb',
          title: 'Inception',
          items: [
            { torrentFileBase64: buffer.toString('base64') },
          ],
        },
      });

      expect(res.statusCode).toBe(422);
      const json = JSON.parse(res.body);
      expect(json.error).toBe('Unprocessable Entity');
    });
  });
});
