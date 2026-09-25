PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_by_user_id` text NOT NULL,
	`expires_at` text,
	`used_at` text,
	`revoked_at` text,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_invites`("id", "token", "role", "created_by_user_id", "expires_at", "used_at") SELECT "id", "token", "role", "created_by_user_id", "expires_at", "used_at" FROM `invites`;--> statement-breakpoint
DROP TABLE `invites`;--> statement-breakpoint
ALTER TABLE `__new_invites` RENAME TO `invites`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `invites_token_unique` ON `invites` (`token`);--> statement-breakpoint
ALTER TABLE `users` ADD `invited_by_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `invite_id` text REFERENCES invites(id);--> statement-breakpoint
ALTER TABLE `users` ADD `invites_enabled` integer DEFAULT 1 NOT NULL;