CREATE TABLE IF NOT EXISTS `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`username` text,
	`display_username` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_username_unique` ON `user` (`username`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `members` (
	`membership_number` text PRIMARY KEY NOT NULL,
	`prefix` text,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`suffix` text,
	`member_type` text,
	`member_class` text,
	`nickname` text,
	`residence_phone` text,
	`cell_phone` text,
	`primary_email` text,
	`first_degree_date` text,
	`second_degree_date` text,
	`third_degree_date` text,
	`fourth_degree_date` text,
	`assembly_number` text,
	`birth_date` text,
	`active` integer DEFAULT true NOT NULL,
	`synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `permissions` (
	`key` text PRIMARY KEY NOT NULL,
	`membership_numbers` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`location` text,
	`start_at` integer NOT NULL,
	`end_at` integer,
	`all_day` integer DEFAULT false NOT NULL,
	`type` text NOT NULL,
	`recurrence_rule` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dues_rates` (
	`member_class` text PRIMARY KEY NOT NULL,
	`amount_cents` integer NOT NULL,
	`council_year` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dues_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_number` text NOT NULL,
	`member_class` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`council_year` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`paypal_txn_id` text,
	`payer_email` text,
	`method` text,
	`notes` text,
	`marked_by_membership_number` text,
	`paid_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`membership_number`) REFERENCES `members`(`membership_number`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `dues_payments_paypal_txn_id_unique` ON `dues_payments` (`paypal_txn_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `calendar_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_number` text NOT NULL,
	`token_hash` text NOT NULL,
	`feed` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`membership_number`) REFERENCES `members`(`membership_number`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `registration_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_number` text NOT NULL,
	`email` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `photo_galleries` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`immich_album_id` text NOT NULL,
	`allow_member_uploads` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `photo_galleries_immich_album_id_unique` ON `photo_galleries` (`immich_album_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gallery_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`immich_asset_id` text NOT NULL,
	`membership_number` text NOT NULL,
	`filename` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `photo_galleries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membership_number`) REFERENCES `members`(`membership_number`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_membership_number` text,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
