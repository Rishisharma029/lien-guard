CREATE TABLE `case_automation_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`action` enum('DEADLINE_FOLLOW_UP','DEADLINE_ESCALATION') NOT NULL,
	`idempotency_key` varchar(160) NOT NULL,
	`communication_id` int,
	`completed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_automation_actions_id` PRIMARY KEY(`id`),
	CONSTRAINT `case_automation_actions_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
ALTER TABLE `case_communications` MODIFY COLUMN `state` enum('recorded','queued','sent','failed','received') NOT NULL DEFAULT 'recorded';--> statement-breakpoint
ALTER TABLE `case_events` MODIFY COLUMN `actor_user_id` int;--> statement-breakpoint
ALTER TABLE `case_events` MODIFY COLUMN `type` enum('CASE_CREATED','DETAILS_UPDATED','STATUS_CHANGED','COMMUNICATION_RECORDED','EMAIL_QUEUED','EMAIL_SENT','EMAIL_FAILED','INBOUND_EMAIL_RECEIVED','DEADLINE_FOLLOW_UP_QUEUED','DEADLINE_ESCALATED','DOCUMENT_UPLOADED','RTI_DRAFT_CREATED') NOT NULL;--> statement-breakpoint
ALTER TABLE `case_communications` ADD `recipient_email` varchar(320);--> statement-breakpoint
ALTER TABLE `case_communications` ADD `provider_message_id` varchar(128);--> statement-breakpoint
ALTER TABLE `case_communications` ADD `automated` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `case_communications` ADD `sent_at` timestamp;--> statement-breakpoint
ALTER TABLE `case_events` ADD `actor_label` varchar(96);--> statement-breakpoint
ALTER TABLE `cases` ADD `authority_email` varchar(320);--> statement-breakpoint
ALTER TABLE `case_communications` ADD CONSTRAINT `case_communications_provider_message_id_unique` UNIQUE(`provider_message_id`);--> statement-breakpoint
ALTER TABLE `case_automation_actions` ADD CONSTRAINT `case_automation_actions_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_automation_actions` ADD CONSTRAINT `case_automation_actions_communication_id_case_communications_id_fk` FOREIGN KEY (`communication_id`) REFERENCES `case_communications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `case_automation_case_action_idx` ON `case_automation_actions` (`case_id`,`action`,`completed_at`);