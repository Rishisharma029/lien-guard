CREATE TABLE `role_change_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetUserId` int NOT NULL,
	`changedByUserId` int NOT NULL,
	`previousRole` enum('citizen','bank','authority','admin') NOT NULL,
	`newRole` enum('citizen','bank','authority','admin') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_change_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('role_changed') NOT NULL,
	`title` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('citizen','bank','authority','admin') NOT NULL DEFAULT 'citizen';--> statement-breakpoint
ALTER TABLE `role_change_audits` ADD CONSTRAINT `role_change_audits_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_change_audits` ADD CONSTRAINT `role_change_audits_changedByUserId_users_id_fk` FOREIGN KEY (`changedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `role_change_audits_target_created_idx` ON `role_change_audits` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `role_change_audits_actor_created_idx` ON `role_change_audits` (`changedByUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_notifications_user_created_idx` ON `user_notifications` (`userId`,`createdAt`);