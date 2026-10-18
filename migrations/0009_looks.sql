CREATE TABLE `look_edits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`char` text NOT NULL,
	`body` text NOT NULL,
	`wear` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `look_edits_member` ON `look_edits` (`member_id`);--> statement-breakpoint
CREATE TABLE `member_accessories` (
	`member_id` text NOT NULL,
	`accessory_id` text NOT NULL,
	`awarded_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`member_id`, `accessory_id`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `members` ADD `avatar_wear` text DEFAULT '[]' NOT NULL;