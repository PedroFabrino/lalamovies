import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initDatabase, downloadRequests, users, AppDatabase } from '../src/db';
import { runHardlinkingRecovery } from '../src/services/hardlinkRecovery';
import { FileSystemService } from '../src/services/fileSystem';
import { RequestStateMachine, RequestStatus } from '../src/services/requestStateMachine';
import { RequestsRepository } from '../src/services/requestsRepository';
import { MockJellyfin } from './fixtures/mockJellyfin';

describe('Hardlinking Orphan Recovery (#128)', () => {
  let tempDir: string;
  let stagingDir: string;
  let mediaDir: string;
  let db: AppDatabase;
  let sqlite: any;
  let jellyfin: MockJellyfin;
  let fileSystem: FileSystemService;
  let stateMachine: RequestStateMachine;
  let requestsRepo: RequestsRepository;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hardlink-recovery-test-'));
    stagingDir = path.join(tempDir, 'staging');
    mediaDir = path.join(tempDir, 'media');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    const dbInit = initDatabase(':memory:', true);
    db = dbInit.db;
    sqlite = dbInit.sqlite;

    db.insert(users).values({
      id: 'admin_user',
      username: 'admin',
      passwordHash: 'hash',
      role: 'admin',
      email: 'admin@example.com',
      jellyfinUserId: 'jf_admin',
      createdAt: new Date().toISOString(),
    }).run();

    jellyfin = new MockJellyfin();
    fileSystem = new FileSystemService(mediaDir);
    requestsRepo = new RequestsRepository(db);
    stateMachine = new RequestStateMachine(requestsRepo, undefined, jellyfin);
  });

  afterEach(() => {
    try {
      sqlite.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('recovers stuck HARDLINKING request when files exist on disk, transitioning to SEEDING', async () => {
    // Setup staging source file
    const torrentName = 'My.Movie.2023.1080p.mkv';
    const sourceFilePath = path.join(stagingDir, torrentName);
    fs.writeFileSync(sourceFilePath, 'mock movie binary data');

    db.insert(downloadRequests).values({
      id: 'req-stuck-1',
      userId: 'admin_user',
      title: torrentName,
      mediaType: 'movie',
      status: RequestStatus.HARDLINKING,
      magnetLink: 'magnet:?xt=urn:btih:dummy1',
      metadataSource: 'tmdb',
      metadataId: '12345',
      year: 2023,
      requestedAt: new Date().toISOString(),
    }).run();

    const result = await runHardlinkingRecovery({
      db,
      fileSystem,
      requestsRepo,
      stateMachine,
      stagingPath: stagingDir,
    });

    expect(result.checkedCount).toBe(1);
    expect(result.recoveredCount).toBe(1);
    expect(result.failedCount).toBe(0);

    const updated = requestsRepo.findById('req-stuck-1');
    expect(updated?.status).toBe(RequestStatus.SEEDING);
    expect(updated?.jellyfinPath).toBeDefined();
    expect(fs.existsSync(updated!.jellyfinPath!)).toBe(true);
    expect(jellyfin.refreshed).toBe(true);
  });

  it('transitions stuck HARDLINKING request to ERROR when source files are missing', async () => {
    db.insert(downloadRequests).values({
      id: 'req-stuck-missing',
      userId: 'admin_user',
      title: 'Missing.Movie.2023.1080p.mkv',
      mediaType: 'movie',
      status: RequestStatus.HARDLINKING,
      magnetLink: 'magnet:?xt=urn:btih:dummy2',
      metadataSource: 'tmdb',
      metadataId: '67890',
      year: 2023,
      requestedAt: new Date().toISOString(),
    }).run();

    const result = await runHardlinkingRecovery({
      db,
      fileSystem,
      requestsRepo,
      stateMachine,
      stagingPath: stagingDir,
    });

    expect(result.checkedCount).toBe(1);
    expect(result.recoveredCount).toBe(0);
    expect(result.failedCount).toBe(1);

    const updated = requestsRepo.findById('req-stuck-missing');
    expect(updated?.status).toBe(RequestStatus.ERROR);
    expect(updated?.errorMessage).toContain('hardlink recovery failed');
  });

  it('does nothing when no requests are in HARDLINKING status', async () => {
    db.insert(downloadRequests).values({
      id: 'req-downloading',
      userId: 'admin_user',
      title: 'Downloading.Movie.2023.1080p.mkv',
      mediaType: 'movie',
      status: RequestStatus.DOWNLOADING,
      magnetLink: 'magnet:?xt=urn:btih:dummy3',
      metadataSource: 'tmdb',
      metadataId: '99999',
      year: 2023,
      requestedAt: new Date().toISOString(),
    }).run();

    const result = await runHardlinkingRecovery({
      db,
      fileSystem,
      requestsRepo,
      stateMachine,
      stagingPath: stagingDir,
    });

    expect(result.checkedCount).toBe(0);
    expect(result.recoveredCount).toBe(0);
    expect(result.failedCount).toBe(0);

    const untouched = requestsRepo.findById('req-downloading');
    expect(untouched?.status).toBe(RequestStatus.DOWNLOADING);
  });
});
