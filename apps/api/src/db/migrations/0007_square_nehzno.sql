CREATE TABLE `feature_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by_user_id` text,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
