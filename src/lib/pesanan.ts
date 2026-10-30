import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { kas, menu, pesanan, pesananItem, tapEvent, type DataGateway, type Pesanan, type PesananItem, type StatusPesanan } from "@/db/schema";
import { getKatalog, getTutupTerakhir } from "./data";
import { awalHariWib, isoTanggalWib, tanggalPendek } from "./format";
import { hitungUlangSejak } from "./hitung-ulang";
import {
  batalkanTagihan,
  kodeDariOrderId,
  lunasMidtrans,
  statusMidtrans,
  tagihGopay,
  tagihQris,
  TARIF_POTONGAN,
  waktuMidtrans,
} from "./midtrans";
import { kabariPesananLunas } from "./push";

// Pesanan online (CR-005 Tahap 3). Lunas ditentukan gateway (webhook / simulasi gateway palsu), bukan halaman
// yang sedang terbuka di HP pembeli.

export const MASA_BAYAR_MS = 15 * 60 * 1000;
export const MAKS_BELUM_BAYAR = 3; // per perangkat
const MAKS_QTY_BARIS = 20;
const MAKS_ITEM = 30;

export type Gateway = "palsu" | "midtrans";

/**
 * Gateway yang dipakai, dari env `GATEWAY`. Gateway palsu (tombol "Simulasikan bayar") hanya untuk mencoba di
 * laptop: ditolak di Vercel supaya tidak ada yang bisa "membayar" tanpa uang. Tanpa gateway, pesan online mati.
 */
export function gatewayAktif(): Gateway | null {
  const g = process.env.GATEWAY;
  if (g === "palsu") return process.env.VERCEL ? null : "palsu";
  if (g === "midtrans") return process.env.MIDTRANS_SERVER_KEY ? "midtrans" : null;
  return null;
}

/** Potongan gateway palsu: meniru MDR QRIS 0,7%. */
export function potonganPalsu(total: number) {
  return Math.round(total * 0.007);
}

export type PesananLengkap = Pesanan & { item: PesananItem[] };

const STATUS_AKTIF: StatusPesanan[] = ["lunas", "diterima", "dibuat"];
const STATUS_SELESAI: StatusPesanan[] = ["siap", "diantar"];

/** Status berikutnya yang dipilih pengguna di /pesanan (null = sudah selesai). */
export function statusBerikutnya(p: Pick<Pesanan, "status" | "cara">): StatusPesanan | null {
  switch (p.status) {
    case "lunas":
      return "diterima";
    case "diterima":
      return "dibuat";
    case "dibuat":
      return p.cara === "delivery" ? "diantar" : "siap";
    default:
      return null;
  }
}

export const LABEL_STATUS: Record<StatusPesanan, string> = {
  menunggu_bayar: "Menunggu pembayaran",
  lunas: "Lunas",
  diterima: "Diterima",
  dibuat: "Sedang dibuat",
  siap: "Siap diambil",
  diantar: "Diantar",
  kedaluwarsa: "Kedaluwarsa",
  batal: "Dibatalkan",
};

/** Sisa waktu bayar (ms) saat ini. */
export function sisaBayar(p: Pick<Pesanan, "kedaluwarsaPada">) {
  return Math.max(0, p.kedaluwarsaPada - Date.now());
}

export const sedangBerjalan = (s: StatusPesanan) => s === "menunggu_bayar" || STATUS_AKTIF.includes(s);

/** Tandai pesanan belum bayar yang lewat 15 menit sebagai kedaluwarsa (dipanggil sebelum membaca). */
export async function tandaiKedaluwarsa() {
  const now = Date.now();
  await db
    .update(pesanan)
    .set({ status: "kedaluwarsa", diperbarui: now })
    .where(and(eq(pesanan.status, "menunggu_bayar"), lt(pesanan.kedaluwarsaPada, now)));
}

async function lengkapi(rows: Pesanan[]): Promise<PesananLengkap[]> {
  if (rows.length === 0) return [];
  const item = await db
    .select()
    .from(pesananItem)
    .where(inArray(pesananItem.pesananId, rows.map((r) => r.id)))
    .orderBy(asc(pesananItem.id));
  return rows.map((r) => ({ ...r, item: item.filter((i) => i.pesananId === r.id) }));
}

