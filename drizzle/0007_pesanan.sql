CREATE TABLE `pesanan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode` text NOT NULL,
	`nomor` integer,
	`nama` text NOT NULL,
	`cara` text NOT NULL,
	`catatan` text,
	`status` text NOT NULL,
	`total` integer NOT NULL,
	`potongan` integer DEFAULT 0 NOT NULL,
	`metode` text,
	`gateway` text NOT NULL,
	`gateway_ref` text,
	`perangkat` text NOT NULL,
	`dibuat` integer NOT NULL,
	`kedaluwarsa_pada` integer NOT NULL,
	`dibayar` integer,
	`diperbarui` integer NOT NULL,
	`refund_dari` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pesanan_kode_unique` ON `pesanan` (`kode`);--> statement-breakpoint
CREATE TABLE `pesanan_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pesanan_id` integer NOT NULL,
	`menu_id` integer NOT NULL,
	`nama` text NOT NULL,
	`qty` integer NOT NULL,
	`harga` integer NOT NULL,
	`less_sugar` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tap_event` ADD `pesanan_id` integer;