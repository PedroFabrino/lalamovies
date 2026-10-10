ALTER TABLE `users` ADD `telegram_chat_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `personal_gemini_api_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_chat_id_unique` ON `users` (`telegram_chat_id`);