export async function getPesananKode(kode: string): Promise<PesananLengkap | null> {
  await tandaiKedaluwarsa();
  const row = await db.query.pesanan.findFirst({ where: eq(pesanan.kode, kode) });
  return row ? (await lengkapi([row]))[0] : null;
}

export async function getPesananKodeBanyak(kode: string[]): Promise<PesananLengkap[]> {
  if (kode.length === 0) return [];
  await tandaiKedaluwarsa();
  const rows = await db.select().from(pesanan).where(inArray(pesanan.kode, kode)).orderBy(desc(pesanan.dibuat));
  return lengkapi(rows);
}

/**
 * Untuk katalog pembeli: pesanan yang diingat HP ini (cookie), pesanan belum bayar milik perangkat ini, dan
 * pesanan terakhir yang kedaluwarsa (< 1 jam, belum diganti pesanan baru) untuk ajakan "Pesan lagi".
 */
export async function getPesananku(kode: string[], perangkat: string | null) {
  const milikku = await getPesananKodeBanyak(kode);
  const sekarang = Date.now();
  const punyaku = milikku.filter((p) => p.perangkat === perangkat);
  const belumBayar = punyaku.find((p) => p.status === "menunggu_bayar") ?? null;
  const terbaru = punyaku[0];
  const kedaluwarsa =
    !belumBayar && terbaru?.status === "kedaluwarsa" && sekarang - terbaru.kedaluwarsaPada < 60 * 60 * 1000 ? terbaru : null;
  return {
    milikku,
    belumBayar,
    sisaBayarMs: belumBayar ? belumBayar.kedaluwarsaPada - sekarang : 0,
    kedaluwarsa,
    berjalan: milikku.filter((p) => sedangBerjalan(p.status)).length,
  };
}

/** Riwayat di HP pembeli: 30 hari terakhir; pesanan yang tidak jadi dibayar tidak ikut (kecuali yang masih menunggu). */
export async function getRiwayatPembeli(kode: string[]) {
  const now = Date.now();
  const hariIni = isoTanggalWib(now);
  const jam = (ms: number) => new Date(ms).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
  const semua = (await getPesananKodeBanyak(kode))
    .filter((p) => p.dibuat >= now - 30 * 86400000 && (p.dibayar !== null || p.status === "menunggu_bayar"))
    .map((p) => {
      const t = p.dibayar ?? p.dibuat;
      return {
        ...p,
        // "Hari ini 10.42" / "14 Okt"
        waktuLabel: isoTanggalWib(t) === hariIni ? `Hari ini ${jam(t)}` : tanggalPendek(t),
        sisaMs: p.status === "menunggu_bayar" ? Math.max(0, p.kedaluwarsaPada - now) : 0,
      };
    });
  return { berjalan: semua.filter((p) => sedangBerjalan(p.status)), selesai: semua.filter((p) => !sedangBerjalan(p.status)) };
}
export type PesananRiwayat = Awaited<ReturnType<typeof getRiwayatPembeli>>["selesai"][number];

/** Pesanan belum bayar milik perangkat ini (terbaru dulu). */
export async function getBelumBayar(perangkat: string): Promise<PesananLengkap[]> {
  await tandaiKedaluwarsa();
  const rows = await db
    .select()
    .from(pesanan)
    .where(and(eq(pesanan.perangkat, perangkat), eq(pesanan.status, "menunggu_bayar")))
    .orderBy(desc(pesanan.dibuat));
  return lengkapi(rows);
}

/** Untuk /pesanan: pesanan lunas yang belum selesai, nomor kecil dulu. */
export async function getPesananAktif(): Promise<PesananLengkap[]> {
  const rows = await db
    .select()
    .from(pesanan)
    .where(inArray(pesanan.status, STATUS_AKTIF))
    .orderBy(asc(pesanan.dibayar), asc(pesanan.id));
  return lengkapi(rows);
}

export async function getJumlahPesananAktif(): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(pesanan).where(inArray(pesanan.status, STATUS_AKTIF));
  return r?.n ?? 0;
}

