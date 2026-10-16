import { blob, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  // Katalog publik /pesan (CR-005)
  diKatalog: integer("di_katalog", { mode: "boolean" }).notNull().default(false),
  habis: integer("habis", { mode: "boolean" }).notNull().default(false),
  bisaLessSugar: integer("bisa_less_sugar", { mode: "boolean" }).notNull().default(false),
  // Foto WebP/JPEG mentah (bukan base64), disajikan lewat /pesan/foto/[id]?v=foto_versi.
  // Jangan ikut di-select di query biasa (lihat getMenu di lib/data.ts).
  foto: blob("foto", { mode: "buffer" }),
  fotoVersi: integer("foto_versi"), // waktu foto terakhir diganti; null = tanpa foto
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
  // Tap otomatis dari pesanan online yang lunas (CR-005); null = tap biasa
  pesananId: integer("pesanan_id"),
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
  // Saldo payment gateway (kantong kedua, pesan online CR-005). Sudah bersih dari potongan gateway.
  saldoGateway: integer("saldo_gateway").notNull().default(0),
  // { [menuId]: { sisa, avgModal } } untuk barang jadi; sisa = input, avgModal = hasil hitung (berantai)
  stokJson: text("stok_json").notNull().default("{}"),
  hasilJson: text("hasil_json"),
  // Tanggal WIB yang dicentang buka, mis. ["2026-10-11","2026-10-13"]. NULL = periode lama (pakai hariBukaBawaan).
  hariBukaJson: text("hari_buka_json"),
});

// Pesanan online dari katalog /pesan (CR-005 Tahap 3).
// Alur status: menunggu_bayar → lunas → diterima → dibuat → siap (pickup) / diantar (delivery).
// menunggu_bayar bisa jadi kedaluwarsa (15 menit) atau batal. Lunas = `dibayar` terisi (ditentukan gateway).
export const STATUS_PESANAN = ["menunggu_bayar", "lunas", "diterima", "dibuat", "siap", "diantar", "kedaluwarsa", "batal"] as const;
export type StatusPesanan = (typeof STATUS_PESANAN)[number];

export const pesanan = sqliteTable("pesanan", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kode: text("kode").notNull().unique(), // acak, untuk link /pesan/[kode]
  nomor: integer("nomor"), // antrean, mulai 1 tiap hari WIB; diberikan saat lunas
  nama: text("nama").notNull(),
  cara: text("cara", { enum: ["pickup", "delivery"] }).notNull(),
  catatan: text("catatan"),
  status: text("status", { enum: STATUS_PESANAN }).notNull(),
  total: integer("total").notNull(),
  potongan: integer("potongan").notNull().default(0), // potongan gateway (biaya), diisi saat lunas
  metode: text("metode"), // mis. "qris", "gopay" (dari gateway)
  gateway: text("gateway").notNull(), // "palsu" | "midtrans"
  gatewayRef: text("gateway_ref"),
  perangkat: text("perangkat").notNull(), // id acak dari cookie pembeli
  dibuat: integer("dibuat").notNull(),
  kedaluwarsaPada: integer("kedaluwarsa_pada").notNull(),
  dibayar: integer("dibayar"),
  diperbarui: integer("diperbarui").notNull(), // waktu status terakhir berubah
  refundDari: text("refund_dari", { enum: ["kantong", "pribadi"] }), // batal setelah lunas (Tahap 3b)
});

export const pesananItem = sqliteTable("pesanan_item", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pesananId: integer("pesanan_id").notNull(),
  menuId: integer("menu_id").notNull(),
  nama: text("nama").notNull(), // nama menu saat pesan
  qty: integer("qty").notNull(),
  harga: integer("harga").notNull(), // harga satuan saat pesan
  lessSugar: integer("less_sugar", { mode: "boolean" }).notNull().default(false),
});

// Langganan web push (HP pengguna yang mengaktifkan notifikasi pesanan, CR-005 Tahap 4). Bisa lebih dari satu.
export const pushLangganan = sqliteTable("push_langganan", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  perangkat: text("perangkat"), // keterangan singkat dari user agent
  dibuat: integer("dibuat").notNull(),
});

export type Pesanan = typeof pesanan.$inferSelect;
export type PesananItem = typeof pesananItem.$inferSelect;
export type Belanja = typeof belanja.$inferSelect;
export type Kas = typeof kas.$inferSelect;
export type TapEvent = typeof tapEvent.$inferSelect;
export type TutupBuku = typeof tutupBuku.$inferSelect;
export type Harga = typeof harga.$inferSelect;
export type Menu = typeof menu.$inferSelect;
export type Bahan = typeof bahan.$inferSelect;
