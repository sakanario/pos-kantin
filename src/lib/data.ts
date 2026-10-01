import "server-only";
import { and, asc, desc, eq, gt, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { bahan, bahanAktif, belanja, harga, kas, menu, resep, tapEvent, tutupBuku, type TutupBuku } from "@/db/schema";
import {
  hargaBahanPada,
  hargaPada,
  hargaSatuanBelanja,
  hitungBep,
  hppPada,
  pemakaianBahan,
  resepPada,
  untungDariTap,
  type HargaRow,
  type HasilPeriode,
  type HppCtx,
  type MenuDef,
  type PeriodeData,
  type Stok,
} from "./calc";
import { awalHariWib, bulanWib, isoTanggalWib } from "./format";
import { getSetting } from "./settings";

export async function getTutupTerakhir(): Promise<TutupBuku | undefined> {
  return db.query.tutupBuku.findFirst({ orderBy: [desc(tutupBuku.waktu), desc(tutupBuku.id)] });
}

/** Stok barang jadi yang tersimpan di baris tutup buku. */
export function stokDari(row: { stokJson: string }): Stok {
  return JSON.parse(row.stokJson) as Stok;
}

export async function getSemuaHarga(): Promise<HargaRow[]> {
  return db.select().from(harga).orderBy(asc(harga.berlakuMulai), asc(harga.id));
}

/** Semua menu (aktif & nonaktif), urut tampilan. */
export async function getMenu(): Promise<MenuDef[]> {
  return db.select().from(menu).orderBy(asc(menu.urutan), asc(menu.id));
}

/** Bahan, resep, pembelian aktif, dan belanja bahan: semua yang dibutuhkan untuk HPP. */
export async function getHppCtx() {
  const [b, r, a, bl] = await Promise.all([
    db.select().from(bahan),
    db.select().from(resep).orderBy(asc(resep.berlakuMulai), asc(resep.id)),
    db.select().from(bahanAktif).orderBy(asc(bahanAktif.mulai), asc(bahanAktif.id)),
    db.select().from(belanja).where(eq(belanja.kategori, "bahan")),
  ]);
  return {
    bahan: b,
    resep: r.map((x) => ({ menuId: x.menuId, berlakuMulai: x.berlakuMulai, isi: JSON.parse(x.isiJson) as HppCtx["resep"][number]["isi"] })),
    aktif: a,
    belanja: bl,
  } satisfies HppCtx;
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
  const [b, k, t, h, m, hpp] = await Promise.all([
    db.select().from(belanja).where(rentang(belanja)).orderBy(desc(belanja.waktu)),
    db.select().from(kas).where(rentang(kas)).orderBy(desc(kas.waktu)),
    db.select().from(tapEvent).where(rentang(tapEvent)).orderBy(asc(tapEvent.waktu)),
    getSemuaHarga(),
    getMenu(),
    getHppCtx(),
  ]);
  return { belanja: b, kas: k, taps: t, harga: h, menu: m, hpp } satisfies PeriodeData;
}

const jumlah = (taps: { delta: number }[]) => taps.reduce((a, t) => a + t.delta, 0);

/** Ringkasan periode yang sedang berjalan (sejak tutup buku terakhir sampai sekarang). */
export async function getPeriodeBerjalan() {
  const terakhir = await getTutupTerakhir();
  if (!terakhir) return null;
  const now = Date.now();
  const data = await getDataPeriode(awalData(terakhir), now);
  const stok = stokDari(terakhir);
  const awalHariIni = awalHariWib(isoTanggalWib(now));
  // Hitungan "hari ini" tidak ikut reset saat tutup buku di tengah hari
  const tapsHariIni = await db
    .select()
    .from(tapEvent)
    .where(and(gt(tapEvent.waktu, awalHariIni - 1), lte(tapEvent.waktu, now)));

  const per = (taps: typeof tapsHariIni, menuId: number, jenis: "terjual" | "sendiri") =>
    jumlah(taps.filter((t) => t.menuId === menuId && t.jenis === jenis));

  const menuBerjalan = data.menu.map((m) => {
    const beli = data.belanja
      .filter((b) => b.kategori === "barang" && b.menuId === m.id)
      .reduce((a, b) => a + (b.qtyPcs ?? 0), 0);
    const sendiriPeriode = per(data.taps, m.id, "sendiri");
    const stokAwal = stok[m.id]?.sisa ?? 0;
    return {
      ...m,
      hargaJual: hargaPada(data.harga, m.id, now),
      hariIni: { terjual: per(tapsHariIni, m.id, "terjual"), sendiri: per(tapsHariIni, m.id, "sendiri") },
      periode: { terjual: per(data.taps, m.id, "terjual"), sendiri: sendiriPeriode },
      // Barang jadi: stok maksimal jika belum ada yang terjual; sisa sebenarnya diketahui saat tutup buku.
      stokAwal,
      beli,
      stokTersedia: stokAwal + beli - sendiriPeriode,
    };
  });

  return {
    terakhir,
    data,
    stok,
    menu: menuBerjalan,
    hariIni: isoTanggalWib(now),
    hariSejakTutup: Math.floor((now - terakhir.waktu) / 86400000),
    belanjaPeriode: data.belanja.reduce((a, b) => a + b.total, 0),
    // Untung jualan dari tap saja; barang jadi terjual baru diketahui saat tutup buku.
    untungHariIni: untungDariTap(tapsHariIni, data, stok),
    untungPeriode: untungDariTap(data.taps, data, stok),
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
      // Snapshot dari rumus lama: perlu "Hitung ulang semua laporan" di Setelan
      basi: hasil !== null && (!Array.isArray(hasil.menu) || hasil.untungJualan === undefined),
    };
  });
}

