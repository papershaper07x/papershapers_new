-- Idempotent because local installations before this migration used the runtime
-- bootstrap for Live Rooms. This also makes the first managed deployment safe.
CREATE TABLE IF NOT EXISTS `auth_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_subject` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `auth_identities_provider_subject_idx` ON `auth_identities` (`provider`,`provider_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `auth_identities_user_provider_idx` ON `auth_identities` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `test_attendees` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`name` text NOT NULL,
	`roll_number` text NOT NULL,
	`status` text NOT NULL,
	`options_filled` text,
	`score` integer,
	`ai_evaluation` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `test_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `test_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`paper_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_roles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`institution` text,
	`verified` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
