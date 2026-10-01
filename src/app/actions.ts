"use server";

import { and, asc, eq, gt, gte, lt, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bahan, bahanAktif, belanja, harga, kas, menu, resep, tapEvent, tutupBuku } from "@/db/schema";
import { cekPin, endSession, hashPin, isValidPin, requireAuth, startSession } from "@/lib/auth";
import { hargaPada, hitungPeriode, pemakaianBahan, resepPada, type HasilPeriode } from "@/lib/calc";
import { awalData, getDataPeriode, getHppCtx, getSemuaHarga, getTutupTerakhir, perkiraanCup, stokDari } from "@/lib/data";
import { hitungUlangSejak } from "@/lib/hitung-ulang";
import { awalHariWib, isoTanggalWib, parseDesimal, parseRupiah } from "@/lib/format";
import { getSetting, isSetupDone, setSetting } from "@/lib/settings";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function refreshSemua() {
  revalidatePath("/", "layout");
}

// ─── Setup & Auth ────────────────────────────────────────────────

export async function setupAction(_: FormState, fd: FormData): Promise<FormState> {
  if (await isSetupDone()) return { error: "Setup sudah pernah dilakukan." };

  const pin = str(fd, "pin");
  if (!isValidPin(pin)) return { error: "PIN harus 4–6 digit angka." };
  if (pin !== str(fd, "pin2")) return { error: "Konfirmasi PIN tidak sama." };

  const saldo = parseRupiah(fd.get("saldo"));
  if (!Number.isFinite(saldo) || saldo < 0) return { error: "Saldo tidak valid." };

  await setSetting("pin_hash", await hashPin(pin));
  await db.insert(tutupBuku).values({ waktu: Date.now(), saldoKantong: saldo, cashBelumDisetor: 0, stokJson: "{}", hasilJson: null });
  await setSetting("setup_done", "1");
  await startSession();
  redirect("/lainnya/menu");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const hasil = await cekPin(str(fd, "pin"));
  if (!hasil.ok) return { error: hasil.pesan };
  await startSession();
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

// ─── Tap ─────────────────────────────────────────────────────────

export async function tapAction(menuId: number, jenis: "terjual" | "sendiri", delta: 1 | -1) {
  await requireAuth();
  const terakhir = await getTutupTerakhir();
  if (!terakhir) return { error: "Setup belum selesai." };
  const m = await db.query.menu.findFirst({ where: eq(menu.id, menuId) });
  if (!m) return { error: "Menu tidak ditemukan." };
  if (m.jenis === "barang_jadi" && jenis === "terjual") return { error: "Barang jadi terjual dihitung saat tutup buku." };

  if (delta === -1) {
    const rows = await db
      .select()
      .from(tapEvent)
      .where(and(eq(tapEvent.menuId, menuId), eq(tapEvent.jenis, jenis), gt(tapEvent.waktu, awalData(terakhir))));
    const total = rows.reduce((a, r) => a + r.delta, 0);
    if (total <= 0) return { error: "Belum ada yang bisa dikurangi di periode ini." };
  }

  await db.insert(tapEvent).values({ waktu: Date.now(), menuId, jenis, delta });
  refreshSemua();
  return {};
}

// ─── Waktu catatan ───────────────────────────────────────────────

/**
 * Ubah input tanggal (YYYY-MM-DD, WIB) jadi waktu catatan, yang menentukan catatan masuk periode mana.
 * - Hari ini → sekarang. Hari lain → jam 12:00 WIB.
 * - Jika pada tanggal itu ada tutup buku, `posisi` menentukan sebelum/sesudah tutup buku (default sesudah).
 * - Tanggal sebelum setup awal tetap disimpan apa adanya; periode pertama mencakupnya (lihat awalData).
 */
async function waktuDariTanggal(iso: string, posisi: string): Promise<{ waktu: number } | { error: string }> {
  const now = Date.now();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { error: "Tanggal tidak valid." };
  const hariIni = isoTanggalWib(now);
  if (iso > hariIni) return { error: "Tanggal tidak boleh di masa depan." };

  const semua = await db.select().from(tutupBuku).orderBy(asc(tutupBuku.waktu));
  const setup = semua[0];
  if (!setup) return { error: "Setup belum selesai." };

  let waktu = iso === hariIni ? now : awalHariWib(iso) + 12 * 3600000;
  const tutupHariItu = semua.slice(1).findLast((t) => isoTanggalWib(t.waktu) === iso);
  if (tutupHariItu) {
    if (posisi === "sebelum") waktu = tutupHariItu.waktu - 1;
    else waktu = Math.max(waktu, tutupHariItu.waktu + 1);
  }
  return { waktu };
}

/** Kalau catatan menyentuh periode yang sudah ditutup, hitung ulang laporannya. */
async function setelahUbah(...waktuTerdampak: number[]): Promise<string> {
  const terakhir = await getTutupTerakhir();
  const paling = Math.min(...waktuTerdampak);
  refreshSemua();
  if (!terakhir || paling > terakhir.waktu) return "";
  const n = await hitungUlangSejak(paling);
  return n > 0 ? ` ${n} laporan periode lama dihitung ulang.` : "";
}

// ─── Pembelian aktif (kemasan yang sedang dipakai) ───────────────

/**
 * Info saat kemasan aktif diganti pada `waktu`: "Susu sebelumnya habis setelah 30 cup (perkiraan resep: 50 cup)."
 * Tidak ada info bila sebelumnya memakai harga awal (tanpa pembelian).
 */
async function infoGantiKemasan(bahanId: number, waktu: number): Promise<string> {
  const ctx = await getHppCtx();
  const lama = ctx.aktif.filter((a) => a.bahanId === bahanId && a.mulai <= waktu).at(-1);
  const beli = lama?.belanjaId != null ? ctx.belanja.find((b) => b.id === lama.belanjaId) : undefined;
  const b = ctx.bahan.find((x) => x.id === bahanId);
  if (!lama || !beli || !b) return "";
  const dari = Math.max(lama.mulai, beli.waktu);
  const taps = await db.select().from(tapEvent).where(and(gt(tapEvent.waktu, dari), lte(tapEvent.waktu, waktu)));
  const pakai = pemakaianBahan(ctx, taps, bahanId);
  const perkiraan = perkiraanCup(beli, pakai, ctx, bahanId, waktu);
  return ` ${b.nama} sebelumnya habis setelah ${pakai.cup} cup${perkiraan !== null ? ` (perkiraan resep: ${perkiraan} cup)` : ""}.`;
}

/**
 * Jadikan belanja `belanjaId` kemasan aktif mulai `mulai`. Pilihan kemasan lain di waktu itu atau
 * sesudahnya diganti, supaya kemasan ini benar-benar yang dipakai sejak `mulai` sampai diganti lagi.
 * Mengembalikan info "habis setelah N cup".
 */
async function aktifkan(bahanId: number, belanjaId: number, mulai: number): Promise<string> {
  await db.delete(bahanAktif).where(and(eq(bahanAktif.bahanId, bahanId), gte(bahanAktif.mulai, mulai)));
  // Kemasan ini memang sudah dipakai sebelum `mulai`: tidak perlu dicatat lagi
  const sebelum = await db
    .select()
    .from(bahanAktif)
    .where(and(eq(bahanAktif.bahanId, bahanId), lt(bahanAktif.mulai, mulai)))
    .orderBy(asc(bahanAktif.mulai), asc(bahanAktif.id));
  if (sebelum.at(-1)?.belanjaId === belanjaId) return "";
  const info = await infoGantiKemasan(bahanId, mulai);
  await db.insert(bahanAktif).values({ bahanId, belanjaId, mulai });
  return info;
}

/** Pembelian pertama suatu bahan langsung aktif, berlaku sejak awal (menggantikan harga awal). */
async function punyaPembelianAktif(bahanId: number) {
  const rows = await db.select().from(bahanAktif).where(eq(bahanAktif.bahanId, bahanId));
  return rows.some((r) => r.belanjaId != null);
}

// ─── Belanja ─────────────────────────────────────────────────────

async function bacaBelanja(fd: FormData) {
  const kategori = str(fd, "kategori") as "bahan" | "barang" | "lain";
  if (!["bahan", "barang", "lain"].includes(kategori)) return { error: "Kategori tidak valid." };
  const sumber: "kantong" | "pribadi" = str(fd, "sumber") === "pribadi" ? "pribadi" : "kantong";
  const total = parseRupiah(fd.get("total"));
  if (!Number.isFinite(total) || total <= 0) return { error: "Total harga harus lebih dari 0." };

  let nama = str(fd, "nama");
  let bahanId: number | null = null;
  let menuId: number | null = null;
  let isiKemasan: number | null = null;
  let jumlahKemasan: number | null = null;
  let qtyPcs: number | null = null;

  if (kategori === "bahan") {
    bahanId = Number(str(fd, "bahan_id"));
    const b = await db.query.bahan.findFirst({ where: eq(bahan.id, bahanId) });
    if (!b) return { error: "Pilih bahannya dulu." };
    isiKemasan = parseDesimal(fd.get("isi_kemasan"));
    if (!Number.isFinite(isiKemasan) || isiKemasan <= 0) return { error: `Isi per kemasan (${b.satuan}) harus lebih dari 0.` };
    jumlahKemasan = parseRupiah(fd.get("jumlah_kemasan"));
    if (!Number.isInteger(jumlahKemasan) || jumlahKemasan <= 0) return { error: "Jumlah kemasan harus angka bulat lebih dari 0." };
    if (!nama) nama = b.nama;
  } else if (kategori === "barang") {
    menuId = Number(str(fd, "menu_id"));
    const m = await db.query.menu.findFirst({ where: eq(menu.id, menuId) });
    if (!m || m.jenis !== "barang_jadi") return { error: "Pilih barangnya dulu." };
    jumlahKemasan = parseRupiah(fd.get("jumlah_kemasan"));
    isiKemasan = parseRupiah(fd.get("isi_kemasan"));
    if (!Number.isInteger(jumlahKemasan) || jumlahKemasan <= 0) return { error: "Jumlah harus angka bulat lebih dari 0." };
    if (!Number.isInteger(isiKemasan) || isiKemasan <= 0) return { error: "Isi per dus harus angka bulat lebih dari 0." };
    qtyPcs = jumlahKemasan * isiKemasan;
    if (!nama) nama = isiKemasan === 1 ? `${m.nama} ${qtyPcs} pcs` : `${m.nama} ${jumlahKemasan} dus`;
  }
  if (!nama) return { error: "Nama barang wajib diisi." };

  const w = await waktuDariTanggal(str(fd, "tanggal"), str(fd, "posisi"));
  if ("error" in w) return { error: w.error };

  return {
    values: {
      waktu: w.waktu,
      kategori,
      nama,
      bahanId,
      menuId,
      isiKemasan,
      jumlahKemasan,
      qtyPcs,
      total,
      sumber,
      catatan: str(fd, "catatan") || null,
    },
  };
}

export async function tambahBelanjaAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const r = await bacaBelanja(fd);
  if ("error" in r) return { error: r.error };
  const [row] = await db.insert(belanja).values(r.values).returning({ id: belanja.id });
  let info = "";
  let paling = r.values.waktu;
  if (r.values.bahanId != null) {
    if (!(await punyaPembelianAktif(r.values.bahanId))) {
      await aktifkan(r.values.bahanId, row.id, 0);
      paling = 0;
    } else if (str(fd, "pakai_sekarang")) {
      info = await aktifkan(r.values.bahanId, row.id, r.values.waktu);
    }
  }
  info += await setelahUbah(paling);
  return { ok: `Tersimpan: ${r.values.nama}.${info}` };
}

