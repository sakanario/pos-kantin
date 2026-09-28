import "server-only";
import { and, asc, desc, gt, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { belanja, harga, kas, tapEvent, tutupBuku, type TutupBuku } from "@/db/schema";
import { hargaPada, type HargaRow, type HasilPeriode, type PeriodeData } from "./calc";
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
  const data = await getDataPeriode(terakhir.waktu, now);
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
  };
}

export async function getRiwayatTutupBuku() {
  const rows = await db.select().from(tutupBuku).orderBy(desc(tutupBuku.waktu), desc(tutupBuku.id));
  return rows.map((r, i) => ({
    ...r,
    dari: rows[i + 1]?.waktu ?? null,
    hasil: r.hasilJson ? (JSON.parse(r.hasilJson) as HasilPeriode) : null,
  }));
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
