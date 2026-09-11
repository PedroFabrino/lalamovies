import { describe, it, expect } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { getWatcherDatabasePath } from '../src/db';

describe('Watcher Service Health & Config', () => {
  it('GET /health returns { status: "ok" } with 200', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:' });
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('respects WATCHER_DB_PATH env var', () => {
    const original = process.env.WATCHER_DB_PATH;
    try {
      process.env.WATCHER_DB_PATH = 'custom/path/watcher.db';
      expect(getWatcherDatabasePath()).toBe('custom/path/watcher.db');
    } finally {
      if (original !== undefined) {
        process.env.WATCHER_DB_PATH = original;
      } else {
        delete process.env.WATCHER_DB_PATH;
      }
    }
  });
});
