CREATE TABLE IF NOT EXISTS `bahan_terbuang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`waktu` integer NOT NULL,
	`bahan_id` integer NOT NULL,
	`jumlah` real NOT NULL,
	`catatan` text
);
