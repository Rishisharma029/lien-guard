CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` varchar(32) NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`case_type` varchar(80) NOT NULL,
	`status` enum('OPEN','UNDER_REVIEW','AWAITING_RESPONSE','ESCALATED','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`priority` enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `cases_case_id_unique` UNIQUE(`case_id`)
);
--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cases_user_updated_idx` ON `cases` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `cases_status_updated_idx` ON `cases` (`status`,`updated_at`);