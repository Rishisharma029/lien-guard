CREATE TABLE `authority_directory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state_ut` varchar(100) NOT NULL,
	`district` varchar(100),
	`authority_type` enum('CYBER_CELL','GRIEVANCE_OFFICER','BANK_NODAL','OTHER') NOT NULL DEFAULT 'CYBER_CELL',
	`authority_name` varchar(200) NOT NULL,
	`officer_name` varchar(200),
	`designation` varchar(200),
	`official_email` varchar(320),
	`phone` varchar(30),
	`source_name` varchar(200) NOT NULL,
	`source_url` varchar(512) NOT NULL,
	`last_verified_at` timestamp NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authority_directory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_authority_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`authority_directory_id` int,
	`authority_name` varchar(200) NOT NULL,
	`authority_email` varchar(320),
	`officer_name` varchar(200),
	`designation` varchar(200),
	`source_name` varchar(200) NOT NULL,
	`source_url` varchar(512) NOT NULL,
	`last_verified_at` timestamp NOT NULL,
	`routing_reason` varchar(500),
	`assigned_by_user_id` int,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_authority_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `case_events` MODIFY COLUMN `type` enum('CASE_CREATED','DETAILS_UPDATED','STATUS_CHANGED','COMMUNICATION_RECORDED','EMAIL_QUEUED','EMAIL_SENT','EMAIL_FAILED','INBOUND_EMAIL_RECEIVED','DEADLINE_FOLLOW_UP_QUEUED','DEADLINE_ESCALATED','DOCUMENT_UPLOADED','RTI_DRAFT_CREATED','AUTHORITY_RECOMMENDED','AUTHORITY_ASSIGNED','AUTHORITY_CHANGED') NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `authority_directory_id` int;--> statement-breakpoint
ALTER TABLE `case_authority_assignments` ADD CONSTRAINT `case_authority_assignments_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_authority_assignments` ADD CONSTRAINT `case_authority_assignments_authority_directory_id_authority_directory_id_fk` FOREIGN KEY (`authority_directory_id`) REFERENCES `authority_directory`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_authority_assignments` ADD CONSTRAINT `case_authority_assignments_assigned_by_user_id_users_id_fk` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_authority_directory_id_authority_directory_id_fk` FOREIGN KEY (`authority_directory_id`) REFERENCES `authority_directory`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `authority_directory_state_type_idx` ON `authority_directory` (`state_ut`,`authority_type`,`active`);--> statement-breakpoint
CREATE INDEX `case_authority_assignments_case_idx` ON `case_authority_assignments` (`case_id`,`assigned_at`);