/** Pesanan yang sudah selesai pada tanggal WIB `iso` (lunas hari itu), terbaru dulu. */
export async function getPesananSelesai(iso: string): Promise<PesananLengkap[]> {
  const dari = awalHariWib(iso);
  const rows = await db
    .select()
    .from(pesanan)
    .where(and(inArray(pesanan.status, [...STATUS_SELESAI, "batal"]), isNotNull(pesanan.dibayar), gte(pesanan.dibayar, dari), lt(pesanan.dibayar, dari + 86400000)))
    .orderBy(desc(pesanan.dibayar));
  return lengkapi(rows);
}

/** Riwayat Pesanan: semua pesanan yang lunas di bulan `ym` (WIB, menurut waktu bayar), terbaru dulu. */
export async function getPesananBulan(ym: string): Promise<PesananLengkap[]> {
  const [y, m] = ym.split("-").map(Number);
  const berikut = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const rows = await db
    .select()
    .from(pesanan)
    .where(and(isNotNull(pesanan.dibayar), gte(pesanan.dibayar, awalHariWib(`${ym}-01`)), lt(pesanan.dibayar, awalHariWib(`${berikut}-01`))))
    .orderBy(desc(pesanan.dibayar), desc(pesanan.id));
  return lengkapi(rows);
}

/** Detail pesanan untuk pemilik (Riwayat Pesanan). Hanya yang sudah lunas. */
export async function getPesananId(id: number): Promise<PesananLengkap | null> {
  if (!Number.isInteger(id)) return null;
  const row = await db.query.pesanan.findFirst({ where: and(eq(pesanan.id, id), isNotNull(pesanan.dibayar)) });
  return row ? (await lengkapi([row]))[0] : null;
}

/** Waktu bayar pesanan pertama, untuk batas navigasi bulan. */
export async function getPesananPertama(): Promise<number | null> {
  const row = await db.query.pesanan.findFirst({
    where: isNotNull(pesanan.dibayar),
    orderBy: [asc(pesanan.dibayar)],
    columns: { dibayar: true },
  });
  return row?.dibayar ?? null;
}

/** Sudah pernah ada pesanan lunas? (input saldo gateway di Tutup Buku tampil) */
export async function adaPesananLunas(): Promise<boolean> {
  const row = await db.query.pesanan.findFirst({ where: isNotNull(pesanan.dibayar), columns: { id: true } });
  return !!row;
}

// ─── Membuat pesanan ─────────────────────────────────────────────

export type BarisKeranjang = { menuId: number; lessSugar: boolean; qty: number };
export type PesananInput = { nama: string; cara: "pickup" | "delivery"; catatan: string; item: BarisKeranjang[] };

/** Tanda keranjang untuk membandingkan "keranjang sama" (urutan baris tidak penting). */
function tandaKeranjang(i: { nama: string; cara: string; catatan: string | null; item: BarisKeranjang[] }) {
  const baris = i.item.map((x) => `${x.menuId}:${x.lessSugar ? 1 : 0}:${x.qty}`).sort();
  return JSON.stringify([i.nama, i.cara, i.catatan ?? "", baris]);
}

function kodeAcak() {
  return randomBytes(6).toString("hex"); // 12 karakter, 48 bit: cukup untuk link yang tidak bisa ditebak
}

/**
 * Buat pesanan `menunggu_bayar` dari keranjang. Keranjang sama dengan pesanan belum bayar milik perangkat ini →
 * pesanan itu dipakai lagi. Keranjang berubah → pesanan belum bayar sebelumnya dibatalkan.
 */
