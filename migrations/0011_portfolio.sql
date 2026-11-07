CREATE TABLE `access_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`roster_id` integer,
	`user_id` text,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `access_events_created` ON `access_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `email_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`roster_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_codes_user` ON `email_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_codes_roster` ON `email_codes` (`roster_id`);--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`notification_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`read_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`notification_id`, `user_id`),
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audience` text NOT NULL,
	`roster_id` integer NOT NULL,
	`kind` text NOT NULL,
	`actor_name` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_dedupe_key_unique` ON `notifications` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notifications_audience` ON `notifications` (`audience`,`roster_id`);--> statement-breakpoint
CREATE TABLE `portfolio_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roster_id` integer NOT NULL,
	`seq` integer NOT NULL,
	`kind` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_events_seq` ON `portfolio_events` (`roster_id`,`seq`);--> statement-breakpoint
CREATE TABLE `portfolio_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roster_id` integer NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`author_role` text NOT NULL,
	`kind` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`version` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `portfolio_messages_roster` ON `portfolio_messages` (`roster_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `portfolio_reads` (
	`roster_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`read_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`roster_id`, `user_id`),
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `portfolio_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roster_id` integer NOT NULL,
	`version` integer NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`late` integer,
	`user_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_submissions_version` ON `portfolio_submissions` (`roster_id`,`version`);--> statement-breakpoint
CREATE TABLE `portfolio_tasks` (
	`roster_id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`seq` integer DEFAULT 0 NOT NULL,
	`corrections` integer DEFAULT 0 NOT NULL,
	`current_url` text,
	`initial_at` text,
	`revised_at` text,
	`completed_at` text,
	`completed_by` text,
	`last_activity_at` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roster` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roster_email_unique` ON `roster` (`email`);--> statement-breakpoint
CREATE TABLE `roster_links` (
	`roster_id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`linked_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roster_links_user_id_unique` ON `roster_links` (`user_id`);