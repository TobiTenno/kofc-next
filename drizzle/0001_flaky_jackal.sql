CREATE TABLE `dues_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_number` text NOT NULL,
	`paypal_subscription_id` text NOT NULL,
	`paypal_plan_id` text NOT NULL,
	`status` text NOT NULL,
	`member_class` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`payer_email` text,
	`next_billing_at` integer,
	`last_payment_at` integer,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`membership_number`) REFERENCES `members`(`membership_number`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dues_subscriptions_paypal_subscription_id_unique` ON `dues_subscriptions` (`paypal_subscription_id`);--> statement-breakpoint
ALTER TABLE `dues_payments` ADD `paypal_subscription_id` text;