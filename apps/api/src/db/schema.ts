import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  jellyfinUserId: text('jellyfin_user_id').notNull(),
  username: text('username').notNull(),
  email: text('email'),
  role: text('role', { enum: ['user', 'trusted', 'admin'] }).notNull().default('user'),
  createdAt: text('created_at').notNull(),
});

export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  role: text('role', { enum: ['user', 'trusted'] }).notNull().default('user'),
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
    mediaType: text('media_type', { enum: ['movie', 'tv_show', 'anime', 'private'] }).notNull(),
    status: text('status', {
      enum: ['queued', 'downloading', 'hardlinking', 'unarchiving', 'seeding', 'done', 'error', 'deleted'],
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
    transcriptionStatus: text('transcription_status', {
      enum: ['none', 'pending', 'transcribing', 'completed', 'failed'],
    }).notNull().default('none'),
    transcriptionError: text('transcription_error'),
    deletedAt: text('deleted_at'),
    deletionReason: text('deletion_reason', { enum: ['cleanup', 'manual'] }),
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

export const requestEpisodes = sqliteTable(
  'request_episodes',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id')
      .notNull()
      .references(() => downloadRequests.id, { onDelete: 'cascade' }),
    seasonNumber: integer('season_number').notNull(),
    episodeNumber: integer('episode_number').notNull(),
    fileIndex: integer('file_index').notNull(),
    relativePath: text('relative_path').notNull(),
    jellyfinPath: text('jellyfin_path').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    status: text('status', { enum: ['downloaded', 'pruned'] }).notNull().default('downloaded'),
    keepFlag: integer('keep_flag', { mode: 'boolean' }).notNull().default(false),
    lastPlayedAt: text('last_played_at'),
    prunedAt: text('pruned_at'),
  },
  (table) => [
    uniqueIndex('request_episodes_req_season_ep_unique').on(
      table.requestId,
      table.seasonNumber,
      table.episodeNumber
    ),
  ]
);

export const systemConfig = sqliteTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const featureFlags = sqliteTable('feature_flags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category', { enum: ['discovery', 'downloads', 'automation'] }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at').notNull(),
  updatedByUserId: text('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;
export type DownloadRequest = typeof downloadRequests.$inferSelect;
export type NewDownloadRequest = typeof downloadRequests.$inferInsert;
export type RequestCoRequester = typeof requestCoRequesters.$inferSelect;
export type NewRequestCoRequester = typeof requestCoRequesters.$inferInsert;
export type RequestEpisode = typeof requestEpisodes.$inferSelect;
export type NewRequestEpisode = typeof requestEpisodes.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;

export type UserRole = 'user' | 'trusted' | 'admin';
export type InviteRole = 'user' | 'trusted';
export type MediaType = 'movie' | 'tv_show' | 'anime' | 'private';
export type EpisodeStatus = 'downloaded' | 'pruned';
export type TranscriptionStatus = 'none' | 'pending' | 'transcribing' | 'completed' | 'failed';