CREATE TABLE `ephemeral_streams` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`debrid_torrent_id` text NOT NULL,
	`magnet_link` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`jellyfin_item_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
