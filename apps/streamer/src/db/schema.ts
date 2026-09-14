import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const ephemeralStreams = sqliteTable('ephemeral_streams', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  debridTorrentId: text('debrid_torrent_id').notNull(),
  magnetLink: text('magnet_link').notNull(),
  title: text('title').notNull(),
  status: text('status', {
    enum: ['pending', 'ready', 'expired', 'promoted'],
  }).notNull().default('pending'),
  expiresAt: text('expires_at').notNull(),
  jellyfinItemId: text('jellyfin_item_id'),
  createdAt: text('created_at').notNull(),
});

export const systemConfig = sqliteTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type EphemeralStream = typeof ephemeralStreams.$inferSelect;
export type NewEphemeralStream = typeof ephemeralStreams.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
