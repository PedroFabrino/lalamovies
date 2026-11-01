import { describe, it, expect, vi } from 'vitest';
import { resolveTorrentSource } from '../src/services/torrentSource';
import { KeyedMutex } from '../src/services/requestDedup';
import { QBittorrentService, QBittorrentError } from '../src/services/qbittorrent';

describe('Torrent and Mutex Timeout Protection', () => {
  describe('resolveTorrentSource', () => {
    it('gracefully falls back when upstream URL fetch times out', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (_url: any, opts: any) => {
        // Simulate a stalled upstream server that aborts on signal
        return new Promise((_, reject) => {
          if (opts?.signal) {
            opts.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted due to timeout');
              err.name = 'TimeoutError';
              reject(err);
            });
          }
        });
      });

      try {
        const slowUrl = 'http://prowlarr:9696/5/download?apikey=test&file=Hang.Torrent';
        const start = Date.now();
        // Set short timeoutMs for unit test
        const result = await resolveTorrentSource(slowUrl, 50);
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(1000);
        expect(result.resolvedMagnet).toBe(slowUrl);
        expect(result.hash).toBe('');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('gracefully falls back when upstream URL throws network error', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network connection refused'));

      try {
        const failedUrl = 'http://prowlarr:9696/5/download?apikey=test';
        const result = await resolveTorrentSource(failedUrl, 100);
        expect(result.resolvedMagnet).toBe(failedUrl);
        expect(result.hash).toBe('');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('KeyedMutex timeout protection', () => {
    it('times out and unblocks queue when an operation stalls indefinitely', async () => {
      const mutex = new KeyedMutex();
      const lockKey = 'series:tmdb:12345:1:null';

      let task1Started = false;
      let task2Started = false;

      // Task 1 hangs indefinitely
      const task1Promise = mutex.runExclusive(
        lockKey,
        () =>
          new Promise((resolve) => {
            task1Started = true;
            // Never resolves
          }),
        100 // 100ms timeout for test
      );

      // Task 2 is queued behind Task 1
      const task2Promise = mutex.runExclusive(
        lockKey,
        async () => {
          task2Started = true;
          return 'task2-complete';
        },
        500
      );

      // Task 1 should fail with timeout error
      await expect(task1Promise).rejects.toThrow(/timed out after 100ms/);
      expect(task1Started).toBe(true);

      // Task 2 should now execute and succeed because lock was released
      const result2 = await task2Promise;
      expect(task2Started).toBe(true);
      expect(result2).toBe('task2-complete');
    });
  });

  describe('QBittorrentService signal handling', () => {
    it('gracefully handles timeout when qBittorrent connection times out', async () => {
      const service = new QBittorrentService('http://localhost:8080', 'admin', 'adminadmin');
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (_url: any, opts: any) => {
        expect(opts?.signal).toBeDefined();
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      });

      try {
        await expect(service.getActiveTorrentCount()).resolves.toBe(0);
        await expect(service.addTorrent('magnet:?xt=urn:btih:0123456789012345678901234567890123456789')).rejects.toThrow(
          /Could not connect to qBittorrent|Failed to add torrent/
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
