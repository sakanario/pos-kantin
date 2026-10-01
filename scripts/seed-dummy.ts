// Membuat dummy.db berisi simulasi ±2 bulan jualan, untuk mencoba aplikasi.
// Jalankan: npm run seed:dummy   lalu   npm run dev:dummy
// PIN login data dummy: 1234 (khusus dummy.db)
//
// Simulasi (deterministik, hasil selalu sama):
// - Setup Senin 27 Jul 2026 07:00 WIB, tutup buku tiap Senin 07:00 WIB sampai hari ini
// - Menu: Kopi Susu Gula Aren & Kopi Susu SKM (racikan, dari resep), Beng Beng (barang jadi)
// - Jualan Senin–Jumat 08:00–15:00; pembayaran QRIS / transfer / cash
// - QRIS kena potongan 0,3% dan baru masuk kantong jam 22:00 jika saldo GoPay > Rp 10.000
// - Cash disetor ke kantong setiap tutup buku
// - Sesekali ada pembeli yang tidak membayar (muncul sebagai selisih)
// - Restock saat stok menipis; kemasan baru baru dipakai ("Pakai ini") setelah kemasan lama habis
// - Harga Kopi Susu Gula Aren naik ke Rp 12.000 mulai 1 Sep
// - Beberapa hari penjualan diisi manual (seolah lupa tap)

import { rmSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema.ts";
import { hitungPeriode, type HargaRow, type HppCtx, type MenuDef, type Stok } from "../src/lib/calc.ts";

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

// ─── Menu, bahan, resep ───────────────────────────────────────────
const AREN = 1;
const SKM = 2;
const BB = 3;
const menu: MenuDef[] = [
  { id: AREN, nama: "Kopi Susu Gula Aren", jenis: "racikan", aktif: true, urutan: 1 },
  { id: SKM, nama: "Kopi Susu SKM", jenis: "racikan", aktif: true, urutan: 2 },
  { id: BB, nama: "Beng Beng", jenis: "barang_jadi", aktif: true, urutan: 3 },
];
const harga: HargaRow[] = [
  { menuId: AREN, nilai: 10000, berlakuMulai: 0 },
  { menuId: SKM, nilai: 10000, berlakuMulai: 0 },
  { menuId: BB, nilai: 3000, berlakuMulai: 0 },
  { menuId: AREN, nilai: 12000, berlakuMulai: NAIK_HARGA },
];
const hargaJual = (menuId: number, t: number) => (menuId === AREN && t >= NAIK_HARGA ? 12000 : 10000);

type BahanKey = "susu" | "kopi" | "aren" | "skm" | "cup";
// id, nama, satuan, harga awal, kemasan yang dibeli
const BAHAN: Record<BahanKey, { id: number; nama: string; satuan: "gr" | "pcs"; hargaAwal: number; beli: { nama: string; isi: number; jumlah: number; total: number } }> = {
  susu: { id: 1, nama: "Susu", satuan: "gr", hargaAwal: 20, beli: { nama: "Susu 1L", isi: 1030, jumlah: 2, total: 40000 } },
  kopi: { id: 2, nama: "Kopi", satuan: "gr", hargaAwal: 700, beli: { nama: "Nescafe Ice Roast 10×2gr", isi: 20, jumlah: 1, total: 14000 } },
  aren: { id: 3, nama: "Gula aren", satuan: "gr", hargaAwal: 56, beli: { nama: "Gula aren cair 250 ml", isi: 325, jumlah: 1, total: 18199 } },
  skm: { id: 4, nama: "SKM", satuan: "gr", hargaAwal: 37, beli: { nama: "SKM Indomilk 535 gr", isi: 535, jumlah: 1, total: 20000 } },
  cup: { id: 5, nama: "Cup 16oz", satuan: "pcs", hargaAwal: 600, beli: { nama: "Cup 16 oz 100 pcs", isi: 100, jumlah: 1, total: 58762 } },
};
const RESEP: Record<number, Partial<Record<BahanKey, number>>> = {
  [AREN]: { susu: 150, kopi: 3, aren: 20, cup: 1 },
  [SKM]: { susu: 150, kopi: 3, skm: 25, cup: 1 },
};

// ─── State simulasi ───────────────────────────────────────────────
let kantong = 0; // saldo Kantong Kantin (Jago)
let gopay = 0; // QRIS yang belum dicairkan
let kotak = 0; // cash di kotak
let bb = 0; // stok Beng Beng (pcs)
// Kemasan per bahan: antrean pembelian; indeks 0 = yang sedang dipakai
const kemasan: Record<BahanKey, { belanjaId: number; sisa: number }[]> = { susu: [], kopi: [], aren: [], skm: [], cup: [] };

type Belanja = typeof schema.belanja.$inferInsert & { id: number };
type Tap = typeof schema.tapEvent.$inferInsert;
type Kas = typeof schema.kas.$inferInsert;
type Tutup = typeof schema.tutupBuku.$inferInsert;
type Aktif = typeof schema.bahanAktif.$inferInsert;
const belanjaRows: Belanja[] = [];
const tapRows: Tap[] = [];
const kasRows: Kas[] = [];
const tutupRows: Tutup[] = [];
const aktifRows: Aktif[] = [];

function bayar(total: number, pakaiPribadi: boolean): "kantong" | "pribadi" {
  const sumber = pakaiPribadi || kantong < total ? "pribadi" : "kantong";
  if (sumber === "kantong") kantong -= total;
  return sumber;
}

function beliBahan(waktu: number, k: BahanKey, pribadi = false) {
  const b = BAHAN[k];
  const id = belanjaRows.length + 1;
  belanjaRows.push({
    id,
    waktu,
    kategori: "bahan",
    nama: b.beli.nama,
    bahanId: b.id,
    isiKemasan: b.beli.isi,
    jumlahKemasan: b.beli.jumlah,
    total: b.beli.total,
    sumber: bayar(b.beli.total, pribadi),
  });
  // Pembelian pertama langsung aktif sejak awal
  if (kemasan[k].length === 0 && !aktifRows.some((a) => a.bahanId === b.id)) aktifRows.push({ bahanId: b.id, belanjaId: id, mulai: 0 });
  kemasan[k].push({ belanjaId: id, sisa: b.beli.isi * b.beli.jumlah });
}

const stokBahan = (k: BahanKey) => kemasan[k].reduce((a, x) => a + x.sisa, 0);

function restock(waktu: number, pribadi = false) {
  if (bb < 10) {
    const dus = 2;
    const perDus = [36500, 36500, 37000, 37500, 38000][antara(0, 4)];
    const id = belanjaRows.length + 1;
    belanjaRows.push({
      id,
      waktu,
      kategori: "barang",
      nama: `Beng Beng ${dus} dus`,
      menuId: BB,
      isiKemasan: 17,
      jumlahKemasan: dus,
      qtyPcs: dus * 17,
      total: dus * perDus,
      sumber: bayar(dus * perDus, pribadi),
    });
    bb += dus * 17;
  }
  const batas: Record<BahanKey, number> = { susu: 150 * 8, kopi: 3 * 8, aren: 20 * 8, skm: 25 * 8, cup: 10 };
  (Object.keys(BAHAN) as BahanKey[]).forEach((k, i) => {
    if (stokBahan(k) < batas[k]) beliBahan(waktu + (i + 1) * 60_000, k, pribadi);
  });
}

/** Pakai bahan untuk satu cup; kalau kemasan habis, kemasan berikutnya mulai dipakai ("Pakai ini"). */
function pakaiBahan(menuId: number, waktu: number): boolean {
  const resep = RESEP[menuId];
  for (const [k, t] of Object.entries(resep) as [BahanKey, number][]) if (stokBahan(k) < t) return false;
  for (const [k, t] of Object.entries(resep) as [BahanKey, number][]) {
    let perlu = t;
    while (perlu > 0) {
      const cur = kemasan[k][0];
      const ambil = Math.min(perlu, cur.sisa);
      cur.sisa -= ambil;
      perlu -= ambil;
      if (cur.sisa <= 0) {
        kemasan[k].shift();
        const next = kemasan[k][0];
        if (next) aktifRows.push({ bahanId: BAHAN[k].id, belanjaId: next.belanjaId, mulai: waktu });
      }
    }
  }
  return true;
}

function terimaBayar(nominal: number) {
  const r = rand();
  if (r < 0.015) return; // tidak bayar
  if (r < 0.58) gopay += Math.round(nominal * 0.997); // QRIS, potongan 0,3%
  else if (r < 0.78) kantong += nominal; // transfer
  else kotak += nominal; // cash
}

const pilihRacikan = () => (rand() < 0.6 ? AREN : SKM);

// ─── Setup awal + modal awal ─────────────────────────────────────
tutupRows.push({ waktu: SETUP, saldoKantong: 0, cashBelumDisetor: 0, stokJson: "{}", hasilJson: null });
restock(SETUP + 20 * 60_000, true); // belanja perdana pakai uang pribadi
kasRows.push({ waktu: SETUP + 60 * 60_000, jenis: "setor", nominal: 200000, catatan: "Modal awal" });
kantong += 200000;

const hariManual = new Set(["2026-08-12", "2026-08-27", "2026-09-16"]); // lupa tap, diisi manual belakangan
const sisaBbTutup = new Map<number, number>();

// ─── Simulasi per hari ────────────────────────────────────────────
for (let hari = wib(isoWib(SETUP)); hari < SEKARANG; hari += HARI) {
  const iso = isoWib(hari);

  // Tutup buku Senin 07:00 (kecuali hari setup)
  const tutup = hari + 7 * JAM;
  if (hariKe(hari) === 1 && tutup > SETUP && tutup <= SEKARANG) {
    kantong += kotak; // cash disetor lewat transfer
    kotak = 0;
    sisaBbTutup.set(tutupRows.length, bb);
    tutupRows.push({ waktu: tutup, saldoKantong: kantong, cashBelumDisetor: 0, stokJson: "{}", hasilJson: null });
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
    const manualPerMenu = new Map<number, number>();
    const nKopi = antara(4, 14);
    const nBb = antara(3, 10);
    const penjualan = [
      ...Array.from({ length: nKopi }, () => pilihRacikan()),
      ...Array.from({ length: nBb }, () => BB),
    ].map((menuId) => ({ menuId, waktu: wib(iso, 8) + Math.floor(rand() * 7 * JAM) }));
    penjualan.sort((a, b) => a.waktu - b.waktu);

    for (const p of penjualan) {
      if (p.waktu > SEKARANG) continue;
      if (p.menuId !== BB) {
        if (!pakaiBahan(p.menuId, p.waktu)) continue; // bahan habis
        terimaBayar(hargaJual(p.menuId, p.waktu));
        if (manual) manualPerMenu.set(p.menuId, (manualPerMenu.get(p.menuId) ?? 0) + 1);
        else tapRows.push({ waktu: p.waktu, menuId: p.menuId, jenis: "terjual", delta: 1, manual: false });
      } else {
        if (bb < 1) continue;
        bb--;
        terimaBayar(3000); // Beng Beng tidak di-tap; terjual dihitung dari sisa stok
      }
    }
    for (const [menuId, n] of manualPerMenu) {
      tapRows.push({ waktu: wib(iso, 12), menuId, jenis: "terjual", delta: n, manual: true });
    }

    // Konsumsi pribadi
    const waktuSendiri = wib(iso, 15, 30);
    const racikanSendiri = pilihRacikan();
    if (rand() < 0.3 && waktuSendiri <= SEKARANG && pakaiBahan(racikanSendiri, waktuSendiri)) {
      tapRows.push({ waktu: waktuSendiri, menuId: racikanSendiri, jenis: "sendiri", delta: 1, manual: false });
    }
    if (rand() < 0.15 && bb > 0 && wib(iso, 15, 45) <= SEKARANG) {
      bb--;
      tapRows.push({ waktu: wib(iso, 15, 45), menuId: BB, jenis: "sendiri", delta: 1, manual: false });
    }
  }

  // Pencairan GoPay jam 22:00
  if (wib(iso, 22) <= SEKARANG && gopay > 10000) {
    kantong += gopay;
    gopay = 0;
  }
}

// ─── Hitung hasil tiap tutup buku (sama seperti aplikasi) ────────
const hpp: HppCtx = {
  bahan: Object.values(BAHAN).map((b) => ({ id: b.id, hargaAwal: b.hargaAwal })),
  resep: Object.entries(RESEP).map(([menuId, r]) => ({
    menuId: Number(menuId),
    berlakuMulai: 0,
    isi: (Object.entries(r) as [BahanKey, number][]).map(([k, takaran]) => ({ bahanId: BAHAN[k].id, takaran })),
  })),
  aktif: aktifRows.map((a) => ({ bahanId: a.bahanId, belanjaId: a.belanjaId ?? null, mulai: a.mulai })),
  belanja: belanjaRows
    .filter((b) => b.kategori === "bahan")
    .map((b) => ({ id: b.id, total: b.total, isiKemasan: b.isiKemasan ?? null, jumlahKemasan: b.jumlahKemasan ?? null })),
};
let stok: Stok = {};
for (let i = 1; i < tutupRows.length; i++) {
  const prev = tutupRows[i - 1];
  const row = tutupRows[i];
  const dari = i === 1 ? 0 : prev.waktu; // periode pertama mencakup catatan sebelum setup
  const dalam = <T extends { waktu: number }>(xs: T[]) => xs.filter((x) => x.waktu > dari && x.waktu <= row.waktu);
  const hasil = hitungPeriode(
    { saldoKantong: prev.saldoKantong, cashBelumDisetor: prev.cashBelumDisetor ?? 0, stok },
    { waktu: row.waktu, saldoKantong: row.saldoKantong, cashBelumDisetor: row.cashBelumDisetor ?? 0, sisa: { [BB]: sisaBbTutup.get(i)! } },
    {
      belanja: dalam(belanjaRows).map((b) => ({
        kategori: b.kategori,
        menuId: b.menuId ?? null,
        qtyPcs: b.qtyPcs ?? null,
        total: b.total,
        sumber: b.sumber,
      })),
      kas: dalam(kasRows).map((k) => ({ jenis: k.jenis, nominal: k.nominal })),
      taps: dalam(tapRows).map((t) => ({ menuId: t.menuId, jenis: t.jenis, delta: t.delta, waktu: t.waktu })),
      harga,
      menu,
      hpp,
    },
  );
  stok = hasil.stok;
  row.stokJson = JSON.stringify(hasil.stok);
  row.hasilJson = JSON.stringify(hasil);
}

// ─── Simpan ───────────────────────────────────────────────────────
await db.insert(schema.settings).values([
  { key: "pin_hash", value: await bcrypt.hash(PIN, 10) },
  { key: "setup_done", value: "1" },
]);
await db.insert(schema.menu).values(menu);
await db.insert(schema.harga).values(harga);
await db.insert(schema.bahan).values(Object.values(BAHAN).map((b) => ({ id: b.id, nama: b.nama, satuan: b.satuan, hargaAwal: b.hargaAwal })));
await db.insert(schema.resep).values(hpp.resep.map((r) => ({ menuId: r.menuId, berlakuMulai: r.berlakuMulai, isiJson: JSON.stringify(r.isi) })));
await db.insert(schema.tutupBuku).values(tutupRows);
await db.insert(schema.belanja).values(belanjaRows);
await db.insert(schema.bahanAktif).values(aktifRows);
await db.insert(schema.kas).values(kasRows);
for (let i = 0; i < tapRows.length; i += 200) await db.insert(schema.tapEvent).values(tapRows.slice(i, i + 200));

// ─── Ringkasan ────────────────────────────────────────────────────
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
console.log(`✓ ${FILE} dibuat`);
console.log(
  `  ${tutupRows.length - 1} tutup buku, ${belanjaRows.length} belanja, ${aktifRows.length} ganti kemasan, ${kasRows.length} kas, ${tapRows.length} tap`,
);
let totalUntung = 0;
let totalUang = 0;
for (const r of tutupRows.slice(1)) {
  const h = JSON.parse(r.hasilJson!);
  totalUntung += h.untungJualan;
  totalUang += h.uangBersih;
  const terjual = (h.menu as { nama: string; terjual: number }[]).map((m) => `${m.nama.split(" ").at(-1)} ${String(m.terjual).padStart(3)}`).join("  ");
  console.log(
    `  ${isoWib(r.waktu)}  ${terjual}  untung ${rp(h.untungJualan).padStart(11)}  uang bersih ${rp(h.uangBersih).padStart(11)}  selisih ${rp(h.selisih).padStart(10)}`,
  );
}
console.log(`  Total untung jualan: ${rp(totalUntung)}, total uang bersih (posisi BEP): ${rp(totalUang)}`);
console.log(`  Posisi sekarang: kantong ${rp(kantong)}, GoPay belum cair ${rp(gopay)}, cash di kotak ${rp(kotak)}, stok BB ${bb}`);
console.log(`  Login PIN: ${PIN}`);
