import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  return path.resolve(process.cwd(), 'data', 'app.db');
}

export function getMigrationsFolder(): string {
  const candidates = [
    path.resolve(__dirname, 'db/migrations'),
    path.resolve(__dirname, 'migrations'),
    path.resolve(process.cwd(), 'apps/api/dist/db/migrations'),
    path.resolve(process.cwd(), 'apps/api/dist/migrations'),
    path.resolve(__dirname, '../src/db/migrations'),
    path.resolve(process.cwd(), 'src/db/migrations'),
    path.resolve(process.cwd(), 'apps/api/src/db/migrations'),
    path.resolve(process.cwd(), 'dist/db/migrations'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'meta', '_journal.json'))) {
      return candidate;
    }
  }
  return path.resolve(__dirname, 'db/migrations');
}

export function initDatabase(dbPath?: string, runMigrate = true): { db: AppDatabase; sqlite: Database.Database } {
  const targetPath = dbPath || getDatabasePath();

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(targetPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  if (runMigrate) {
    const migrationsFolder = getMigrationsFolder();
    migrate(db, { migrationsFolder });
    seedDefaultConfig(db);
  }

  return { db, sqlite };
}

export function seedDefaultConfig(db: AppDatabase) {
  const defaults: Record<string, string> = {
    concurrent_limit: '2',
    disk_warn_threshold: '20',
    disk_reject_threshold: '15',
    storage_quota_gb: process.env.STORAGE_QUOTA_GB || '150',
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = db
      .select()
      .from(schema.systemConfig)
      .where(eq(schema.systemConfig.key, key))
      .get();

    if (!existing) {
      db.insert(schema.systemConfig).values({ key, value }).run();
    }
  }
}

export * from './schema';