CREATE TABLE `request_episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`file_index` integer NOT NULL,
	`relative_path` text NOT NULL,
	`jellyfin_path` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`status` text DEFAULT 'downloaded' NOT NULL,
	`keep_flag` integer DEFAULT false NOT NULL,
	`last_played_at` text,
	`pruned_at` text,
	FOREIGN KEY (`request_id`) REFERENCES `download_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_episodes_req_season_ep_unique` ON `request_episodes` (`request_id`,`season_number`,`episode_number`);