export async function buatPesanan(raw: PesananInput, perangkat: string): Promise<{ kode: string } | { error: string }> {
  const gateway = gatewayAktif();
  if (!gateway) return { error: "Pembayaran online belum aktif. Pesan langsung di kantin ya." };

  const nama = String(raw.nama ?? "").trim().slice(0, 40);
  const cara = raw.cara === "delivery" ? "delivery" : "pickup";
  const catatan = String(raw.catatan ?? "").trim().slice(0, 120) || null;
  if (!nama) return { error: "Isi nama kamu dulu." };

  // Gabungkan baris yang sama, validasi jumlah
  const peta = new Map<string, BarisKeranjang>();
  for (const x of Array.isArray(raw.item) ? raw.item : []) {
    const qty = Math.floor(Number(x?.qty));
    const menuId = Math.floor(Number(x?.menuId));
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(menuId)) continue;
    const k = `${menuId}:${x.lessSugar ? 1 : 0}`;
    const ada = peta.get(k);
    peta.set(k, { menuId, lessSugar: !!x.lessSugar, qty: (ada?.qty ?? 0) + qty });
  }
  const item = [...peta.values()];
  if (item.length === 0) return { error: "Keranjang masih kosong." };
  if (item.some((x) => x.qty > MAKS_QTY_BARIS) || item.reduce((a, x) => a + x.qty, 0) > MAKS_ITEM) {
    return { error: `Maksimal ${MAKS_ITEM} item per pesanan.` };
  }

  // Menu & harga dari katalog sekarang (bukan dari HP pembeli)
  const katalog = await getKatalog();
  if (!katalog.buka) return { error: "Kantin sedang tutup." };
  const baris: { menuId: number; nama: string; qty: number; harga: number; lessSugar: boolean }[] = [];
  for (const x of item) {
    const m = katalog.menu.find((k) => k.id === x.menuId);
    if (!m) return { error: "Ada menu yang sudah tidak tersedia. Cek keranjang lagi ya." };
    if (m.habis) return { error: `${m.nama} sedang habis. Hapus dari keranjang dulu ya.` };
    baris.push({ menuId: m.id, nama: m.nama, qty: x.qty, harga: m.harga, lessSugar: m.bisaLessSugar && x.lessSugar });
  }
  const total = baris.reduce((a, b) => a + b.qty * b.harga, 0);
  if (total <= 0) return { error: "Total pesanan tidak valid." };

  const now = Date.now();
  const belum = await getBelumBayar(perangkat);
  const tanda = tandaKeranjang({ nama, cara, catatan, item: baris });
  const sama = belum.find((p) => p.total === total && tandaKeranjang({ ...p, item: p.item }) === tanda);
  if (sama) return { kode: sama.kode };
  if (belum.length > 0) {
    await Promise.all(belum.map((p) => batalkanTagihanPesanan(p.gatewayJson)));
    await db
      .update(pesanan)
      .set({ status: "batal", diperbarui: now })
      .where(and(eq(pesanan.perangkat, perangkat), eq(pesanan.status, "menunggu_bayar")));
  }
  // Batas per perangkat (jaga-jaga bila cookie diakali; pesanan lama di atas sudah dibatalkan)
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(pesanan)
    .where(and(eq(pesanan.perangkat, perangkat), eq(pesanan.status, "menunggu_bayar")));
  if (n >= MAKS_BELUM_BAYAR) return { error: "Masih ada pesanan yang belum dibayar. Bayar atau batalkan dulu ya." };

  const kode = kodeAcak();
  const [row] = await db
    .insert(pesanan)
    .values({
      kode,
      nama,
      cara,
      catatan,
      status: "menunggu_bayar",
      total,
      gateway,
      gatewayRef: `${gateway}-${kode}`,
      perangkat,
      dibuat: now,
      kedaluwarsaPada: now + MASA_BAYAR_MS,
      diperbarui: now,
    })
    .returning({ id: pesanan.id });
  await db.insert(pesananItem).values(baris.map((b) => ({ ...b, pesananId: row.id })));

  if (gateway === "midtrans") {
    try {
      const qris = await tagihQris(`${kode}-qris`, total, MASA_BAYAR_MS);
      await db.update(pesanan).set({ gatewayJson: { qris } }).where(eq(pesanan.id, row.id));
    } catch (e) {
      console.error(e);
      await db.update(pesanan).set({ status: "batal", diperbarui: Date.now() }).where(eq(pesanan.id, row.id));
      return { error: "Pembayaran sedang gangguan. Coba lagi sebentar, atau pesan langsung di kantin." };
    }
  }
  return { kode };
}

/** Batalkan semua tagihan gateway sebuah pesanan (kecuali `kecuali`). Tidak melempar error. */
async function batalkanTagihanPesanan(g: DataGateway | null, kecuali?: string) {
  const id = [g?.qris?.orderId, g?.gopay?.orderId].filter((x): x is string => !!x && x !== kecuali);
  await Promise.all(id.map(batalkanTagihan));
}

