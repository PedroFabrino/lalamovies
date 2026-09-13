CREATE TABLE `waitlist_co_requesters` (
	`waitlist_id` text NOT NULL,
	`user_id` text NOT NULL,
	`added_at` text NOT NULL,
	PRIMARY KEY(`waitlist_id`, `user_id`),
	FOREIGN KEY (`waitlist_id`) REFERENCES `watch_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watch_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_type` text NOT NULL,
	`metadata_id` text NOT NULL,
	`metadata_source` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`season_number` integer,
	`target_episode` integer,
	`triggered_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'checking' NOT NULL,
	`tmdb_release_date` text,
	`prowlarr_release_title` text,
	`prowlarr_release_magnet` text,
	`prowlarr_release_score` integer,
	`discord_message_id` text,
	`notify_at` text,
	`poster_url` text,
	`requester_username` text,
	`requester_email` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`cancelled_at` text,
	`cancelled_by` text,
	`grace_override_hours` integer
);
