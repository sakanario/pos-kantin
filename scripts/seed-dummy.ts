// Membuat dummy.db berisi simulasi ±2 bulan jualan, untuk mencoba aplikasi.
// Jalankan: npm run seed:dummy   lalu   npm run dev:dummy
// PIN login data dummy: 1234 (khusus dummy.db)
//
// Simulasi (deterministik, hasil selalu sama):
// - Setup Senin 27 Jul 2026 07:00 WIB, tutup buku tiap Senin 07:00 WIB sampai hari ini
// - Jualan Senin–Jumat 08:00–15:00; pembayaran QRIS / transfer / cash
// - QRIS kena potongan 0,3% dan baru masuk kantong jam 22:00 jika saldo GoPay > Rp 10.000
// - Cash disetor ke kantong setiap tutup buku
// - Sesekali ada pembeli yang tidak membayar (muncul sebagai selisih)
// - Restock otomatis saat stok menipis; harga kopi naik ke Rp 12.000 mulai 1 Sep
// - Beberapa hari penjualan kopi diisi manual (seolah lupa tap)

import { rmSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema.ts";
import { hitungPeriode, type HargaRow } from "../src/lib/calc.ts";

const FILE = "dummy.db";
const PIN = "1234";
const WIB = 7 * 3600_000;
const JAM = 3600_000;
const HARI = 24 * JAM;

// ─── Util ─────────────────────────────────────────────────────────
let seed = 20260727;
function rand() {
  // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const antara = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const wib = (iso: string, jam = 0, menit = 0) => Date.parse(`${iso}T00:00:00Z`) - WIB + jam * JAM + menit * 60_000;
const isoWib = (ms: number) => new Date(ms + WIB).toISOString().slice(0, 10);
const hariKe = (ms: number) => new Date(ms + WIB).getUTCDay(); // 0 = Minggu

// ─── Setup DB ─────────────────────────────────────────────────────
for (const f of [FILE, `${FILE}-journal`, `${FILE}-wal`, `${FILE}-shm`]) rmSync(f, { force: true });
const client = createClient({ url: `file:${FILE}` });
const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: "drizzle" });

const SETUP = wib("2026-07-27", 7);
const SEKARANG = Date.now();
const NAIK_HARGA = wib("2026-09-01", 7);

const harga: HargaRow[] = [
  { produk: "bb", jenis: "jual", nilai: 3000, berlakuMulai: 0 },
  { produk: "kopi", jenis: "jual", nilai: 10000, berlakuMulai: 0 },
  { produk: "kopi", jenis: "hpp", nilai: 6428, berlakuMulai: 0 },
  { produk: "kopi", jenis: "jual", nilai: 12000, berlakuMulai: NAIK_HARGA },
];
const hargaKopi = (t: number) => (t >= NAIK_HARGA ? 12000 : 10000);

// ─── State simulasi ───────────────────────────────────────────────
let kantong = 0; // saldo Kantong Kantin (Jago)
let gopay = 0; // QRIS yang belum dicairkan
let kotak = 0; // cash di kotak
let bb = 0; // stok Beng Beng (pcs)
const bahan = { susu: 0, kopi: 0, gula: 0, cup: 0 }; // ml, gr, ml, pcs
const RESEP = { susu: 180, kopi: 3, gula: 10, cup: 1 };

type Belanja = typeof schema.belanja.$inferInsert;
type Tap = typeof schema.tapEvent.$inferInsert;
type Kas = typeof schema.kas.$inferInsert;
type Tutup = typeof schema.tutupBuku.$inferInsert;
const belanjaRows: Belanja[] = [];
const tapRows: Tap[] = [];
const kasRows: Kas[] = [];
const tutupRows: Tutup[] = [];

function beli(waktu: number, row: Omit<Belanja, "waktu" | "sumber">, pakaiPribadi = false) {
  const sumber = pakaiPribadi || kantong < row.total ? "pribadi" : "kantong";
  if (sumber === "kantong") kantong -= row.total;
  belanjaRows.push({ ...row, waktu, sumber });
}