export async function ubahBelanjaAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const lama = await db.query.belanja.findFirst({ where: eq(belanja.id, id) });
  if (!lama) return { error: "Catatan tidak ditemukan." };
  const r = await bacaBelanja(fd);
  if ("error" in r) return { error: r.error };
  // Tanggal tidak diubah → pertahankan waktu aslinya (posisinya terhadap tutup buku)
  const values = str(fd, "tanggal") === isoTanggalWib(lama.waktu) && !str(fd, "posisi") ? { ...r.values, waktu: lama.waktu } : r.values;
  await db.update(belanja).set(values).where(eq(belanja.id, id));
  let paling = Math.min(lama.waktu, values.waktu);
  // Bahan diganti: status "aktif" milik bahan lama tidak berlaku lagi
  if (lama.bahanId !== values.bahanId) {
    await db.delete(bahanAktif).where(eq(bahanAktif.belanjaId, id));
    if (values.bahanId != null && !(await punyaPembelianAktif(values.bahanId))) await aktifkan(values.bahanId, id, 0);
    paling = 0;
  } else if (lama.total !== values.total || lama.isiKemasan !== values.isiKemasan || lama.jumlahKemasan !== values.jumlahKemasan) {
    // Harga per satuan berubah → HPP sejak kemasan ini aktif ikut berubah
    const aktif = await db.select().from(bahanAktif).where(eq(bahanAktif.belanjaId, id));
    if (aktif.length) paling = Math.min(paling, ...aktif.map((a) => a.mulai));
  }
  const info = await setelahUbah(paling);
  return { ok: `Perubahan tersimpan.${info}` };
}

