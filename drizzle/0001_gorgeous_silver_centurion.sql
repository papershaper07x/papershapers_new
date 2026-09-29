CREATE UNIQUE INDEX `saved_items_user_portal_item_idx` ON `saved_items` (`user_id`,`portal`,`item_key`);--> statement-breakpoint
CREATE INDEX `saved_items_user_portal_idx` ON `saved_items` (`user_id`,`portal`,`created_at`);--> statement-breakpoint
CREATE INDEX `study_requests_user_idx` ON `study_requests` (`user_id`,`created_at`);