function restock(waktu: number, pribadi = false) {
  if (bb < 10) {
    const dus = 2;
    const perDus = [36500, 36500, 37000, 37500, 38000][antara(0, 4)];
    beli(waktu, { kategori: "bb", nama: `Beng Beng ${dus} dus`, qtyPcs: dus * 17, total: dus * perDus }, pribadi);
    bb += dus * 17;
  }
  if (bahan.susu < RESEP.susu * 8) {
    beli(waktu + 60_000, { kategori: "kopi", nama: "Susu 1L × 2", total: 40000 }, pribadi);
    bahan.susu += 2000;
  }
  if (bahan.kopi < RESEP.kopi * 8) {
    beli(waktu + 120_000, { kategori: "kopi", nama: "Nescafe Ice Roast 10×2gr", total: 14000 }, pribadi);
    bahan.kopi += 20;
  }
  if (bahan.gula < RESEP.gula * 8) {
    beli(waktu + 180_000, { kategori: "kopi", nama: "Gula aren cair 250 ml", total: 18199 }, pribadi);
    bahan.gula += 250;
  }
  if (bahan.cup < 10) {
    beli(waktu + 240_000, { kategori: "kopi", nama: "Cup 16 oz 100 pcs", total: 58762 }, pribadi);
    bahan.cup += 100;
  }
}

function pakaiBahan() {
  for (const k of Object.keys(RESEP) as (keyof typeof RESEP)[]) bahan[k] -= RESEP[k];
}

function terimaBayar(nominal: number) {
  const r = rand();
  if (r < 0.015) return; // tidak bayar
  if (r < 0.58) gopay += Math.round(nominal * 0.997); // QRIS, potongan 0,3%
  else if (r < 0.78) kantong += nominal; // transfer
  else kotak += nominal; // cash
}

// ─── Setup awal + modal awal ─────────────────────────────────────
tutupRows.push({ waktu: SETUP, saldoKantong: 0, sisaBb: 0, cashBelumDisetor: 0, avgModalBb: 0, hasilJson: null });
restock(SETUP + 20 * 60_000, true); // belanja perdana pakai uang pribadi
kasRows.push({ waktu: SETUP + 60 * 60_000, jenis: "setor", nominal: 200000, catatan: "Modal awal" });
kantong += 200000;

const hariManual = new Set(["2026-08-12", "2026-08-27", "2026-09-16"]); // lupa tap, diisi manual belakangan

// ─── Simulasi per hari ────────────────────────────────────────────
for (let hari = wib(isoWib(SETUP)); hari < SEKARANG; hari += HARI) {
  const iso = isoWib(hari);

  // Tutup buku Senin 07:00 (kecuali hari setup)
  const tutup = hari + 7 * JAM;
  if (hariKe(hari) === 1 && tutup > SETUP && tutup <= SEKARANG) {
    kantong += kotak; // cash disetor lewat transfer
    kotak = 0;
    tutupRows.push({ waktu: tutup, saldoKantong: kantong, sisaBb: bb, cashBelumDisetor: 0, avgModalBb: 0, hasilJson: null });
  }

  // Tarik untung di awal September
  if (iso === "2026-09-01") {
    kasRows.push({ waktu: wib(iso, 8), jenis: "tarik", nominal: 150000, catatan: "Ambil untung Agustus" });
    kantong -= 150000;
  }

  const hariJualan = hariKe(hari) >= 1 && hariKe(hari) <= 5;
  if (hariJualan) {
    restock(wib(iso, 7, 30));
    const manual = hariManual.has(iso);
    let kopiManual = 0;
    const nKopi = antara(4, 14);
    const nBb = antara(3, 10);
    const penjualan = [
      ...Array.from({ length: nKopi }, () => "kopi" as const),
      ...Array.from({ length: nBb }, () => "bb" as const),
    ].map((jenis) => ({ jenis, waktu: wib(iso, 8) + Math.floor(rand() * 7 * JAM) }));
    penjualan.sort((a, b) => a.waktu - b.waktu);

    for (const p of penjualan) {
      if (p.waktu > SEKARANG) continue;
      if (p.jenis === "kopi") {
        if (bahan.cup < 1 || bahan.susu < RESEP.susu) continue; // bahan habis
        pakaiBahan();
        terimaBayar(hargaKopi(p.waktu));
        if (manual) kopiManual++;
        else tapRows.push({ waktu: p.waktu, jenis: "kopi", delta: 1, manual: false });
      } else {
        if (bb < 1) continue;
        bb--;
        terimaBayar(3000); // Beng Beng tidak di-tap; terjual dihitung dari sisa stok
      }
    }
    if (manual && kopiManual > 0) {
      tapRows.push({ waktu: wib(iso, 12), jenis: "kopi", delta: kopiManual, manual: true });
    }

    // Konsumsi pribadi
    if (rand() < 0.3 && bahan.cup > 0 && wib(iso, 15, 30) <= SEKARANG) {
      pakaiBahan();
      tapRows.push({ waktu: wib(iso, 15, 30), jenis: "kopi_sendiri", delta: 1, manual: false });
    }
    if (rand() < 0.15 && bb > 0 && wib(iso, 15, 45) <= SEKARANG) {
      bb--;
      tapRows.push({ waktu: wib(iso, 15, 45), jenis: "bb_sendiri", delta: 1, manual: false });
    }
  }

  // Pencairan GoPay jam 22:00
  if (wib(iso, 22) <= SEKARANG && gopay > 10000) {
    kantong += gopay;
    gopay = 0;
  }
}

