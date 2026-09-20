import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { initDatabase, downloadRequests, users, AppDatabase } from '../src/db';
import { runCompressedDownloadsRecovery } from '../src/services/unarchiveRecovery';
import { UnarchiveService } from '../src/services/unarchive';
import { FileSystemService } from '../src/services/fileSystem';
import { IJellyfinService } from '../src/services/jellyfin';

class MockJellyfin implements IJellyfinService {
  public refreshCalled = 0;
  async refreshLibrary() { this.refreshCalled++; }
}

describe('Existing Compressed Downloads Recovery (#113)', () => {
  let tempDir: string;
  let stagingDir: string;
  let mediaDir: string;
  let db: AppDatabase;
  let sqlite: any;
  let jellyfin: MockJellyfin;
  let fileSystem: FileSystemService;
  let unarchiveService: UnarchiveService;

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

    unarchiveService = new UnarchiveService({
      execCommand: async (cmd, args) => {
        const dest = args[args.length - 1];
        if (dest && fs.existsSync(path.dirname(dest))) {
          fs.mkdirSync(dest, { recursive: true });
          const archivePath = args[args.length - 2];
          const releaseMatch = archivePath.match(/xb-\d+/);
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

  it('recovers the 4 stuck xb downloads, updates db, removes invalid directory, and leaves staging untouched', async () => {
    const releases = ['xb-4050', 'xb-3946', 'xb-3889', 'xb-3987'];

    // Setup the invalid library directory with mingled .rar files
    const invalidDir = path.join(mediaDir, 'private', 'xb (2026)', 'xb (2026).mkv');
    fs.mkdirSync(invalidDir, { recursive: true });

    for (const rel of releases) {
      // Create staging folder and archive
      const relStaging = path.join(stagingDir, rel);
      fs.mkdirSync(relStaging, { recursive: true });
      fs.writeFileSync(path.join(relStaging, `hhd800.com@${rel}.rar`), `staging rar content for ${rel}`);

      // Create misplaced rar in library
      fs.writeFileSync(path.join(invalidDir, `hhd800.com@${rel}.rar`), `misplaced rar ${rel}`);

      // Insert DB record stuck with shared invalid jellyfin_path
      db.insert(downloadRequests).values({
        id: `req_${rel}`,
        userId: 'admin_user',
        title: 'xb',
        mediaType: 'private',
        status: 'seeding',
        jellyfinPath: invalidDir,
        magnetLink: `magnet:?xt=urn:btih:hash_${rel}&dn=${rel}`,
        metadataId: `meta_${rel}`,
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      }).run();
    }

    const result = await runCompressedDownloadsRecovery({
      db,
      unarchiveService,
      fileSystem,
      jellyfin,
      stagingPath: stagingDir,
      mediaPath: mediaDir,
    });

    expect(result.recoveredCount).toBe(4);
    expect(result.removedInvalidPath).toBe(true);

    // Verify invalid directory is removed
    expect(fs.existsSync(invalidDir)).toBe(false);

    // Verify each release extracted to its own distinct folder
    for (const rel of releases) {
      const expectedPath = path.join(mediaDir, 'private', rel, `${rel}.mp4`);
      expect(fs.existsSync(expectedPath)).toBe(true);

      const req = db.select().from(downloadRequests).where(eq(downloadRequests.id, `req_${rel}`)).get();
      expect(req?.jellyfinPath).toBe(expectedPath);
      expect(req?.status).toBe('seeding');

      // Verify staging archive is untouched
      const stagingRar = path.join(stagingDir, rel, `hhd800.com@${rel}.rar`);
      expect(fs.existsSync(stagingRar)).toBe(true);
      expect(fs.readFileSync(stagingRar, 'utf-8')).toBe(`staging rar content for ${rel}`);
    }

    // Verify Jellyfin refresh triggered
    expect(jellyfin.refreshCalled).toBe(1);
  });
});
