import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema';

export type StreamerDatabase = BetterSQLite3Database<typeof schema>;

export function getStreamerDatabasePath(): string {
  if (process.env.STREAMER_DB_PATH) {
    return process.env.STREAMER_DB_PATH;
  }
  return path.resolve(process.cwd(), 'data', 'streamer.db');
}

export function initStreamerDatabase(dbPath?: string): { db: StreamerDatabase; sqlite: Database.Database } {
  const targetPath = dbPath || getStreamerDatabasePath();

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
    CREATE TABLE IF NOT EXISTS ephemeral_streams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      debrid_torrent_id TEXT NOT NULL,
      magnet_link TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      jellyfin_item_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  try {
    sqlite.exec(`ALTER TABLE ephemeral_streams ADD COLUMN error_message TEXT;`);
  } catch {
    // Column already exists
  }

  try {
    sqlite.exec(`ALTER TABLE ephemeral_streams ADD COLUMN folder_name TEXT;`);
  } catch {
    // Column already exists
  }

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export * from './schema';