// ─── Hitung hasil tiap tutup buku (sama seperti aplikasi) ────────
for (let i = 1; i < tutupRows.length; i++) {
  const prev = tutupRows[i - 1];
  const row = tutupRows[i];
  const dari = i === 1 ? 0 : prev.waktu; // periode pertama mencakup catatan sebelum setup
  const dalam = <T extends { waktu: number }>(xs: T[]) => xs.filter((x) => x.waktu > dari && x.waktu <= row.waktu);
  const hasil = hitungPeriode(
    {
      saldoKantong: prev.saldoKantong,
      sisaBb: prev.sisaBb,
      cashBelumDisetor: prev.cashBelumDisetor ?? 0,
      avgModalBb: prev.avgModalBb,
    },
    { waktu: row.waktu, saldoKantong: row.saldoKantong, sisaBb: row.sisaBb, cashBelumDisetor: row.cashBelumDisetor ?? 0 },
    {
      belanja: dalam(belanjaRows).map((b) => ({
        kategori: b.kategori,
        qtyPcs: b.qtyPcs ?? null,
        total: b.total,
        sumber: b.sumber,
      })),
      kas: dalam(kasRows).map((k) => ({ jenis: k.jenis, nominal: k.nominal })),
      taps: dalam(tapRows).map((t) => ({ jenis: t.jenis, delta: t.delta, waktu: t.waktu })),
      harga,
    },
  );
  row.avgModalBb = hasil.avgModalBb;
  row.hasilJson = JSON.stringify(hasil);
}

// ─── Simpan ───────────────────────────────────────────────────────
await db.insert(schema.settings).values([
  { key: "pin_hash", value: await bcrypt.hash(PIN, 10) },
  { key: "isi_per_dus", value: "17" },
  { key: "setup_done", value: "1" },
]);
await db.insert(schema.harga).values(harga);
await db.insert(schema.tutupBuku).values(tutupRows);
await db.insert(schema.belanja).values(belanjaRows);
await db.insert(schema.kas).values(kasRows);
for (let i = 0; i < tapRows.length; i += 200) await db.insert(schema.tapEvent).values(tapRows.slice(i, i + 200));

// ─── Ringkasan ────────────────────────────────────────────────────
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
console.log(`✓ ${FILE} dibuat`);
console.log(`  ${tutupRows.length - 1} tutup buku, ${belanjaRows.length} belanja, ${kasRows.length} kas, ${tapRows.length} tap`);
let totalUntung = 0;
let totalUang = 0;
for (const r of tutupRows.slice(1)) {
  const h = JSON.parse(r.hasilJson!);
  totalUntung += h.untungJualan;
  totalUang += h.uangBersih;
  console.log(
    `  ${isoWib(r.waktu)}  kopi ${String(h.kopiTerjual).padStart(3)}  bb ${String(h.bbTerjual).padStart(3)}  untung ${rp(h.untungJualan).padStart(12)}  uang bersih ${rp(h.uangBersih).padStart(12)}  selisih ${rp(h.selisih).padStart(10)}`,
  );
}
console.log(`  Total untung jualan: ${rp(totalUntung)}, total uang bersih (posisi BEP): ${rp(totalUang)}`);
console.log(`  Posisi sekarang: kantong ${rp(kantong)}, GoPay belum cair ${rp(gopay)}, cash di kotak ${rp(kotak)}, stok BB ${bb}`);
console.log(`  Login PIN: ${PIN}`);