export async function hapusBelanjaAction(id: number) {
  await requireAuth();
  const row = await db.query.belanja.findFirst({ where: eq(belanja.id, id) });
  if (!row) return { error: "Catatan tidak ditemukan." };
  const aktif = await db.select().from(bahanAktif).where(eq(bahanAktif.belanjaId, id));
  await db.delete(bahanAktif).where(eq(bahanAktif.belanjaId, id));
  await db.delete(belanja).where(eq(belanja.id, id));
  await setelahUbah(row.waktu, ...aktif.map((a) => a.mulai));
  return {};
}

/** Tandai belanja bahan lama (dari sebelum ada fitur bahan): bahan, isi, dan apakah kemasan ini yang dipakai. */
export async function tandaiBelanjaAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const row = await db.query.belanja.findFirst({ where: eq(belanja.id, id) });
  if (!row || row.kategori !== "bahan") return { error: "Catatan tidak ditemukan." };
  const bahanId = Number(str(fd, "bahan_id"));
  const b = await db.query.bahan.findFirst({ where: eq(bahan.id, bahanId) });
  if (!b) return { error: "Pilih bahannya dulu." };
  const isiKemasan = parseDesimal(fd.get("isi_kemasan"));
  const jumlahKemasan = parseRupiah(fd.get("jumlah_kemasan"));
  if (!Number.isFinite(isiKemasan) || isiKemasan <= 0) return { error: `Isi per kemasan (${b.satuan}) harus lebih dari 0.` };
  if (!Number.isInteger(jumlahKemasan) || jumlahKemasan <= 0) return { error: "Jumlah kemasan harus angka bulat lebih dari 0." };

  await db.update(belanja).set({ bahanId, isiKemasan, jumlahKemasan }).where(eq(belanja.id, id));
  await db.delete(bahanAktif).where(eq(bahanAktif.belanjaId, id));
  if (str(fd, "aktif")) {
    // Data lama: kemasan yang dipakai berlaku sejak awal, menggantikan pilihan sebelumnya
    await db.delete(bahanAktif).where(and(eq(bahanAktif.bahanId, bahanId), eq(bahanAktif.mulai, 0)));
    await db.insert(bahanAktif).values({ bahanId, belanjaId: id, mulai: 0 });
  }
  const info = await setelahUbah(0);
  return { ok: `${row.nama} → ${b.nama}.${info}` };
}

