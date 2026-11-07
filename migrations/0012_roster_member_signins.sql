CREATE TABLE `member_signins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roster_id` integer,
	`email` text NOT NULL,
	`ok` integer NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `member_signins_created` ON `member_signins` (`created_at`);--> statement-breakpoint
CREATE INDEX `member_signins_ip` ON `member_signins` (`ip`,`created_at`);--> statement-breakpoint
ALTER TABLE `roster` ADD `member_id` text REFERENCES members(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `roster_member_id_unique` ON `roster` (`member_id`);