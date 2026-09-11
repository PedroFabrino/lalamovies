import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema';

export type WatcherDatabase = BetterSQLite3Database<typeof schema>;

export function getWatcherDatabasePath(): string {
  if (process.env.WATCHER_DB_PATH) {
    return process.env.WATCHER_DB_PATH;
  }
  return path.resolve(process.cwd(), 'data', 'watcher.db');
}

export function initWatcherDatabase(dbPath?: string): { db: WatcherDatabase; sqlite: Database.Database } {
  const targetPath = dbPath || getWatcherDatabasePath();

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(targetPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS watch_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_type TEXT NOT NULL,
      metadata_id TEXT NOT NULL,
      metadata_source TEXT NOT NULL,
      title TEXT NOT NULL,
      year INTEGER,
      season_number INTEGER,
      target_episode INTEGER,
      triggered_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'checking',
      tmdb_release_date TEXT,
      prowlarr_release_title TEXT,
      prowlarr_release_magnet TEXT,
      prowlarr_release_score INTEGER,
      discord_message_id TEXT,
      notify_at TEXT,
      poster_url TEXT,
      requester_username TEXT,
      requester_email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      cancelled_at TEXT,
      cancelled_by TEXT
    );
  `);

  try {
    sqlite.exec(`ALTER TABLE watch_requests ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists
  }

  try {
    sqlite.exec(`ALTER TABLE watch_requests ADD COLUMN poster_url TEXT;`);
  } catch {
    // Column already exists
  }

  try {
    sqlite.exec(`ALTER TABLE watch_requests ADD COLUMN requester_username TEXT;`);
  } catch {
    // Column already exists
  }

  try {
    sqlite.exec(`ALTER TABLE watch_requests ADD COLUMN requester_email TEXT;`);
  } catch {
    // Column already exists
  }

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

export * from './schema';