/** "Pakai ini": kemasan dari belanja `id` mulai dipakai pada tanggal yang dipilih. */
export async function pakaiKemasanAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const row = await db.query.belanja.findFirst({ where: eq(belanja.id, id) });
  if (!row?.bahanId) return { error: "Catatan tidak ditemukan." };
  const w = await waktuDariTanggal(str(fd, "tanggal"), str(fd, "posisi"));
  if ("error" in w) return { error: w.error };
  const info = await aktifkan(row.bahanId, id, w.waktu);
  const info2 = await setelahUbah(w.waktu);
  return { ok: `Sekarang memakai ${row.nama}.${info}${info2}` };
}

/** Dari pengingat di Beranda: ganti ke kemasan baru mulai sekarang. */
export async function gantiKemasanSekarangAction(belanjaId: number): Promise<{ ok?: string; error?: string }> {
  await requireAuth();
  const row = await db.query.belanja.findFirst({ where: eq(belanja.id, belanjaId) });
  if (!row?.bahanId) return { error: "Catatan tidak ditemukan." };
  const info = await aktifkan(row.bahanId, belanjaId, Date.now());
  refreshSemua();
  return { ok: `Sekarang memakai ${row.nama}.${info}` };
}

/** "Belum": sembunyikan pengingat bahan ini sampai besok. */
export async function tundaPengingatAction(bahanId: number) {
  await requireAuth();
  const lama = await getSetting("tunda_pengingat");
  const tunda = lama ? (JSON.parse(lama) as Record<string, string>) : {};
  tunda[bahanId] = isoTanggalWib(Date.now());
  await setSetting("tunda_pengingat", JSON.stringify(tunda));
  refreshSemua();
}

