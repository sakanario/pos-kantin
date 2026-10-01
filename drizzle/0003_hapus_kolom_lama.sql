ALTER TABLE `harga` ALTER COLUMN "menu_id" TO "menu_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `harga` DROP COLUMN `produk`;--> statement-breakpoint
ALTER TABLE `harga` DROP COLUMN `jenis`;--> statement-breakpoint
ALTER TABLE `tap_event` ALTER COLUMN "menu_id" TO "menu_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `tutup_buku` DROP COLUMN `sisa_bb`;--> statement-breakpoint
ALTER TABLE `tutup_buku` DROP COLUMN `avg_modal_bb`;