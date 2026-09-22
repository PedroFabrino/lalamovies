import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../src/db/schema';
import {
  checkDiskSafety,
  isStorageQuotaExceeded,
  getConcurrentLimit,
  stageTorrentFile,
} from '../src/services/requestPreparation';

describe('requestPreparation helpers', () => {
  let tempDir: string;
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'req-prep-test-'));
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  });

  afterEach(() => {
    sqlite.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('checkDiskSafety', () => {
    it('returns sufficient=true when host disk is safe and space sufficient', () => {
      const cleanup = {
        isHostDiskSafe: () => true,
        isSpaceSufficient: () => ({ sufficient: true, percentFree: 50, threshold: 15 }),
      };
      const res = checkDiskSafety(cleanup);
      expect(res.sufficient).toBe(true);
      expect(res.message).toBeUndefined();
    });

    it('returns sufficient=false when host disk is unsafe (<10GB)', () => {
      const cleanup = {
        isHostDiskSafe: () => false,
        isSpaceSufficient: () => ({ sufficient: true, percentFree: 50, threshold: 15 }),
      };
      const res = checkDiskSafety(cleanup);
      expect(res.sufficient).toBe(false);
      expect(res.message).toContain('Insufficient host disk space (< 10 GB free)');
    });

    it('returns sufficient=false when space percentFree is below threshold', () => {
      const cleanup = {
        isHostDiskSafe: () => true,
        isSpaceSufficient: () => ({ sufficient: false, percentFree: 10, threshold: 15 }),
      };
      const res = checkDiskSafety(cleanup);
      expect(res.sufficient).toBe(false);
      expect(res.message).toContain('Insufficient disk space (10% free, minimum required is 15%)');
    });

    it('handles cleanup with missing methods gracefully', () => {
      const res = checkDiskSafety({});
      expect(res.sufficient).toBe(true);
    });
  });

  describe('isStorageQuotaExceeded', () => {
    it('returns false when storage footprint is below 85% quota', async () => {
      // 100 GB quota
      db.insert(schema.systemConfig).values({ key: 'storage_quota_gb', value: '100' }).run();
      const fileSystem = {
        getStorageFootprintBytes: async () => 50 * 1024 * 1024 * 1024, // 50 GB
      };
      const exceeded = await isStorageQuotaExceeded(db as any, fileSystem);
      expect(exceeded).toBe(false);
    });

    it('returns true when storage footprint exceeds 85% quota', async () => {
      db.insert(schema.systemConfig).values({ key: 'storage_quota_gb', value: '100' }).run();
      const fileSystem = {
        getStorageFootprintBytes: async () => 86 * 1024 * 1024 * 1024, // 86 GB
      };
      const exceeded = await isStorageQuotaExceeded(db as any, fileSystem);
      expect(exceeded).toBe(true);
    });

    it('falls back to default quota when config row is missing', async () => {
      const fileSystem = {
        getStorageFootprintBytes: async () => 10 * 1024 * 1024 * 1024,
      };
      const exceeded = await isStorageQuotaExceeded(db as any, fileSystem);
      expect(exceeded).toBe(false);
    });
  });

  describe('getConcurrentLimit', () => {
    it('returns configured concurrent limit from systemConfig', () => {
      db.insert(schema.systemConfig).values({ key: 'concurrent_limit', value: '5' }).run();
      expect(getConcurrentLimit(db as any)).toBe(5);
    });

    it('returns 2 as default when not configured', () => {
      expect(getConcurrentLimit(db as any)).toBe(2);
    });
  });

  describe('stageTorrentFile', () => {
    it('creates torrents dir and writes .torrent file buffer', () => {
      const stagingPath = path.join(tempDir, 'downloads', 'staging');
      fs.mkdirSync(stagingPath, { recursive: true });
      const buffer = Buffer.from('d8:announce3:foo4:infod4:name4:teste');
      const requestId = 'req-test-123';

      const filePath = stageTorrentFile(stagingPath, requestId, buffer);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toBe(path.join(tempDir, 'downloads', 'torrents', 'req-test-123.torrent'));
      expect(fs.readFileSync(filePath)).toEqual(buffer);
    });
  });
});
