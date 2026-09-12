import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  jellyfinUserId: text('jellyfin_user_id').notNull(),
  username: text('username').notNull(),
  email: text('email'),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: text('created_at').notNull(),
});

export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
});

export const downloadRequests = sqliteTable(
  'download_requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    magnetLink: text('magnet_link').notNull(),
    mediaType: text('media_type', { enum: ['movie', 'tv_show', 'anime'] }).notNull(),
    status: text('status', {
      enum: ['queued', 'downloading', 'hardlinking', 'seeding', 'done', 'error', 'deleted'],
    }).notNull().default('queued'),
    metadataId: text('metadata_id').notNull(),
    metadataSource: text('metadata_source', { enum: ['tmdb', 'anilist'] }).notNull(),
    title: text('title').notNull(),
    year: integer('year'),
    seasonNumber: integer('season_number'),
    episodeNumber: integer('episode_number'),
    jellyfinPath: text('jellyfin_path'),
    keepFlag: integer('keep_flag', { mode: 'boolean' }).notNull().default(false),
    qbTorrentHash: text('qb_torrent_hash'),
    errorMessage: text('error_message'),
    requestedAt: text('requested_at').notNull(),
    downloadedAt: text('downloaded_at'),
    lastPlayedAt: text('last_played_at'),
    scheduledDeleteAt: text('scheduled_delete_at'),
    sizeBytes: integer('size_bytes'),
    torrentFilePath: text('torrent_file_path'),
    deferredReason: text('deferred_reason'),
  },
  (table) => [
    uniqueIndex('download_requests_movie_unique')
      .on(table.metadataId, table.metadataSource)
      .where(sql`status != 'deleted' AND media_type = 'movie'`),
    uniqueIndex('download_requests_season_pack_unique')
      .on(table.metadataId, table.metadataSource, table.seasonNumber)
      .where(sql`status != 'deleted' AND season_number IS NOT NULL AND episode_number IS NULL`),
    uniqueIndex('download_requests_episode_unique')
      .on(table.metadataId, table.metadataSource, table.seasonNumber, table.episodeNumber)
      .where(sql`status != 'deleted' AND season_number IS NOT NULL AND episode_number IS NOT NULL`),
  ]
);

export const requestCoRequesters = sqliteTable(
  'request_co_requesters',
  {
    requestId: text('request_id')
      .notNull()
      .references(() => downloadRequests.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addedAt: text('added_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.requestId, table.userId] }),
  ]
);

export const systemConfig = sqliteTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;
export type DownloadRequest = typeof downloadRequests.$inferSelect;
export type NewDownloadRequest = typeof downloadRequests.$inferInsert;
export type RequestCoRequester = typeof requestCoRequesters.$inferSelect;
export type NewRequestCoRequester = typeof requestCoRequesters.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;