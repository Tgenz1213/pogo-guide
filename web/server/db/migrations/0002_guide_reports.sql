CREATE TABLE `guide_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text,
	`sanity_doc_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guide_reports_reporter_guide_idx` ON `guide_reports` (`reporter_id`,`sanity_doc_id`);