// ─── Kas ─────────────────────────────────────────────────────────

async function bacaKas(fd: FormData) {
  const jenis: "setor" | "tarik" = str(fd, "jenis") === "tarik" ? "tarik" : "setor";
  const nominal = parseRupiah(fd.get("nominal"));
  if (!Number.isFinite(nominal) || nominal <= 0) return { error: "Nominal harus lebih dari 0." };
  const w = await waktuDariTanggal(str(fd, "tanggal"), str(fd, "posisi"));
  if ("error" in w) return { error: w.error };
  return { values: { waktu: w.waktu, jenis, nominal, catatan: str(fd, "catatan") || null } };
}

export async function tambahKasAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const r = await bacaKas(fd);
  if ("error" in r) return { error: r.error };
  await db.insert(kas).values(r.values);
  const info = await setelahUbah(r.values.waktu);
  return { ok: `${r.values.jenis === "setor" ? "Setor modal" : "Tarik"} tersimpan.${info}` };
}

export async function ubahKasAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const lama = await db.query.kas.findFirst({ where: eq(kas.id, id) });
  if (!lama) return { error: "Catatan tidak ditemukan." };
  const r = await bacaKas(fd);
  if ("error" in r) return { error: r.error };
  const values = str(fd, "tanggal") === isoTanggalWib(lama.waktu) && !str(fd, "posisi") ? { ...r.values, waktu: lama.waktu } : r.values;
  await db.update(kas).set(values).where(eq(kas.id, id));
  const info = await setelahUbah(lama.waktu, values.waktu);
  return { ok: `Perubahan tersimpan.${info}` };
}

export async function hapusKasAction(id: number) {
  await requireAuth();
  const row = await db.query.kas.findFirst({ where: eq(kas.id, id) });
  if (!row) return { error: "Catatan tidak ditemukan." };
  await db.delete(kas).where(eq(kas.id, id));
  await setelahUbah(row.waktu);
  return {};
}

// ─── Penjualan manual (untuk hari sebelumnya) ─────────────────────

