CREATE TABLE `event_crew` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`milestone_id` text NOT NULL,
	`name` text NOT NULL,
	`committee` text NOT NULL,
	`character` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_crew_milestone` ON `event_crew` (`milestone_id`);