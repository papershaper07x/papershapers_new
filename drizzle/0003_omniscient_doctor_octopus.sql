CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text,
	`author_label` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`is_internal` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`published_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_posts_slug_unique` ON `community_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `community_posts_status_published_idx` ON `community_posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `community_posts_author_idx` ON `community_posts` (`author_id`,`created_at`);