CREATE TABLE `request_co_requesters` (
	`request_id` text NOT NULL,
	`user_id` text NOT NULL,
	`added_at` text NOT NULL,
	PRIMARY KEY(`request_id`, `user_id`),
	FOREIGN KEY (`request_id`) REFERENCES `download_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
