import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { initDatabase, downloadRequests, users, AppDatabase } from '../src/db';
import { runCorruptedArchiveRecovery, runCompressedDownloadsRecovery } from '../src/services/unarchiveRecovery';
import { UnarchiveService } from '../src/services/unarchive';
import { FileSystemService } from '../src/services/fileSystem';
import { IJellyfinService } from '../src/services/jellyfin';
import { RequestStateMachine, RequestStatus } from '../src/services/requestStateMachine';
import { RequestsRepository } from '../src/services/requestsRepository';

import { MockJellyfin } from './fixtures/mockJellyfin';

describe('Corrupted Archive Recovery (#123)', () => {
  let tempDir: string;
  let stagingDir: string;
  let mediaDir: string;
  let db: AppDatabase;
  let sqlite: any;
  let jellyfin: MockJellyfin;
  let fileSystem: FileSystemService;
  let unarchiveService: UnarchiveService;
  let stateMachine: RequestStateMachine;
  let requestsRepo: RequestsRepository;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unarchive-recovery-test-'));
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

    unarchiveService = new UnarchiveService({
      execCommand: async (cmd, args) => {
        const dest = args[args.length - 1];
        if (dest && fs.existsSync(path.dirname(dest))) {
          fs.mkdirSync(dest, { recursive: true });
          const archivePath = args[args.length - 2];
          const releaseMatch = archivePath.match(/rel-\d+/);
          const name = releaseMatch ? `${releaseMatch[0]}.mp4` : 'feature.mp4';
          fs.writeFileSync(path.join(dest, name), Buffer.alloc(1024 * 1024 * 55)); // 55MB
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

  it('recovers corrupted archive downloads via RequestStateMachine without hardcoded incident logic', async () => {
    const releases = ['rel-4050', 'rel-3946'];

    for (const rel of releases) {
      const relStaging = path.join(stagingDir, rel);
      fs.mkdirSync(relStaging, { recursive: true });
      fs.writeFileSync(path.join(relStaging, `${rel}.rar`), `staging rar content for ${rel}`);

      db.insert(downloadRequests).values({
        id: `req_${rel}`,
        userId: 'admin_user',
        title: rel,
        mediaType: 'private',
        status: 'downloading',
        jellyfinPath: path.join(mediaDir, `${rel}.rar`),
        magnetLink: `magnet:?xt=urn:btih:hash_${rel}&dn=${rel}`,
        metadataId: `meta_${rel}`,
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      }).run();
    }

    const transitionSpy = vi.spyOn(stateMachine, 'transition');

    const result = await runCorruptedArchiveRecovery({
      db,
      unarchiveService,
      fileSystem,
      jellyfin,
      stateMachine,
      stagingPath: stagingDir,
      mediaPath: mediaDir,
    });

    expect(result.recoveredCount).toBe(2);
    expect(transitionSpy).toHaveBeenCalledTimes(4);
    expect(transitionSpy).toHaveBeenCalledWith('req_rel-4050', RequestStatus.UNARCHIVING, expect.any(Object));
    expect(transitionSpy).toHaveBeenCalledWith('req_rel-4050', RequestStatus.SEEDING, expect.any(Object));
    expect(transitionSpy).toHaveBeenCalledWith('req_rel-3946', RequestStatus.UNARCHIVING, expect.any(Object));
    expect(transitionSpy).toHaveBeenCalledWith('req_rel-3946', RequestStatus.SEEDING, expect.any(Object));

    for (const rel of releases) {
      const expectedPath = path.join(mediaDir, 'private', rel, `${rel}.mp4`);
      expect(fs.existsSync(expectedPath)).toBe(true);

      const req = db.select().from(downloadRequests).where(eq(downloadRequests.id, `req_${rel}`)).get();
      expect(req?.jellyfinPath).toBe(expectedPath);
      expect(req?.status).toBe('seeding');
    }

    expect(jellyfin.refreshCalled).toBe(1);
  });

  it('verifies that no xb-specific incident clauses exist in unarchiveRecovery source', () => {
    const sourcePath = path.resolve(__dirname, '../src/services/unarchiveRecovery.ts');
    const sourceCode = fs.readFileSync(sourcePath, 'utf-8');

    expect(sourceCode).not.toContain('xb (2026)');
    expect(sourceCode).not.toContain("title, 'xb'");
    expect(sourceCode).not.toContain('possibleInvalidDirs');
    expect(sourceCode).not.toContain('UnarchiveService.prototype');
  });

  it('preserves backward compatible alias runCompressedDownloadsRecovery', () => {
    expect(runCompressedDownloadsRecovery).toBe(runCorruptedArchiveRecovery);
  });
});
