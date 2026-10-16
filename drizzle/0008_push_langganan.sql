CREATE TABLE `push_langganan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`perangkat` text,
	`dibuat` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_langganan_endpoint_unique` ON `push_langganan` (`endpoint`);