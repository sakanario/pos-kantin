import "server-only";
import { and, asc, desc, eq, gt, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { belanja, harga, kas, tapEvent, tutupBuku, type TutupBuku } from "@/db/schema";
import { hargaPada, hitungBep, untungDariTap, type HargaRow, type HasilPeriode, type PeriodeData } from "./calc";
import { awalHariWib, bulanWib, isoTanggalWib } from "./format";

export async function getTutupTerakhir(): Promise<TutupBuku | undefined> {
  return db.query.tutupBuku.findFirst({ orderBy: [desc(tutupBuku.waktu), desc(tutupBuku.id)] });
}

export async function getSemuaHarga(): Promise<HargaRow[]> {
  return db.select().from(harga).orderBy(asc(harga.berlakuMulai));
}

export async function getHargaAktif() {
  const h = await getSemuaHarga();
  const now = Date.now();
  return {
    jualBb: hargaPada(h, "bb", "jual", now),
    jualKopi: hargaPada(h, "kopi", "jual", now),
    hppKopi: hargaPada(h, "kopi", "hpp", now),
  };
}

/**
 * Batas awal data sebuah periode. Periode pertama (sesudah setup) juga mencakup
 * catatan bertanggal sebelum setup, jadi batasnya 0, bukan waktu setup.
 */
export function awalData(tutupSebelumnya: { waktu: number; hasilJson: string | null }): number {
  return tutupSebelumnya.hasilJson === null ? 0 : tutupSebelumnya.waktu;
}

/** Semua catatan dengan waktu di (dari, sampai]. */
export async function getDataPeriode(dari: number, sampai: number) {
  const rentang = <T extends typeof belanja | typeof kas | typeof tapEvent>(t: T) =>
    and(gt(t.waktu, dari), lte(t.waktu, sampai));
  const [b, k, t, h] = await Promise.all([
    db.select().from(belanja).where(rentang(belanja)).orderBy(desc(belanja.waktu)),
    db.select().from(kas).where(rentang(kas)).orderBy(desc(kas.waktu)),
    db.select().from(tapEvent).where(rentang(tapEvent)).orderBy(asc(tapEvent.waktu)),
    getSemuaHarga(),
  ]);
  return { belanja: b, kas: k, taps: t, harga: h } satisfies PeriodeData;
}

/** Ringkasan periode yang sedang berjalan (sejak tutup buku terakhir sampai sekarang). */
export async function getPeriodeBerjalan() {
  const terakhir = await getTutupTerakhir();
  if (!terakhir) return null;
  const now = Date.now();
  const data = await getDataPeriode(awalData(terakhir), now);
  const awalHariIni = awalHariWib(isoTanggalWib(now));
  // Hitungan "hari ini" tidak ikut reset saat tutup buku di tengah hari
  const tapsHariIni = await db
    .select()
    .from(tapEvent)
    .where(and(gt(tapEvent.waktu, awalHariIni - 1), lte(tapEvent.waktu, now)));

  const jumlah = (taps: { jenis: string; delta: number }[], jenis: string) =>
    taps.filter((t) => t.jenis === jenis).reduce((a, t) => a + t.delta, 0);
  const hitung = (jenis: string) => jumlah(data.taps, jenis);
  const hitungHariIni = (jenis: string) => jumlah(tapsHariIni, jenis);

  const beliBb = data.belanja.filter((b) => b.kategori === "bb").reduce((a, b) => a + (b.qtyPcs ?? 0), 0);
  const bbSendiri = hitung("bb_sendiri");

  return {
    terakhir,
    data,
    hariIni: isoTanggalWib(now),
    hariSejakTutup: Math.floor((now - terakhir.waktu) / 86400000),
    kopiHariIni: hitungHariIni("kopi"),
    kopiSendiriHariIni: hitungHariIni("kopi_sendiri"),
    bbSendiriHariIni: hitungHariIni("bb_sendiri"),
    kopiPeriode: hitung("kopi"),
    kopiSendiriPeriode: hitung("kopi_sendiri"),
    bbSendiriPeriode: bbSendiri,
    beliBb,
    // Stok maksimal jika belum ada yang terjual; sisa sebenarnya diketahui saat tutup buku.
    stokBbTersedia: terakhir.sisaBb + beliBb - bbSendiri,
    belanjaPeriode: data.belanja.reduce((a, b) => a + b.total, 0),
    // Untung jualan dari tap saja; Beng Beng terjual baru diketahui saat tutup buku.
    untungHariIni: untungDariTap(tapsHariIni, data.harga, terakhir.avgModalBb),
    untungPeriode: untungDariTap(data.taps, data.harga, terakhir.avgModalBb),
  };
}

export async function getRiwayatTutupBuku() {
  const rows = await db.select().from(tutupBuku).orderBy(desc(tutupBuku.waktu), desc(tutupBuku.id));
  return rows.map((r, i) => {
    const hasil = r.hasilJson ? (JSON.parse(r.hasilJson) as HasilPeriode) : null;
    return {
      ...r,
      dari: rows[i + 1]?.waktu ?? null,
      dariData: rows[i + 1] ? awalData(rows[i + 1]) : 0,
      hasil,
      // Snapshot dari rumus lama (sebelum CR-002): perlu "Hitung ulang semua laporan" di Setelan
      basi: hasil !== null && hasil.untungJualan === undefined,
    };
  });
}

/** Jumlah kopi terjual per hari (WIB) untuk `hari` hari terakhir. */
export async function getKopiPerHari(hari: number) {
  const now = Date.now();
  const mulai = awalHariWib(isoTanggalWib(now)) - (hari - 1) * 86400000;
  const taps = await db
    .select()
    .from(tapEvent)
    .where(and(gt(tapEvent.waktu, mulai - 1), lte(tapEvent.waktu, now)));
  const perHari = new Map<string, number>();
  for (let i = 0; i < hari; i++) perHari.set(isoTanggalWib(mulai + i * 86400000), 0);
  for (const t of taps) {
    if (t.jenis !== "kopi") continue;
    const k = isoTanggalWib(t.waktu);
    perHari.set(k, (perHari.get(k) ?? 0) + t.delta);
  }
  return [...perHari.entries()].map(([tgl, jumlah]) => ({ tgl, jumlah }));
}

/** Semua belanja dalam satu bulan (WIB), terbaru dulu. `ym` = "YYYY-MM". */
export async function getBelanjaBulan(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const berikut = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const dari = awalHariWib(`${ym}-01`);
  const sampai = awalHariWib(`${berikut}-01`);
  return db
    .select()
    .from(belanja)
    .where(and(gt(belanja.waktu, dari - 1), lt(belanja.waktu, sampai)))
    .orderBy(desc(belanja.waktu), desc(belanja.id));
}

/** Waktu belanja paling awal, untuk batas navigasi bulan. */
export async function getBelanjaPertama(): Promise<number | null> {
  const row = await db.query.belanja.findFirst({ orderBy: [asc(belanja.waktu)] });
  return row?.waktu ?? null;
}

export function bulanSekarang(): string {
  return bulanWib(Date.now());
}

/** Tanggal setup & tanggal-tanggal tutup buku (WIB), untuk form tanggal. */
export async function getInfoTutup() {
  const rows = await db.select().from(tutupBuku).orderBy(asc(tutupBuku.waktu));
  return {
    setup: rows[0] ? isoTanggalWib(rows[0].waktu) : "",
    tutup: rows.slice(1).map((r) => isoTanggalWib(r.waktu)),
    semua: rows,
  };
}

/** Untuk form edit: tanggal catatan + posisinya terhadap tutup buku di hari yang sama. */
export function tanggalDanPosisi(waktu: number, tutupRows: { waktu: number }[]) {
  const tanggal = isoTanggalWib(waktu);
  const tutupHariItu = tutupRows.slice(1).findLast((t) => isoTanggalWib(t.waktu) === tanggal);
  const posisi: "sebelum" | "sesudah" = tutupHariItu && waktu < tutupHariItu.waktu ? "sebelum" : "sesudah";
  return { tanggal, posisi };
}

/**
 * Saldo Kantong Kantin yang diinput di tutup buku terakhir (atau setup awal), plus setor/tarik
 * sesudahnya. Saldo tidak dijumlahkan dengan setor/tarik: uang jualan tidak tercatat, jadi
 * aplikasi tidak tahu saldo saat ini.
 */
export async function getSaldoTerakhir() {
  const terakhir = await getTutupTerakhir();
  if (!terakhir) return null;
  const kasSejak = await db
    .select()
    .from(kas)
    .where(gt(kas.waktu, terakhir.waktu))
    .orderBy(desc(kas.waktu), desc(kas.id));
  return {
    saldo: terakhir.saldoKantong,
    waktu: terakhir.waktu,
    dariSetup: terakhir.hasilJson === null,
    kasSejak,
  };
}

export async function getSemuaKas() {
  return db.select().from(kas).orderBy(desc(kas.waktu), desc(kas.id));
}

/** Jumlah per hari (WIB) untuk tiap jenis tap, `hari` hari terakhir, terbaru dulu. Tap + input manual digabung. */
export async function getRingkasanHarian(hari: number) {
  const now = Date.now();
  const mulai = awalHariWib(isoTanggalWib(now)) - (hari - 1) * 86400000;
  const rows = await db
    .select()
    .from(tapEvent)
    .where(and(gt(tapEvent.waktu, mulai - 1), lte(tapEvent.waktu, now)));
  const perHari = new Map<string, { kopi: number; kopi_sendiri: number; bb_sendiri: number; manual: boolean }>();
  for (let i = hari - 1; i >= 0; i--) {
    perHari.set(isoTanggalWib(mulai + i * 86400000), { kopi: 0, kopi_sendiri: 0, bb_sendiri: 0, manual: false });
  }
  for (const r of rows) {
    const d = perHari.get(isoTanggalWib(r.waktu));
    if (!d) continue;
    d[r.jenis] += r.delta;
    if (r.manual) d.manual = true;
  }
  return [...perHari.entries()].map(([tgl, v]) => ({ tgl, ...v }));
}

export async function getInputManualTerakhir(limit: number) {
  return db
    .select()
    .from(tapEvent)
    .where(eq(tapEvent.manual, true))
    .orderBy(desc(tapEvent.waktu), desc(tapEvent.id))
    .limit(limit);
}

/**
 * Balik modal sampai tutup buku terakhir (saldo hanya diketahui saat tutup buku), termasuk catatan
 * bertanggal sebelum setup. Modal yang masuk sesudahnya ditampilkan terpisah.
 */
export async function getBep() {
  const rows = await db.select().from(tutupBuku).orderBy(asc(tutupBuku.waktu), asc(tutupBuku.id));
  if (rows.length === 0) return null;
  const setup = rows[0];
  const terakhir = rows[rows.length - 1];
  const [b, k] = await Promise.all([
    db.select().from(belanja).where(eq(belanja.sumber, "pribadi")),
    db.select().from(kas),
  ]);
  const total = <T extends { waktu: number }>(xs: T[], nilai: (x: T) => number, sesudah: boolean) =>
    xs.filter((x) => (x.waktu > terakhir.waktu) === sesudah).reduce((a, x) => a + nilai(x), 0);
  const setor = k.filter((x) => x.jenis === "setor");
  const tarik = k.filter((x) => x.jenis === "tarik");

  return {
    ...hitungBep({
      saldoAwal: setup.saldoKantong,
      cashAwal: setup.cashBelumDisetor,
      setor: total(setor, (x) => x.nominal, false),
      belanjaPribadi: total(b, (x) => x.total, false),
      saldoTerakhir: terakhir.saldoKantong,
      cashTerakhir: terakhir.cashBelumDisetor,
      tarik: total(tarik, (x) => x.nominal, false),
    }),
    waktu: terakhir.waktu,
    belumTutupBuku: terakhir.hasilJson === null,
    belanjaPribadiSejak: total(b, (x) => x.total, true),
    setorSejak: total(setor, (x) => x.nominal, true),
  };
}