/**
 * Tombol "Bayar pakai GoPay": buat tagihan GoPay (sekali per pesanan) dan kembalikan deeplink-nya. Setelah bayar,
 * aplikasi GoPay kembali ke `kembaliKe`.
 */
export async function bayarGopay(kode: string, kembaliKe: string): Promise<{ url: string } | { error: string }> {
  const p = await getPesananKode(kode);
  if (!p || p.gateway !== "midtrans") return { error: "Pesanan tidak ditemukan." };
  if (p.status !== "menunggu_bayar") return { error: "Pesanan ini sudah tidak menunggu pembayaran." };
  if (p.gatewayJson?.gopay) return { url: p.gatewayJson.gopay.deeplink };
  try {
    const gopay = await tagihGopay(`${kode}-gopay`, p.total, sisaBayar(p), kembaliKe);
    await db
      .update(pesanan)
      .set({ gatewayJson: { ...p.gatewayJson, gopay } })
      .where(eq(pesanan.id, p.id));
    return { url: gopay.deeplink };
  } catch (e) {
    console.error(e);
    // Tekan ganda: tagihan sudah dibuat oleh tekan pertama
    const lagi = await getPesananKode(kode);
    if (lagi?.gatewayJson?.gopay) return { url: lagi.gatewayJson.gopay.deeplink };
    return { error: "GoPay sedang gangguan. Pakai QRIS di atas ya." };
  }
}

/** Pembeli membatalkan pesanan yang belum dibayar (hanya dari perangkat yang membuatnya). */
export async function batalkanBelumBayar(kode: string, perangkat: string) {
  const [row] = await db
    .update(pesanan)
    .set({ status: "batal", diperbarui: Date.now() })
    .where(and(eq(pesanan.kode, kode), eq(pesanan.perangkat, perangkat), eq(pesanan.status, "menunggu_bayar")))
    .returning({ gatewayJson: pesanan.gatewayJson });
  if (row) await batalkanTagihanPesanan(row.gatewayJson);
}

// ─── Lunas ───────────────────────────────────────────────────────

/**
 * Tandai lunas: dipanggil oleh webhook gateway (atau simulasi gateway palsu). Idempoten: hanya pesanan yang
 * `dibayar`-nya masih kosong yang diproses, jadi notifikasi ganda tidak mencatat dua kali. Pesanan yang sudah
 * kedaluwarsa / dibatalkan pembeli tetap dicatat lunas bila uangnya ternyata masuk.
 *
 * - Nomor antrean = nomor terbesar hari itu (WIB) + 1.
 * - Racikan → tap `terjual` (delta = qty, waktu = dibayar). Barang jadi tidak di-tap (terjual dihitung dari
 *   sisa stok saat tutup buku).
 * - Waktu bayar di periode yang sudah ditutup → hitung ulang.
 * - Kirim notifikasi ke HP pengguna.
 */
export async function tandaiLunas(a: { kode: string; dibayar: number; potongan: number; metode: string }): Promise<boolean> {
  const awalHari = awalHariWib(isoTanggalWib(a.dibayar));
  const [row] = await db
    .update(pesanan)
    .set({
      status: "lunas",
      dibayar: a.dibayar,
      potongan: Math.max(0, Math.round(a.potongan)),
      metode: a.metode,
      diperbarui: Date.now(),
      nomor: sql`(select coalesce(max(p2.nomor), 0) + 1 from pesanan p2 where p2.dibayar >= ${awalHari} and p2.dibayar < ${awalHari + 86400000})`,
    })
    .where(and(eq(pesanan.kode, a.kode), isNull(pesanan.dibayar)))
    .returning({ id: pesanan.id });
  if (!row) return false;

  const item = await db
    .select({ menuId: pesananItem.menuId, qty: pesananItem.qty, jenis: menu.jenis })
    .from(pesananItem)
    .innerJoin(menu, eq(menu.id, pesananItem.menuId))
    .where(eq(pesananItem.pesananId, row.id));
  const racikan = item.filter((i) => i.jenis === "racikan");
  if (racikan.length > 0) {
    await db.insert(tapEvent).values(
      racikan.map((i) => ({ waktu: a.dibayar, menuId: i.menuId, jenis: "terjual" as const, delta: i.qty, pesananId: row.id })),
    );
  }
  const terakhir = await getTutupTerakhir();
  if (terakhir && terakhir.hasilJson !== null && a.dibayar <= terakhir.waktu) await hitungUlangSejak(a.dibayar);
  await kabariPesananLunas(row.id); // web push ke HP pengguna (Tahap 4); tidak pernah melempar error
  return true;
}

