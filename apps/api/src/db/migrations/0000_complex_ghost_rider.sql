CREATE TABLE `download_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`magnet_link` text NOT NULL,
	`media_type` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`metadata_id` text NOT NULL,
	`metadata_source` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`season_number` integer,
	`jellyfin_path` text,
	`keep_flag` integer DEFAULT false NOT NULL,
	`qb_torrent_hash` text,
	`error_message` text,
	`requested_at` text NOT NULL,
	`downloaded_at` text,
	`last_played_at` text,
	`size_bytes` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_token_unique` ON `invites` (`token`);--> statement-breakpoint
CREATE TABLE `system_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`jellyfin_user_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text NOT NULL
);
