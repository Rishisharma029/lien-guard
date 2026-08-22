ALTER TABLE `cases` ADD `bank_name` varchar(160);--> statement-breakpoint
ALTER TABLE `cases` ADD `lien_amount` decimal(14,2);--> statement-breakpoint
ALTER TABLE `cases` ADD `lien_date` timestamp;--> statement-breakpoint
ALTER TABLE `cases` ADD `lien_reference` varchar(96);--> statement-breakpoint
ALTER TABLE `cases` ADD `transaction_reference` varchar(96);--> statement-breakpoint
ALTER TABLE `cases` ADD `authority_name` varchar(160);--> statement-breakpoint
ALTER TABLE `cases` ADD `response_deadline` timestamp;