CREATE TABLE `belanja` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`waktu` integer NOT NULL,
	`kategori` text NOT NULL,
	`nama` text NOT NULL,
	`qty_pcs` integer,
	`total` integer NOT NULL,
	`sumber` text NOT NULL,
	`catatan` text
);
--> statement-breakpoint
CREATE TABLE `harga` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`produk` text NOT NULL,
	`jenis` text NOT NULL,
	`nilai` integer NOT NULL,
	`berlaku_mulai` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`waktu` integer NOT NULL,
	`jenis` text NOT NULL,
	`nominal` integer NOT NULL,
	`catatan` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tap_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`waktu` integer NOT NULL,
	`jenis` text NOT NULL,
	`delta` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tutup_buku` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`waktu` integer NOT NULL,
	`saldo_kantong` integer NOT NULL,
	`sisa_bb` integer NOT NULL,
	`cash_belum_disetor` integer DEFAULT 0 NOT NULL,
	`avg_modal_bb` real NOT NULL,
	`hasil_json` text
);
