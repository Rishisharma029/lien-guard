CREATE TABLE `case_communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`direction` enum('outbound','inbound') NOT NULL,
	`subject` varchar(180) NOT NULL,
	`counterparty` varchar(160),
	`body` text NOT NULL,
	`state` enum('recorded','received') NOT NULL DEFAULT 'recorded',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `case_communications` ADD CONSTRAINT `case_communications_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `case_communications_case_created_idx` ON `case_communications` (`case_id`,`created_at`);