import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Semua nominal dalam integer rupiah. Semua waktu dalam epoch milidetik (UTC).
// Tidak ada foreign key di level DB; kolom *_id hanya rujukan.

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Racikan: HPP dari resep, stok tidak dilacak, tap terjual + sendiri.
// Barang jadi: modal rata-rata per pcs, stok dilacak (sisa diinput tiap tutup buku), tap sendiri saja.
export const menu = sqliteTable("menu", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  jenis: text("jenis", { enum: ["racikan", "barang_jadi"] }).notNull(),
  aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),
  urutan: integer("urutan").notNull().default(0),
});

export const bahan = sqliteTable("bahan", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  satuan: text("satuan", { enum: ["gr", "pcs"] }).notNull(),
  // Harga per satuan sebelum ada pembelian aktif
  hargaAwal: real("harga_awal").notNull(),
});

// Riwayat resep: resep yang berlaku pada t = baris terakhir dengan berlaku_mulai <= t.
export const resep = sqliteTable("resep", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  menuId: integer("menu_id").notNull(),
  berlakuMulai: integer("berlaku_mulai").notNull(),
  isiJson: text("isi_json").notNull(), // [{ bahanId, takaran }]
});

// Pembelian (kemasan) yang sedang dipakai: pada t = baris terakhir dengan mulai <= t.
export const bahanAktif = sqliteTable("bahan_aktif", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bahanId: integer("bahan_id").notNull(),
  belanjaId: integer("belanja_id"),
  mulai: integer("mulai").notNull(),
});

// Riwayat harga jual per menu (tidak pernah ditimpa)
export const harga = sqliteTable("harga", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  menuId: integer("menu_id").notNull(),
  nilai: integer("nilai").notNull(),
  berlakuMulai: integer("berlaku_mulai").notNull(),
});

export const tapEvent = sqliteTable("tap_event", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktu: integer("waktu").notNull(),
  menuId: integer("menu_id").notNull(),
  jenis: text("jenis", { enum: ["terjual", "sendiri"] }).notNull(),
  delta: integer("delta").notNull(),
  // true = diisi manual dari tab Kopi (untuk hari sebelumnya), false = tap langsung
  manual: integer("manual", { mode: "boolean" }).notNull().default(false),
});

export const belanja = sqliteTable("belanja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktu: integer("waktu").notNull(),
  kategori: text("kategori", { enum: ["bahan", "barang", "lain"] }).notNull(),
  nama: text("nama").notNull(),
  bahanId: integer("bahan_id"), // kategori bahan (null = belanja lama belum ditandai)
  menuId: integer("menu_id"), // kategori barang (barang jadi)
  isiKemasan: real("isi_kemasan"), // gr/pcs per kemasan (bahan), pcs per dus (barang)
  jumlahKemasan: integer("jumlah_kemasan"),
  qtyPcs: integer("qty_pcs"), // barang jadi: jumlah × isi
  total: integer("total").notNull(),
  sumber: text("sumber", { enum: ["kantong", "pribadi"] }).notNull(),
  catatan: text("catatan"),
});

export const kas = sqliteTable("kas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktu: integer("waktu").notNull(),
  jenis: text("jenis", { enum: ["setor", "tarik"] }).notNull(),
  nominal: integer("nominal").notNull(),
  catatan: text("catatan"),
});

// Baris pertama (periode ke-0) adalah setup awal.
export const tutupBuku = sqliteTable("tutup_buku", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktu: integer("waktu").notNull(),
  saldoKantong: integer("saldo_kantong").notNull(),
  cashBelumDisetor: integer("cash_belum_disetor").notNull().default(0),
  // { [menuId]: { sisa, avgModal } } untuk barang jadi; sisa = input, avgModal = hasil hitung (berantai)
  stokJson: text("stok_json").notNull().default("{}"),
  hasilJson: text("hasil_json"),
});

export type Belanja = typeof belanja.$inferSelect;
export type Kas = typeof kas.$inferSelect;
export type TapEvent = typeof tapEvent.$inferSelect;
export type TutupBuku = typeof tutupBuku.$inferSelect;
export type Harga = typeof harga.$inferSelect;
export type Menu = typeof menu.$inferSelect;
export type Bahan = typeof bahan.$inferSelect;
