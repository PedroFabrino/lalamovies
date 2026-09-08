import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QBittorrentService } from '../src/services/qbittorrent';
import { DownloadPoller } from '../src/jobs/downloadPoller';
import { FileSystemService } from '../src/services/fileSystem';
import { IJellyfinService } from '../src/services/jellyfin';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { downloadRequests, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('QBittorrentService - URL download and Hash Resolution', () => {
  it('extracts real infoHash when adding Prowlarr HTTP download URL that redirects to magnet', async () => {
    const service = new QBittorrentService('http://localhost:8080', 'admin', 'adminadmin');

    const prowlarrUrl = 'http://prowlarr:9696/1/download?apikey=test&file=The+Invite+(2026)';
    const expectedHash = 'd9dd9229743fa0c325dd7a86bf6f8d11473031a7';
    const redirectMagnet = `magnet:?xt=urn:btih:${expectedHash}&dn=The+Invite+(2026)`;

    // Mock global fetch for redirect
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('prowlarr:9696')) {
        return new Response(null, {
          status: 301,
          headers: { location: redirectMagnet },
        });
      }
      if (typeof url === 'string' && url.includes('/api/v2/auth/login')) {
        return new Response('', { status: 200, headers: { 'set-cookie': 'SID=mock-sid;' } });
      }
      if (typeof url === 'string' && url.includes('/api/v2/torrents/add')) {
        return new Response('Ok.');
      }
      return new Response('Not found', { status: 404 });
    });

    try {
      const hash = await service.addTorrent(prowlarrUrl);
      expect(hash).toBe(expectedHash);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('converts base32 magnet link to 40-char hex hash', async () => {
    const service = new QBittorrentService('http://localhost:8080', 'admin', 'adminadmin');

    // 32-char Base32 representation of hash
    // Example: BTIH base32 32 chars
    const magnet = 'magnet:?xt=urn:btih:3G27EJLUI6QKXJON5KF3634RWNPL6MMX';
    vi.spyOn(service as any, 'fetchWithAuth').mockResolvedValue(new Response('Ok.'));

    const hash = await service.addTorrent(magnet);
    expect(hash).toHaveLength(40);
    expect(hash).toMatch(/^[a-f0-9]{40}$/);
  });
});

describe('DownloadPoller - Orphan Torrent Self-Healing', () => {
  let tmpDir: string;
  let stagingDir: string;
  let mediaDir: string;
  let sqliteDb: any;
  let db: any;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'poller-heal-test-'));
    stagingDir = path.join(tmpDir, 'staging');
    mediaDir = path.join(tmpDir, 'media');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    sqliteDb = new Database(':memory:');
    sqliteDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        jellyfin_user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
      );
      CREATE TABLE download_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        magnet_link TEXT NOT NULL,
        media_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        metadata_id TEXT NOT NULL,
        metadata_source TEXT NOT NULL,
        title TEXT NOT NULL,
        year INTEGER,
        season_number INTEGER,
        episode_number INTEGER,
        jellyfin_path TEXT,
        keep_flag INTEGER NOT NULL DEFAULT 0,
        qb_torrent_hash TEXT,
        error_message TEXT,
        requested_at TEXT NOT NULL,
        downloaded_at TEXT,
        last_played_at TEXT,
        scheduled_delete_at TEXT,
        size_bytes INTEGER,
        torrent_file_path TEXT,
        deferred_reason TEXT
      );
    `);
    db = drizzle(sqliteDb);

    db.insert(users).values({
      id: 'u1',
      jellyfinUserId: 'j1',
      username: 'tester',
      createdAt: new Date().toISOString(),
    }).run();
  });

  it('self-heals download request missing qbTorrentHash by matching qBittorrent torrents', async () => {
    const fsService = new FileSystemService(mediaDir);
    const mockJellyfin: IJellyfinService = {
      authenticateUser: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      refreshLibrary: vi.fn(),
    };

    const targetHash = 'd9dd9229743fa0c325dd7a86bf6f8d11473031a7';
    const sampleFileName = 'The.Invite.2026.1080p.WEBRip.mkv';
    fs.writeFileSync(path.join(stagingDir, sampleFileName), 'video data');

    const mockQBittorrent = {
      addTorrent: vi.fn(),
      addTorrentFile: vi.fn(),
      getActiveTorrentCount: vi.fn().mockResolvedValue(0),
      getTorrentStatus: vi.fn().mockImplementation(async (hash: string) => {
        if (hash === targetHash) {
          return {
            hash: targetHash,
            name: sampleFileName,
            progress: 1.0,
            dlspeed: 0,
            eta: 0,
            state: 'completed',
            size: 1000,
          };
        }
        return null;
      }),
      getAllTorrents: vi.fn().mockResolvedValue([
        {
          hash: targetHash,
          name: sampleFileName,
          progress: 1.0,
          dlspeed: 0,
          eta: 0,
          state: 'completed',
          size: 1000,
        },
      ]),
      removeTorrent: vi.fn(),
    };

    // Insert request with missing qbTorrentHash (empty string)
    db.insert(downloadRequests).values({
      id: 'req-invite-1',
      userId: 'u1',
      magnetLink: 'http://prowlarr:9696/1/download?...',
      mediaType: 'movie',
      status: 'downloading',
      metadataId: '950028',
      metadataSource: 'tmdb',
      title: 'The Invite',
      year: 2026,
      qbTorrentHash: '', // EMPTY
      requestedAt: new Date().toISOString(),
    }).run();

    const poller = new DownloadPoller({
      db,
      qbittorrent: mockQBittorrent as any,
      fileSystem: fsService,
      jellyfin: mockJellyfin,
      stagingPath: stagingDir,
    });

    await poller.pollOnce();

    // Verify DB was self-healed and transitioned to seeding
    const updated = db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req-invite-1')).get();
    expect(updated.qbTorrentHash).toBe(targetHash);
    expect(updated.status).toBe('seeding');
    expect(updated.jellyfinPath).toContain('The Invite (2026)');
    expect(mockJellyfin.refreshLibrary).toHaveBeenCalled();
  });
});