/** Jumlah racikan terjual per hari (WIB) untuk `hari` hari terakhir. */
export async function getTerjualPerHari(hari: number) {
  const now = Date.now();
  const mulai = awalHariWib(isoTanggalWib(now)) - (hari - 1) * 86400000;
  const taps = await db
    .select()
    .from(tapEvent)
    .where(and(eq(tapEvent.jenis, "terjual"), gt(tapEvent.waktu, mulai - 1), lte(tapEvent.waktu, now)));
  const perHari = new Map<string, number>();
  for (let i = 0; i < hari; i++) perHari.set(isoTanggalWib(mulai + i * 86400000), 0);
  for (const t of taps) {
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

/** Jumlah terjual & sendiri per hari (WIB), `hari` hari terakhir, terbaru dulu. Tap + input manual digabung. */
export async function getRingkasanHarian(hari: number) {
  const now = Date.now();
  const mulai = awalHariWib(isoTanggalWib(now)) - (hari - 1) * 86400000;
  const rows = await db
    .select()
    .from(tapEvent)
    .where(and(gt(tapEvent.waktu, mulai - 1), lte(tapEvent.waktu, now)));
  const perHari = new Map<string, { terjual: number; sendiri: number; manual: boolean }>();
  for (let i = hari - 1; i >= 0; i--) {
    perHari.set(isoTanggalWib(mulai + i * 86400000), { terjual: 0, sendiri: 0, manual: false });
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

/**
 * Uang & barang per tutup buku terakhir (atau setup awal): saldo + modal barang jadi yang masih ada.
 */
export async function getUangBarang() {
  const terakhir = await getTutupTerakhir();
  if (!terakhir) return null;
  const stok = stokDari(terakhir);
  const [semuaMenu, beli, taps, hargaJual] = await Promise.all([
    getMenu(),
    db.select().from(belanja).where(and(eq(belanja.kategori, "barang"), gt(belanja.waktu, terakhir.waktu))),
    db.select().from(tapEvent).where(and(eq(tapEvent.jenis, "sendiri"), gt(tapEvent.waktu, terakhir.waktu))),
    getSemuaHarga(),
  ]);
  const now = Date.now();
  return {
    saldo: terakhir.saldoKantong,
    waktu: terakhir.waktu,
    dariSetup: terakhir.hasilJson === null,
    barang: semuaMenu
      .filter((m) => m.jenis === "barang_jadi" && (m.aktif || (stok[m.id]?.sisa ?? 0) > 0))
      .map((m) => ({
        nama: m.nama,
        sisa: stok[m.id]?.sisa ?? 0,
        modalPerPcs: stok[m.id]?.avgModal ?? 0,
        hargaJual: hargaPada(hargaJual, m.id, now),
        // Pergerakan sesudah tutup buku; yang terjual baru diketahui saat tutup buku berikutnya
        dibeliSejak: beli.filter((b) => b.menuId === m.id).reduce((a, b) => a + (b.qtyPcs ?? 0), 0),
        sendiriSejak: jumlah(taps.filter((t) => t.menuId === m.id)),
      })),
  };
}

// ─── Menu & bahan ─────────────────────────────────────────────────

/** Daftar menu dengan harga jual & modal per item saat ini. */
export async function getDaftarMenu() {
  const [semua, h, ctx, terakhir] = await Promise.all([getMenu(), getSemuaHarga(), getHppCtx(), getTutupTerakhir()]);
  const now = Date.now();
  const stok = terakhir ? stokDari(terakhir) : {};
  return semua.map((m) => ({
    ...m,
    hargaJual: hargaPada(h, m.id, now),
    modal: m.jenis === "racikan" ? hppPada(ctx, m.id, now) : (stok[m.id]?.avgModal ?? 0),
    resep: resepPada(ctx, m.id, now),
  }));
}

/** Harga bahan saat ini (per satuan) beserta pembelian yang sedang aktif. */
export async function getDaftarBahan() {
  const [ctx, semuaMenu] = await Promise.all([getHppCtx(), getMenu()]);
  const now = Date.now();
  const kemasan = await getKemasanAktif(ctx, now);
  return ctx.bahan
    .map((b) => {
      const aktif = ctx.aktif.filter((a) => a.bahanId === b.id && a.mulai <= now).at(-1);
      const beliAktif = aktif?.belanjaId != null ? ctx.belanja.find((x) => x.id === aktif.belanjaId) : undefined;
      const terakhir = ctx.belanja.filter((x) => x.bahanId === b.id).sort((x, y) => y.waktu - x.waktu || y.id - x.id)[0];
      return {
        ...b,
        hargaSekarang: hargaBahanPada(ctx, b.id, now),
        beliAktif: beliAktif ? { nama: beliAktif.nama, waktu: beliAktif.waktu } : null,
        adaPembelian: ctx.aktif.some((a) => a.bahanId === b.id && a.belanjaId != null),
        terakhir: terakhir ? { nama: terakhir.nama, isiKemasan: terakhir.isiKemasan } : null,
        kemasan: (() => {
          const k = kemasan.get(b.id);
          return k && k.perkiraan !== null ? { perkiraan: k.perkiraan, sudah: k.pakai.cup, sisa: k.perkiraan - k.pakai.cup } : null;
        })(),
        // Kemasan cadangan: tidak dihitung ke perkiraan kemasan aktif
        cadangan: belumDibuka(ctx, b.id).map((x) => x.nama),
        dipakaiDi: semuaMenu
          .filter((m) => m.jenis === "racikan" && m.aktif)
          .flatMap((m) => {
            const t = resepPada(ctx, m.id, now).find((r) => r.bahanId === b.id)?.takaran;
            return t ? [{ id: m.id, nama: m.nama, takaran: t, hpp: hppPada(ctx, m.id, now) }] : [];
          }),
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

/** Detail satu bahan: pembelian terakhir (mana yang aktif) dan menu yang memakainya. */
export async function getDetailBahan(id: number) {
  const daftar = await getDaftarBahan();
  const b = daftar.find((x) => x.id === id);
  if (!b) return null;
  const [pembelian, aktif] = await Promise.all([
    db.select().from(belanja).where(eq(belanja.bahanId, id)).orderBy(desc(belanja.waktu), desc(belanja.id)).limit(3),
    db.select().from(bahanAktif).where(eq(bahanAktif.bahanId, id)).orderBy(asc(bahanAktif.mulai), asc(bahanAktif.id)),
  ]);
  const now = Date.now();
  const aktifSekarang = aktif.filter((a) => a.mulai <= now).at(-1);
  return {
    ...b,
    hariIni: isoTanggalWib(now),
    pembelian: pembelian.map((p) => ({
      ...p,
      hargaSatuan: hargaSatuanBelanja(p),
      aktif: aktifSekarang?.belanjaId === p.id,
      aktifSejak: aktif.filter((a) => a.belanjaId === p.id).at(-1)?.mulai ?? null,
    })),
  };
}

export async function getBelanjaBelumDitandai() {
  return db
    .select()
    .from(belanja)
    .where(and(eq(belanja.kategori, "bahan"), isNull(belanja.bahanId)))
    .orderBy(asc(belanja.waktu), asc(belanja.id));
}

/** Untuk form belanja: bahan & barang jadi beserta isian dari belanja terakhirnya. */
export async function getInfoFormBelanja() {
  const [daftarBahan, semuaMenu, barangTerakhir] = await Promise.all([
    getDaftarBahan(),
    getMenu(),
    db.select().from(belanja).where(eq(belanja.kategori, "barang")).orderBy(desc(belanja.waktu), desc(belanja.id)),
  ]);
  return {
    bahan: daftarBahan,
    barang: semuaMenu
      .filter((m) => m.jenis === "barang_jadi" && m.aktif)
      .map((m) => {
        const t = barangTerakhir.find((b) => b.menuId === m.id);
        return { id: m.id, nama: m.nama, isiKemasan: t?.isiKemasan ?? null, namaTerakhir: t?.nama ?? null };
      }),
  };
}

// ─── Pengingat kemasan habis ──────────────────────────────────────

type Ctx = Awaited<ReturnType<typeof getHppCtx>>;

/** Belanja bahan yang belum pernah dipakai ("Pakai ini"), yang lama dulu. */
function belumDibuka(ctx: Ctx, bahanId: number) {
  const pernah = new Set(ctx.aktif.map((a) => a.belanjaId));
  return ctx.belanja.filter((x) => x.bahanId === bahanId && !pernah.has(x.id)).sort((x, y) => x.waktu - y.waktu || x.id - y.id);
}

/**
 * Kemasan yang sedang dipakai tiap bahan dan pemakaiannya sejak dibuka (sejak mulai aktif, atau sejak
 * dibeli bila aktif sejak awal): jumlah cup semua racikan yang resepnya memakai bahan itu, dan perkiraan
 * resep (isi ÷ takaran). Dipakai untuk "±N cup lagi" di halaman Bahan dan pengingat kemasan habis.
 */
async function getKemasanAktif(ctx: Ctx, now: number) {
  const daftar = ctx.bahan.flatMap((b) => {
    const aktif = ctx.aktif.filter((a) => a.bahanId === b.id && a.mulai <= now).at(-1);
    const beli = aktif?.belanjaId != null ? ctx.belanja.find((x) => x.id === aktif.belanjaId) : undefined;
    return aktif && beli ? [{ bahanId: b.id, beli, dari: Math.max(aktif.mulai, beli.waktu) }] : [];
  });
  const hasil = new Map<number, (typeof daftar)[number] & { pakai: { cup: number; satuan: number }; perkiraan: number | null }>();
  if (daftar.length === 0) return hasil;
  const taps = await db
    .select()
    .from(tapEvent)
    .where(and(gt(tapEvent.waktu, Math.min(...daftar.map((d) => d.dari))), lte(tapEvent.waktu, now)));
  for (const d of daftar) {
    const pakai = pemakaianBahan(ctx, taps.filter((t) => t.waktu > d.dari), d.bahanId);
    hasil.set(d.bahanId, { ...d, pakai, perkiraan: perkiraanCup(d.beli, pakai, ctx, d.bahanId, now) });
  }
  return hasil;
}

/**
 * Bahan yang punya kemasan belum dibuka, dan pemakaian sejak kemasan aktif dimulai
 * sudah mencapai perkiraan resep. Hanya pengingat; tidak pernah mengganti otomatis.
 */
export async function getPengingatKemasan() {
  const [ctx, tunda] = await Promise.all([getHppCtx(), getSetting("tunda_pengingat")]);
  const now = Date.now();
  const hariIni = isoTanggalWib(now);
  const ditunda = (tunda ? JSON.parse(tunda) : {}) as Record<string, string>;
  const kemasan = await getKemasanAktif(ctx, now);
  const hasil = [];
  for (const b of ctx.bahan) {
    const k = kemasan.get(b.id);
    if (ditunda[b.id] === hariIni || !k || k.perkiraan === null || k.pakai.cup < k.perkiraan) continue;
    const baru = belumDibuka(ctx, b.id)[0];
    if (!baru) continue;
    hasil.push({
      bahanId: b.id,
      bahanNama: b.nama,
      lama: k.beli.nama,
      baru: { id: baru.id, nama: baru.nama },
      perkiraan: k.perkiraan,
      sudah: k.pakai.cup,
    });
  }
  return hasil;
}

/**
 * Perkiraan jumlah cup dari satu kemasan = isi total ÷ takaran per cup. Takaran rata-rata dari
 * pemakaian (bila ada), atau takaran resep terkecil saat ini.
 */
export function perkiraanCup(
  beli: { isiKemasan: number | null; jumlahKemasan: number | null },
  pakai: { cup: number; satuan: number },
  ctx: HppCtx,
  bahanId: number,
  now: number,
): number | null {
  const isi = (beli.isiKemasan ?? 0) * (beli.jumlahKemasan ?? 0);
  let takaran = pakai.cup > 0 ? pakai.satuan / pakai.cup : 0;
  if (takaran <= 0) {
    const semua = [...new Set(ctx.resep.map((r) => r.menuId))]
      .map((id) => resepPada(ctx, id, now).find((x) => x.bahanId === bahanId)?.takaran ?? 0)
      .filter((t) => t > 0);
    takaran = semua.length ? Math.min(...semua) : 0;
  }
  return isi > 0 && takaran > 0 ? Math.floor(isi / takaran) : null;
}