export async function tambahPenjualanManualAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const menuId = Number(str(fd, "menu_id"));
  const m = await db.query.menu.findFirst({ where: eq(menu.id, menuId) });
  if (!m) return { error: "Pilih menunya dulu." };
  const jenis: "terjual" | "sendiri" = str(fd, "jenis") === "sendiri" ? "sendiri" : "terjual";
  if (m.jenis === "barang_jadi" && jenis === "terjual") return { error: "Barang jadi terjual dihitung saat tutup buku." };
  const n = Number(str(fd, "jumlah"));
  if (!Number.isInteger(n) || n <= 0) return { error: "Jumlah harus angka bulat lebih dari 0." };
  const jumlah = str(fd, "kurangi") ? -n : n;

  const iso = str(fd, "tanggal");
  const w = await waktuDariTanggal(iso, str(fd, "posisi"));
  if ("error" in w) return { error: w.error };

  if (jumlah < 0) {
    const dari = awalHariWib(iso);
    const rows = await db
      .select()
      .from(tapEvent)
      .where(
        and(eq(tapEvent.menuId, menuId), eq(tapEvent.jenis, jenis), gt(tapEvent.waktu, dari - 1), lt(tapEvent.waktu, dari + 86400000)),
      );
    const totalHariItu = rows.reduce((a, r) => a + r.delta, 0);
    if (totalHariItu + jumlah < 0) return { error: `Tidak bisa dikurangi ${-jumlah}: total tanggal itu baru ${totalHariItu}.` };
  }

  await db.insert(tapEvent).values({ waktu: w.waktu, menuId, jenis, delta: jumlah, manual: true });
  const info = await setelahUbah(w.waktu);
  return { ok: `Tersimpan: ${m.nama} ${jenis} ${jumlah > 0 ? "+" : ""}${jumlah} untuk ${iso}.${info}` };
}

export async function hapusPenjualanManualAction(id: number) {
  await requireAuth();
  const row = await db.query.tapEvent.findFirst({ where: and(eq(tapEvent.id, id), eq(tapEvent.manual, true)) });
  if (!row) return { error: "Catatan tidak ditemukan." };
  await db.delete(tapEvent).where(eq(tapEvent.id, id));
  await setelahUbah(row.waktu);
  return {};
}

// ─── Tutup Buku ──────────────────────────────────────────────────

// Cash selalu disetor ke kantong sebelum tutup buku, jadi cash_belum_disetor disimpan 0.
export type TutupBukuInput = { saldo: number; sisa: Record<number, number> };

async function hitungTutupBuku(input: TutupBukuInput, waktu: number) {
  const terakhir = await getTutupTerakhir();
  if (!terakhir) throw new Error("Setup belum selesai.");
  const data = await getDataPeriode(awalData(terakhir), waktu);
  return hitungPeriode(
    { saldoKantong: terakhir.saldoKantong, cashBelumDisetor: terakhir.cashBelumDisetor, stok: stokDari(terakhir) },
    { waktu, saldoKantong: input.saldo, cashBelumDisetor: 0, sisa: input.sisa },
    data,
  );
}

function validasiTutupBuku(input: TutupBukuInput): string | null {
  if (!Number.isFinite(input.saldo) || input.saldo < 0) return "Saldo kantong tidak valid.";
  for (const n of Object.values(input.sisa)) if (!Number.isInteger(n) || n < 0) return "Sisa stok tidak valid.";
  return null;
}

export async function previewTutupBukuAction(
  input: TutupBukuInput,
): Promise<{ error: string } | { hasil: HasilPeriode }> {
  await requireAuth();
  const err = validasiTutupBuku(input);
  if (err) return { error: err };
  return { hasil: await hitungTutupBuku(input, Date.now()) };
}

