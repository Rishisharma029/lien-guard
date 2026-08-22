CREATE TABLE `case_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`uploaded_by_user_id` int NOT NULL,
	`kind` enum('EVIDENCE','CORRESPONDENCE','RTI_DRAFT','OTHER') NOT NULL DEFAULT 'EVIDENCE',
	`file_name` varchar(255) NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`content_type` varchar(127) NOT NULL,
	`size_bytes` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `case_documents_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `case_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`actor_user_id` int NOT NULL,
	`type` enum('CASE_CREATED','DETAILS_UPDATED','STATUS_CHANGED','COMMUNICATION_RECORDED','DOCUMENT_UPLOADED','RTI_DRAFT_CREATED') NOT NULL,
	`message` varchar(500) NOT NULL,
	`previous_status` enum('OPEN','UNDER_REVIEW','AWAITING_RESPONSE','ESCALATED','RESOLVED','CLOSED'),
	`next_status` enum('OPEN','UNDER_REVIEW','AWAITING_RESPONSE','ESCALATED','RESOLVED','CLOSED'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `case_documents` ADD CONSTRAINT `case_documents_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_documents` ADD CONSTRAINT `case_documents_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_events` ADD CONSTRAINT `case_events_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_events` ADD CONSTRAINT `case_events_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `case_documents_case_created_idx` ON `case_documents` (`case_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `case_events_case_created_idx` ON `case_events` (`case_id`,`created_at`);