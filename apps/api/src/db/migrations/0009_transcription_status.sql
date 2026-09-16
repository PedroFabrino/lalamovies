ALTER TABLE `download_requests` ADD `transcription_status` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `download_requests` ADD `transcription_error` text;