export async function simpanTutupBukuAction(input: TutupBukuInput): Promise<{ error: string } | undefined> {
  await requireAuth();
  const err = validasiTutupBuku(input);
  if (err) return { error: err };
  const waktu = Date.now();
  const hasil = await hitungTutupBuku(input, waktu);
  const [row] = await db
    .insert(tutupBuku)
    .values({
      waktu,
      saldoKantong: input.saldo,
      cashBelumDisetor: 0,
      stokJson: JSON.stringify(hasil.stok),
      hasilJson: JSON.stringify(hasil),
    })
    .returning({ id: tutupBuku.id });
  refreshSemua();
  redirect(`/laporan/${row.id}`);
}

// ─── Bahan ───────────────────────────────────────────────────────

function bacaBahan(fd: FormData) {
  const nama = str(fd, "nama");
  if (!nama) return { error: "Nama bahan wajib diisi." };
  const satuan: "gr" | "pcs" = str(fd, "satuan") === "pcs" ? "pcs" : "gr";
  const hargaAwal = parseDesimal(fd.get("harga_awal"));
  if (!Number.isFinite(hargaAwal) || hargaAwal < 0) return { error: `Harga awal per ${satuan} tidak valid.` };
  return { values: { nama, satuan, hargaAwal } };
}

export async function tambahBahanAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const r = bacaBahan(fd);
  if ("error" in r) return { error: r.error };
  const [row] = await db.insert(bahan).values(r.values).returning({ id: bahan.id });
  refreshSemua();
  redirect(`/lainnya/bahan/${row.id}`);
}

export async function ubahBahanAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const r = bacaBahan(fd);
  if ("error" in r) return { error: r.error };
  await db.update(bahan).set(r.values).where(eq(bahan.id, id));
  // Harga awal dipakai sebelum ada pembelian aktif → bisa memengaruhi HPP lama
  const info = await setelahUbah(0);
  return { ok: `Bahan disimpan.${info}` };
}

export async function hapusBahanAction(id: number): Promise<{ error?: string }> {
  await requireAuth();
  const ctx = await getHppCtx();
  if (ctx.belanja.some((b) => b.bahanId === id)) return { error: "Bahan ini sudah punya catatan belanja, tidak bisa dihapus." };
  if (ctx.resep.some((r) => r.isi.some((x) => x.bahanId === id))) return { error: "Bahan ini dipakai di resep, tidak bisa dihapus." };
  await db.delete(bahanAktif).where(eq(bahanAktif.bahanId, id));
  await db.delete(bahan).where(eq(bahan.id, id));
  refreshSemua();
  redirect("/lainnya/bahan");
}

// ─── Menu ────────────────────────────────────────────────────────

