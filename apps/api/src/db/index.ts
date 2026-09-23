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
    seedDefaultFeatureFlags(db);
  }

  return { db, sqlite };
}

export function seedDefaultConfig(db: AppDatabase) {
  const defaults: Record<string, string> = {
    concurrent_limit: '2',
    disk_warn_threshold: '20',
    disk_reject_threshold: '15',
    storage_quota_gb: process.env.STORAGE_QUOTA_GB || '150',
    transcription_window_start: '02:00',
    transcription_window_end: '07:00',
    transcription_timezone: process.env.TZ || 'America/Sao_Paulo',
    anime_include_adult: 'false',
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

export const DEFAULT_FEATURE_FLAGS: Array<{
  id: string;
  name: string;
  description: string;
  category: 'discovery' | 'downloads' | 'automation';
  enabled: boolean;
}> = [
  {
    id: 'discovery_feed',
    name: 'Discovery Feed',
    description: 'Curated trending and recommended media shelves on the Dashboard',
    category: 'discovery',
    enabled: true,
  },
  {
    id: 'up_next',
    name: 'Up Next Shelf',
    description: 'Active TV show progress tracking and next-episode prompt on the Dashboard',
    category: 'discovery',
    enabled: true,
  },
  {
    id: 'streaming',
    name: 'Ephemeral Streaming',
    description: 'Instant zero-disk media playback via Real-Debrid and virtual WebDAV mount',
    category: 'discovery',
    enabled: true,
  },
  {
    id: 'seasonal_anime',
    name: 'Seasonal Anime',
    description: 'Seasonal anime schedules, trending catalogs, and anticipated sequel tracking via AniList',
    category: 'discovery',
    enabled: true,
  },
  {
    id: 'manual_torrents',
    name: 'Manual Torrent Submissions',
    description: 'Single torrent requests, magnet links, and torrent file uploads',
    category: 'downloads',
    enabled: true,
  },
  {
    id: 'batch_uploads',
    name: 'Batch Uploads',
    description: 'Batch file and magnet link staging operations',
    category: 'downloads',
    enabled: true,
  },
  {
    id: 'waitlist',
    name: 'Waitlist & Watcher',
    description: 'Automated Prowlarr indexer polling and notify/auto-download queue',
    category: 'downloads',
    enabled: true,
  },
  {
    id: 'jellyfin_library_view',
    name: 'Media Library View',
    description: 'Portal view of Jellyfin media folders with moving and deletion capabilities',
    category: 'downloads',
    enabled: true,
  },
  {
    id: 'automated_cleanup',
    name: 'Automated Disk Cleanup',
    description: 'Scheduled periodic disk evaluation and retention tier media eviction',
    category: 'automation',
    enabled: true,
  },
  {
    id: 'discord_notifications',
    name: 'Discord Notifications',
    description: 'Outbound webhook alerts for download completions and disk cleanup',
    category: 'automation',
    enabled: true,
  },
  {
    id: 'user_invites',
    name: 'User Invites',
    description: 'Registration of new accounts and generation of invite links',
    category: 'automation',
    enabled: true,
  },
  {
    id: 'transcription_enabled',
    name: 'Subtitle Transcription',
    description: 'Background GPU Whisper subtitle translation for Private Library',
    category: 'automation',
    enabled: true,
  },
];

export function seedDefaultFeatureFlags(db: AppDatabase) {
  const now = new Date().toISOString();
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    const existing = db
      .select()
      .from(schema.featureFlags)
      .where(eq(schema.featureFlags.id, flag.id))
      .get();

    if (!existing) {
      db.insert(schema.featureFlags)
        .values({
          id: flag.id,
          name: flag.name,
          description: flag.description,
          category: flag.category,
          enabled: flag.enabled,
          updatedAt: now,
          updatedByUserId: null,
        })
        .run();
    }
  }
}

export * from './schema';