import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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

export const downloadRequests = sqliteTable('download_requests', {
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
});

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
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;