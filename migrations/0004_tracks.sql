CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `track_id` text REFERENCES tracks(id) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `projects` ADD `for_label` text;