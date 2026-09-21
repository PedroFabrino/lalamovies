import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { initDatabase, downloadRequests, users, AppDatabase } from '../src/db';
import { DownloadPoller } from '../src/jobs/downloadPoller';
import { UnarchiveDaemon } from '../src/jobs/unarchiveDaemon';
import { UnarchiveService } from '../src/services/unarchive';
import { FileSystemService } from '../src/services/fileSystem';
import { IQBittorrentService, TorrentInfo } from '../src/services/qbittorrent';
import { IJellyfinService } from '../src/services/jellyfin';
import { INotificationService } from '../src/services/notifications';

import { MockQBittorrent as MockQBService } from './fixtures/mockQBittorrent';
import { MockJellyfin } from './fixtures/mockJellyfin';

class MockNotificationService implements INotificationService {
  public sentEvents: Array<{ event: string; payload: any }> = [];
  async send(event: string, payload: any) {
    this.sentEvents.push({ event, payload });
  }
}

describe('Poller Handoff & Background Unarchive Processing Daemon (#112)', () => {
  let tempDir: string;
  let stagingDir: string;
  let mediaDir: string;
  let db: AppDatabase;
  let sqlite: any;
  let qb: MockQBService;
  let jellyfin: MockJellyfin;
  let notifications: MockNotificationService;
  let fileSystem: FileSystemService;
  let unarchiveService: UnarchiveService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unarchive-daemon-test-'));
    stagingDir = path.join(tempDir, 'staging');
    mediaDir = path.join(tempDir, 'media');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    const dbInit = initDatabase(':memory:', true);
    db = dbInit.db;
    sqlite = dbInit.sqlite;

    // Insert test admin user
    db.insert(users).values({
      id: 'admin_user',
      username: 'admin',
      passwordHash: 'hash',
      role: 'admin',
      email: 'admin@example.com',
      jellyfinUserId: 'jf_admin',
      createdAt: new Date().toISOString(),
    }).run();

    qb = new MockQBService();
    jellyfin = new MockJellyfin();
    notifications = new MockNotificationService();
    fileSystem = new FileSystemService(mediaDir);

    // Mock unarchive service extraction to simulate extracting video from archive
    unarchiveService = new UnarchiveService({
      execCommand: async (cmd, args) => {
        // Find destination dir in args
        const dest = args[args.length - 1];
        if (dest && fs.existsSync(path.dirname(dest))) {
          fs.mkdirSync(dest, { recursive: true });
          const fakeVideoPath = path.join(dest, 'extracted_feature.mp4');
          fs.writeFileSync(fakeVideoPath, Buffer.alloc(1024 * 1024 * 60)); // 60MB video
          const fakeSubPath = path.join(dest, 'extracted_feature.srt');
          fs.writeFileSync(fakeSubPath, '1\n00:00:01 --> 00:00:02\nHello');
        }
        return { stdout: 'OK', stderr: '', exitCode: 0 };
      },
    });
  });

  afterEach(() => {
    try {
      sqlite.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('detects archive-only completed torrent and transitions status to unarchiving', async () => {
    const poller = new DownloadPoller({
      db,
      qbittorrent: qb,
      fileSystem,
      jellyfin,
      notificationService: notifications,
      unarchiveService,
      stagingPath: stagingDir,
    });

    // Create completed torrent with only archive files
    const hash = 'rar_torrent_hash';
    qb.torrents.set(hash, {
      hash,
      name: 'xb-4050',
      progress: 1,
      dlspeed: 0,
      eta: 0,
      state: 'uploading',
      size: 1160632718,
    });
    qb.torrentFiles.set(hash, [
      { name: 'xb-4050/hhd800.com@xb-4050.rar', size: 1160632718 },
      { name: 'xb-4050/hhd800.com.url', size: 100 },
    ]);

    // Create directory in staging
    const torrentFolder = path.join(stagingDir, 'xb-4050');
    fs.mkdirSync(torrentFolder, { recursive: true });
    fs.writeFileSync(path.join(torrentFolder, 'hhd800.com@xb-4050.rar'), 'fake rar data');

    // Insert downloading request
    const reqId = 'req_rar_1';
    db.insert(downloadRequests).values({
      id: reqId,
      userId: 'admin_user',
      title: 'xb',
      mediaType: 'private',
      status: 'downloading',
      qbTorrentHash: hash,
      magnetLink: 'magnet:?xt=urn:btih:rar_torrent_hash&dn=xb-4050',
      metadataId: 'meta_xb_1',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
    }).run();

    await poller.pollOnce();

    const updated = db.select().from(downloadRequests).where(eq(downloadRequests.id, reqId)).get();
    expect(updated?.status).toBe('unarchiving');

    // Should NOT have hardlinked yet or sent completion notification
    expect(notifications.sentEvents.length).toBe(0);
    expect(jellyfin.refreshCalled).toBe(0);
  });

  it('unarchive daemon extracts archive, resolves path, updates db, keeps staging intact, and refreshes Jellyfin', async () => {
    const daemon = new UnarchiveDaemon({
      db,
      unarchiveService,
      fileSystem,
      jellyfin,
      qbittorrent: qb,
      notificationService: notifications,
      stagingPath: stagingDir,
    });

    const hash = 'xb_hash_4050';
    qb.torrents.set(hash, {
      hash,
      name: 'xb-4050',
      progress: 1,
      dlspeed: 0,
      eta: 0,
      state: 'uploading',
      size: 1160632718,
    });

    // Create staging archive file
    const torrentFolder = path.join(stagingDir, 'xb-4050');
    fs.mkdirSync(torrentFolder, { recursive: true });
    const archivePath = path.join(torrentFolder, 'hhd800.com@xb-4050.rar');
    fs.writeFileSync(archivePath, 'original archive data');

    const reqId = 'req_unarchive_daemon_1';
    db.insert(downloadRequests).values({
      id: reqId,
      userId: 'admin_user',
      title: 'xb',
      mediaType: 'private',
      status: 'unarchiving',
      qbTorrentHash: hash,
      magnetLink: 'magnet:?xt=urn:btih:xb_hash_4050&dn=xb-4050',
      metadataId: 'meta_xb_4050',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
    }).run();

    await daemon.processOnce();

    const updated = db.select().from(downloadRequests).where(eq(downloadRequests.id, reqId)).get();
    expect(updated?.status).toBe('seeding');
    expect(updated?.jellyfinPath).toBeDefined();

    // Verify resolved library path has distinct folder and file
    const resolvedPath = updated!.jellyfinPath!;
    expect(resolvedPath.replace(/\\/g, '/')).toContain('/media/private/xb-4050/xb-4050.mp4');
    expect(fs.existsSync(resolvedPath)).toBe(true);

    // Verify original archive in staging is UNTOUCHED for continuous seeding
    expect(fs.existsSync(archivePath)).toBe(true);
    expect(fs.readFileSync(archivePath, 'utf-8')).toBe('original archive data');

    // Verify Jellyfin refreshed and notification sent
    expect(jellyfin.refreshCalled).toBe(1);
    expect(notifications.sentEvents.length).toBe(1);
    expect(notifications.sentEvents[0].event).toBe('download.completed');
    expect(notifications.sentEvents[0].payload.recipientEmails).toContain('admin@example.com');
  });
});
