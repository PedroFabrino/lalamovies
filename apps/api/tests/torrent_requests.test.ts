import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IMetadataService } from '../src/services/metadata';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { ICleanupService, SpaceCheckResult } from '../src/services/cleanup';
import { downloadRequests, systemConfig, users } from '../src/db/schema';
import { parseTorrentBuffer } from '../src/services/torrentParser';
import { DownloadPoller } from '../src/jobs/downloadPoller';
import { FileSystemService } from '../src/services/fileSystem';

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
  isSpaceSufficient(): SpaceCheckResult {
    return { sufficient: true, percentFree: 50, threshold: 15 };
  }
  async runAutoCleanup() { return { cleanedCount: 0, bytesFreed: 0 }; }
  async scheduleCleanupWarning() {}
}

describe('Torrent File Support', () => {
  let app: FastifyInstance;
  let qb: MockQBittorrent;
  let userToken: string;

  beforeEach(async () => {
    qb = new MockQBittorrent();
    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jellyfinService: new MockJellyfin(),
      metadataService: new MockMetadata(),
      qbittorrentService: qb,
      cleanupService: new MockCleanup(),
    });

    await app.ready();

    // Create and login user
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });

    const cookieHeader = loginRes.headers['set-cookie'] as string;
    const match = cookieHeader.match(/token=([^;]+)/);
    userToken = match ? match[1] : '';
  });

  afterEach(async () => {
    await app.close();
  });

  it('correctly parses bencoded torrent file and calculates sha1 info-hash', () => {
    const { buffer, infoHash } = createDummyTorrentBuffer('Inception.2010.1080p.mkv', 2500000);
    const parsed = parseTorrentBuffer(buffer);

    expect(parsed.name).toBe('Inception.2010.1080p.mkv');
    expect(parsed.infoHash).toBe(infoHash);
    expect(parsed.totalSize).toBe(2500000);
    expect(parsed.magnetUri).toContain(`xt=urn:btih:${infoHash}`);
    expect(parsed.magnetUri).toContain('Inception.2010.1080p.mkv');
  });

  it('search-metadata extracts title from torrentFileBase64', async () => {
    const { buffer } = createDummyTorrentBuffer('Dune.Part.Two.2024.2160p', 5000000);
    const base64 = buffer.toString('base64');

    const res = await app.inject({
      method: 'POST',
      url: '/requests/search-metadata',
      cookies: { token: userToken },
      payload: {
        torrentFileBase64: base64,
        mediaType: 'movie',
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.query).toBe('Dune.Part.Two.2024.2160p');
    expect(json.candidates.length).toBeGreaterThan(0);
    expect(json.candidates[0].title).toBe('Dune.Part.Two.2024.2160p');
  });

  it('creates request and transmits torrent file directly to qBittorrent when slots available', async () => {
    const { buffer, infoHash } = createDummyTorrentBuffer('Oppenheimer.2023.1080p');
    const base64 = buffer.toString('base64');

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userToken },
      payload: {
        torrentFileBase64: base64,
        torrentFileName: 'Oppenheimer.torrent',
        mediaType: 'movie',
        metadataId: 'tmdb_1',
        metadataSource: 'tmdb',
        title: 'Oppenheimer',
        year: 2023,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.request.status).toBe('downloading');
    expect(body.request.qbTorrentHash).toBe(infoHash);
    expect(body.request.magnetLink).toContain(`xt=urn:btih:${infoHash}`);
    expect(body.request.torrentFilePath).toBeNull();

    expect(qb.addedTorrentFiles.length).toBe(1);
    expect(qb.addedTorrentFiles[0].fileName).toBe('Oppenheimer.torrent');
  });

  it('queues request and saves torrent file to disk when concurrent slots are full', async () => {
    // Set limit to 1 and active to 1
    app.db.insert(systemConfig).values({ key: 'concurrent_limit', value: '1' }).onConflictDoUpdate({
      target: systemConfig.key,
      set: { value: '1' },
    }).run();
    qb.activeCount = 1;

    const { buffer, infoHash } = createDummyTorrentBuffer('Spider.Man.2002');
    const base64 = buffer.toString('base64');

    const res = await app.inject({
      method: 'POST',
      url: '/requests',
      cookies: { token: userToken },
      payload: {
        torrentFileBase64: base64,
        torrentFileName: 'spiderman.torrent',
        mediaType: 'movie',
        metadataId: 'tmdb_1',
        metadataSource: 'tmdb',
        title: 'Spider-Man',
        year: 2002,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.request.status).toBe('queued');
    expect(body.request.qbTorrentHash).toBeNull();
    expect(body.request.torrentFilePath).toBeTruthy();

    const savedPath = body.request.torrentFilePath;
    expect(fs.existsSync(savedPath)).toBe(true);

    // Clean up test file
    try {
      fs.unlinkSync(savedPath);
    } catch {}
  });

  it('DownloadPoller promotes queued torrent request and unlinks file on disk', async () => {
    const { buffer, infoHash } = createDummyTorrentBuffer('Gladiator.II.2024');
    const tmpDir = path.resolve(process.cwd(), 'temp_test_torrents');
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, 'test_promo.torrent');
    fs.writeFileSync(tmpFile, buffer);

    // Insert queued request with torrentFilePath
    const [user] = app.db.select().from(users).all();
    const reqId = 'promo_req_1';
    app.db.insert(downloadRequests).values({
      id: reqId,
      userId: user.id,
      magnetLink: `magnet:?xt=urn:btih:${infoHash}&dn=Gladiator`,
      mediaType: 'movie',
      status: 'queued',
      metadataId: 'tmdb_1',
      metadataSource: 'tmdb',
      title: 'Gladiator II',
      year: 2024,
      requestedAt: new Date().toISOString(),
      torrentFilePath: tmpFile,
    }).run();

    const poller = new DownloadPoller({
      db: app.db,
      qbittorrent: qb,
      fileSystem: new FileSystemService(),
      jellyfin: new MockJellyfin(),
      stagingPath: '/tmp/staging',
    });

    // Run poll
    qb.activeCount = 0; // free slot
    await poller.pollOnce();

    const updated = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, reqId)).get();
    expect(updated?.status).toBe('downloading');
    expect(updated?.qbTorrentHash).toBe(infoHash);
    expect(updated?.torrentFilePath).toBeNull();

    // File should have been deleted
    expect(fs.existsSync(tmpFile)).toBe(false);

    try {
      fs.rmdirSync(tmpDir);
    } catch {}
  });
});
