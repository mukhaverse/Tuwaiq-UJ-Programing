CREATE TABLE `survey_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`respondent` text NOT NULL,
	`name` text NOT NULL,
	`member_id` text,
	`submitted_at` text NOT NULL,
	`answers` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `survey_responses_unique` ON `survey_responses` (`respondent`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `survey_responses_member` ON `survey_responses` (`member_id`);