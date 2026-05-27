CREATE TABLE `banned_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`hashed_identity` text NOT NULL,
	`banned_at` integer NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `banned_identities_hashed_identity_unique` ON `banned_identities` (`hashed_identity`);--> statement-breakpoint
CREATE TABLE `guide_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`sanity_doc_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `infractions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`identity_hash` text NOT NULL,
	`type` text NOT NULL,
	`issued_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