/**
 * Notifikasi Midtrans (webhook, tanda tangan sudah dicek): status dibaca ulang langsung dari Midtrans, bukan dari
 * isi notifikasi. Lunas → `tandaiLunas` dengan potongan sesuai cara bayar, lalu tagihan cara bayar lain dibatalkan.
 * Melempar error bila Midtrans tidak bisa dihubungi (webhook menjawab 500 supaya Midtrans mengulang).
 */
export async function prosesNotifikasiMidtrans(orderId: string): Promise<void> {
  const kode = kodeDariOrderId(orderId);
  if (!kode) return;
  const st = await statusMidtrans(orderId);
  if (!st || !lunasMidtrans(st)) return;
  const p = await getPesananKode(kode);
  if (!p || p.gateway !== "midtrans") return;
  if (Number(st.gross_amount) !== p.total) {
    console.error(`Midtrans ${orderId}: nominal ${st.gross_amount} ≠ total pesanan ${p.total}`);
    return;
  }
  const metode = st.payment_type === "gopay" ? "gopay" : "qris";
  const lunas = await tandaiLunas({
    kode,
    dibayar: waktuMidtrans(st.settlement_time) ?? Date.now(),
    potongan: p.total * TARIF_POTONGAN[metode],
    metode,
  });
  if (lunas) await batalkanTagihanPesanan(p.gatewayJson, orderId);
}

/**
 * Tolak / batalkan pesanan yang sudah lunas (bahan habis, dll.). Refund dilakukan pengguna sendiri di luar app;
 * di sini dicatat sumber uangnya:
 * - `kantong`: saldo Kantong turun sendiri saat refund → cukup hapus tap pesanan.
 * - `pribadi`: uang pesanan tetap di saldo gateway tapi bukan penjualan → hapus tap + catat setor modal sebesar total.
 * Potongan gateway tetap biaya (tidak dikembalikan gateway). Hanya untuk pesanan di periode berjalan, supaya
 * tap yang dihapus & uang refund jatuh di periode yang sama.
 */
export async function batalkanLunas(id: number, refundDari: "kantong" | "pribadi"): Promise<string | null> {
  const p = await db.query.pesanan.findFirst({ where: eq(pesanan.id, id) });
  if (!p || p.dibayar === null) return "Pesanan tidak ditemukan.";
  if (!STATUS_AKTIF.includes(p.status) && !STATUS_SELESAI.includes(p.status)) return "Pesanan ini sudah dibatalkan.";
  const terakhir = await getTutupTerakhir();
  if (terakhir && terakhir.hasilJson !== null && p.dibayar <= terakhir.waktu) {
    return "Pesanan ini sudah masuk tutup buku, jadi tidak bisa dibatalkan lagi.";
  }
  const now = Date.now();
  await db.batch([
    db
      .update(pesanan)
      .set({ status: "batal", refundDari, diperbarui: now })
      .where(and(eq(pesanan.id, id), eq(pesanan.status, p.status))),
    db.delete(tapEvent).where(eq(tapEvent.pesananId, id)),
    ...(refundDari === "pribadi"
      ? [
          db.insert(kas).values({
            waktu: now,
            jenis: "setor" as const,
            nominal: p.total,
            catatan: `Refund pesanan online #${p.nomor} (${p.nama}) dari uang pribadi`,
          }),
        ]
      : []),
  ]);
  return null;
}

/** Majukan status satu langkah (pengguna di /pesanan). `dari` mencegah tekan ganda melompati langkah. */
export async function majukanPesanan(id: number, dari: StatusPesanan) {
  const row = await db.query.pesanan.findFirst({ where: eq(pesanan.id, id), columns: { status: true, cara: true } });
  if (!row || row.status !== dari) return;
  const ke = statusBerikutnya(row);
  if (!ke) return;
  await db
    .update(pesanan)
    .set({ status: ke, diperbarui: Date.now() })
    .where(and(eq(pesanan.id, id), eq(pesanan.status, dari)));
}