/** Simpan menu baru (`id` null) atau perubahan. Harga & resep baru berlaku sejak sekarang (riwayat tidak ditimpa). */
export async function simpanMenuAction(id: number | null, _: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const nama = str(fd, "nama");
  if (!nama) return { error: "Nama menu wajib diisi." };
  const lama = id ? await db.query.menu.findFirst({ where: eq(menu.id, id) }) : undefined;
  if (id && !lama) return { error: "Menu tidak ditemukan." };
  const jenis: "racikan" | "barang_jadi" = lama?.jenis ?? (str(fd, "jenis") === "barang_jadi" ? "barang_jadi" : "racikan");
  const hargaJual = parseRupiah(fd.get("harga_jual"));
  if (!Number.isFinite(hargaJual) || hargaJual < 0) return { error: "Harga jual tidak valid." };
  const urutan = Number(str(fd, "urutan") || 0);

  // Resep: pasangan bahan_id[] + takaran[]
  const bahanIds = fd.getAll("bahan_id").map(Number);
  const takaran = fd.getAll("takaran").map(parseDesimal);
  const isi: { bahanId: number; takaran: number }[] = [];
  if (jenis === "racikan") {
    for (let i = 0; i < bahanIds.length; i++) {
      if (!bahanIds[i]) continue;
      if (!Number.isFinite(takaran[i]) || takaran[i] <= 0) return { error: "Takaran tiap bahan harus lebih dari 0." };
      if (isi.some((x) => x.bahanId === bahanIds[i])) return { error: "Ada bahan yang dimasukkan dua kali." };
      isi.push({ bahanId: bahanIds[i], takaran: takaran[i] });
    }
  }

  const now = Date.now();
  let menuId = id;
  if (lama) {
    await db.update(menu).set({ nama, urutan }).where(eq(menu.id, lama.id));
  } else {
    const [row] = await db.insert(menu).values({ nama, jenis, urutan, aktif: true }).returning({ id: menu.id });
    menuId = row.id;
  }
  const mid = menuId!;

  // Harga jual: baris baru bila berubah (menu baru berlaku sejak awal)
  const semuaHarga = await getSemuaHarga();
  if (!lama || hargaPada(semuaHarga, mid, now) !== hargaJual) {
    await db.insert(harga).values({ menuId: mid, nilai: hargaJual, berlakuMulai: lama ? now : 0 });
  }

  // Resep: versi baru bila berubah. Versi pertama yang berisi berlaku sejak awal, supaya tap lama
  // ikut memakai HPP dari resep (sebelumnya HPP 0).
  let paling = Infinity;
  if (jenis === "racikan") {
    const ctx = await getHppCtx();
    const sekarang = resepPada(ctx, mid, now);
    const sama = JSON.stringify(sekarang) === JSON.stringify(isi);
    if (!sama) {
      const pernahBerisi = ctx.resep.some((r) => r.menuId === mid && r.isi.length > 0);
      const mulai = pernahBerisi ? now : 0;
      if (!pernahBerisi) await db.delete(resep).where(eq(resep.menuId, mid));
      await db.insert(resep).values({ menuId: mid, berlakuMulai: mulai, isiJson: JSON.stringify(isi) });
      paling = mulai;
    }
  }
  const info = Number.isFinite(paling) ? await setelahUbah(paling) : (refreshSemua(), "");
  if (!lama) redirect(`/lainnya/menu/${mid}?baru=1`);
  return { ok: `Menu disimpan.${info}` };
}

export async function aturAktifMenuAction(id: number, aktif: boolean) {
  await requireAuth();
  await db.update(menu).set({ aktif }).where(eq(menu.id, id));
  refreshSemua();
}

// ─── Pengaturan ──────────────────────────────────────────────────

/** Hitung ulang hasil semua tutup buku dengan rumus terbaru (juga setelah data diubah langsung di DB). */
export async function hitungUlangSemuaAction(): Promise<FormState> {
  await requireAuth();
  const n = await hitungUlangSejak(0);
  refreshSemua();
  return { ok: `${n} laporan dihitung ulang.` };
}

export async function gantiPinAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const cek = await cekPin(str(fd, "pin_lama"));
  if (!cek.ok) return { error: cek.pesan };
  const baru = str(fd, "pin_baru");
  if (!isValidPin(baru)) return { error: "PIN baru harus 4–6 digit angka." };
  if (baru !== str(fd, "pin_baru2")) return { error: "Konfirmasi PIN baru tidak sama." };
  await setSetting("pin_hash", await hashPin(baru));
  return { ok: "PIN berhasil diganti." };
}

/**
 * Batalkan tutup buku terakhir: barisnya dihapus sehingga periodenya menyatu lagi dengan periode
 * berjalan. Catatan (belanja, kas, tap) tidak ikut terhapus. Hanya tutup buku terakhir yang boleh,
 * jadi tidak ada periode sesudahnya yang perlu dihitung ulang. Setup awal tidak bisa dibatalkan.
 */
export async function batalkanTutupBukuAction(id: number): Promise<{ error: string } | undefined> {
  await requireAuth();
  const terakhir = await getTutupTerakhir();
  if (!terakhir || terakhir.id !== id) return { error: "Hanya tutup buku terakhir yang bisa dibatalkan." };
  if (terakhir.hasilJson === null) return { error: "Setup awal tidak bisa dibatalkan." };
  await db.delete(tutupBuku).where(eq(tutupBuku.id, id));
  refreshSemua();
  redirect("/laporan");
}
