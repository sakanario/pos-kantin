CREATE TABLE `bahan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`satuan` text NOT NULL,
	`harga_awal` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bahan_aktif` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bahan_id` integer NOT NULL,
	`belanja_id` integer,
	`mulai` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menu` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`jenis` text NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resep` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_id` integer NOT NULL,
	`berlaku_mulai` integer NOT NULL,
	`isi_json` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `belanja` ADD `bahan_id` integer;--> statement-breakpoint
ALTER TABLE `belanja` ADD `menu_id` integer;--> statement-breakpoint
ALTER TABLE `belanja` ADD `isi_kemasan` real;--> statement-breakpoint
ALTER TABLE `belanja` ADD `jumlah_kemasan` integer;--> statement-breakpoint
ALTER TABLE `harga` ADD `menu_id` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tap_event` ADD `menu_id` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tutup_buku` ADD `stok_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- ─── Data lama (CR-003): Kopi = racikan id 1, Beng Beng = barang jadi id 2. Instalasi baru: no-op. ───
INSERT INTO `menu` (`id`, `nama`, `jenis`, `aktif`, `urutan`) SELECT 1, 'Kopi', 'racikan', 1, 1 WHERE EXISTS (SELECT 1 FROM `tutup_buku`);--> statement-breakpoint
INSERT INTO `menu` (`id`, `nama`, `jenis`, `aktif`, `urutan`) SELECT 2, 'Beng Beng', 'barang_jadi', 1, 2 WHERE EXISTS (SELECT 1 FROM `tutup_buku`);--> statement-breakpoint
DELETE FROM `harga` WHERE `jenis` = 'hpp';--> statement-breakpoint
UPDATE `harga` SET `menu_id` = CASE `produk` WHEN 'kopi' THEN 1 ELSE 2 END;--> statement-breakpoint
UPDATE `tap_event` SET `menu_id` = CASE `jenis` WHEN 'bb_sendiri' THEN 2 ELSE 1 END, `jenis` = CASE `jenis` WHEN 'kopi' THEN 'terjual' ELSE 'sendiri' END WHERE `jenis` IN ('kopi', 'kopi_sendiri', 'bb_sendiri');--> statement-breakpoint
UPDATE `belanja` SET `kategori` = 'barang', `menu_id` = 2,
  `isi_kemasan` = CASE WHEN `qty_pcs` % COALESCE((SELECT CAST(`value` AS INTEGER) FROM `settings` WHERE `key` = 'isi_per_dus'), 17) = 0
    THEN COALESCE((SELECT CAST(`value` AS INTEGER) FROM `settings` WHERE `key` = 'isi_per_dus'), 17) ELSE 1 END,
  `jumlah_kemasan` = CASE WHEN `qty_pcs` % COALESCE((SELECT CAST(`value` AS INTEGER) FROM `settings` WHERE `key` = 'isi_per_dus'), 17) = 0
    THEN `qty_pcs` / COALESCE((SELECT CAST(`value` AS INTEGER) FROM `settings` WHERE `key` = 'isi_per_dus'), 17) ELSE `qty_pcs` END
  WHERE `kategori` = 'bb';--> statement-breakpoint
UPDATE `belanja` SET `kategori` = 'bahan' WHERE `kategori` = 'kopi';--> statement-breakpoint
UPDATE `tutup_buku` SET `stok_json` = json_object('2', json_object('sisa', `sisa_bb`, 'avgModal', `avg_modal_bb`));--> statement-breakpoint
DELETE FROM `settings` WHERE `key` = 'isi_per_dus';
