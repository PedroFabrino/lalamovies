import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const watchRequests = sqliteTable('watch_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  mediaType: text('media_type', { enum: ['movie', 'tv_show', 'anime'] }).notNull(),
  metadataId: text('metadata_id').notNull(),
  metadataSource: text('metadata_source', { enum: ['tmdb', 'anilist'] }).notNull(),
  title: text('title').notNull(),
  year: integer('year'),
  seasonNumber: integer('season_number'),
  targetEpisode: integer('target_episode'),
  triggeredCount: integer('triggered_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  status: text('status', {
    enum: [
      'pending_release',
      'checking',
      'notified',
      'triggered',
      'completed',
      'rejected',
      'cancelled',
      'error',
    ],
  }).notNull().default('checking'),
  tmdbReleaseDate: text('tmdb_release_date'),
  prowlarrReleaseTitle: text('prowlarr_release_title'),
  prowlarrReleaseMagnet: text('prowlarr_release_magnet'),
  prowlarrReleaseScore: integer('prowlarr_release_score'),
  discordMessageId: text('discord_message_id'),
  notifyAt: text('notify_at'),
  posterUrl: text('poster_url'),
  requesterUsername: text('requester_username'),
  requesterEmail: text('requester_email'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  cancelledAt: text('cancelled_at'),
  cancelledBy: text('cancelled_by'),
});

export type WatchRequest = typeof watchRequests.$inferSelect;
export type NewWatchRequest = typeof watchRequests.$inferInsert;