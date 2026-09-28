import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Semua nominal dalam integer rupiah. Semua waktu dalam epoch milidetik (UTC).

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const harga = sqliteTable("harga", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  produk: text("produk", { enum: ["bb", "kopi"] }).notNull(),
  jenis: text("jenis", { enum: ["jual", "hpp"] }).notNull(),
  nilai: integer("nilai").notNull(),
  berlakuMulai: integer("berlaku_mulai").notNull(),
});

export const tapEvent = sqliteTable("tap_event", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktu: integer("waktu").notNull(),
  jenis: text("jenis", { enum: ["kopi", "kopi_sendiri", "bb_sendiri"] }).notNull(),
  delta: integer("delta").notNull(),
  // true = diisi manual dari tab Kopi (untuk hari sebelumnya), false = tap langsung
  manual: integer("manual", { mode: "boolean" }).notNull().default(false),
});

export const belanja = sqliteTable("belanja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktu: integer("waktu").notNull(),
  kategori: text("kategori", { enum: ["bb", "kopi", "lain"] }).notNull(),
  nama: text("nama").notNull(),
  qtyPcs: integer("qty_pcs"),
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

// Baris pertama (periode ke-0) adalah setup awal: saldo awal, stok awal, modal awal per pcs.
export const tutupBuku = sqliteTable("tutup_buku", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktu: integer("waktu").notNull(),
  saldoKantong: integer("saldo_kantong").notNull(),
  sisaBb: integer("sisa_bb").notNull(),
  cashBelumDisetor: integer("cash_belum_disetor").notNull().default(0),
  avgModalBb: real("avg_modal_bb").notNull(),
  hasilJson: text("hasil_json"),
});

export type Belanja = typeof belanja.$inferSelect;
export type Kas = typeof kas.$inferSelect;
export type TapEvent = typeof tapEvent.$inferSelect;
export type TutupBuku = typeof tutupBuku.$inferSelect;
export type Harga = typeof harga.$inferSelect;
