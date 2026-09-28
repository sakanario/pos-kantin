"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { belanja, harga, kas, tapEvent, tutupBuku } from "@/db/schema";
import { cekPin, endSession, hashPin, isValidPin, requireAuth, startSession } from "@/lib/auth";
import { hitungPeriode, type HasilPeriode } from "@/lib/calc";
import { getDataPeriode, getTutupTerakhir } from "@/lib/data";
import { awalHariWib, isoTanggalWib, parseRupiah } from "@/lib/format";
import { getIsiPerDus, isSetupDone, setSetting } from "@/lib/settings";

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
  const isiDus = parseRupiah(fd.get("isi_dus"));
  const stokBb = parseRupiah(fd.get("stok_bb"));
  const hargaDus = parseRupiah(fd.get("harga_dus"));
  const jualBb = parseRupiah(fd.get("jual_bb"));
  const jualKopi = parseRupiah(fd.get("jual_kopi"));
  const hppKopi = parseRupiah(fd.get("hpp_kopi"));

  for (const [nama, v] of Object.entries({ saldo, isiDus, stokBb, hargaDus, jualBb, jualKopi, hppKopi })) {
    if (!Number.isFinite(v) || v < 0) return { error: `Isian "${nama}" tidak valid.` };
  }
  if (isiDus <= 0) return { error: "Isi per dus harus lebih dari 0." };

  const now = Date.now();
  await setSetting("pin_hash", await hashPin(pin));
  await setSetting("isi_per_dus", String(isiDus));
  await db.insert(harga).values([
    { produk: "bb", jenis: "jual", nilai: jualBb, berlakuMulai: 0 },
    { produk: "kopi", jenis: "jual", nilai: jualKopi, berlakuMulai: 0 },
    { produk: "kopi", jenis: "hpp", nilai: hppKopi, berlakuMulai: 0 },
  ]);
  await db.insert(tutupBuku).values({
    waktu: now,
    saldoKantong: saldo,
    sisaBb: stokBb,
    cashBelumDisetor: 0,
    avgModalBb: hargaDus / isiDus,
    hasilJson: null,
  });
  await setSetting("setup_done", "1");
  await startSession();
  redirect("/");
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

export async function tapAction(jenis: "kopi" | "kopi_sendiri" | "bb_sendiri", delta: 1 | -1) {
  await requireAuth();
  const terakhir = await getTutupTerakhir();
  if (!terakhir) return { error: "Setup belum selesai." };

  if (delta === -1) {
    const rows = await db
      .select()
      .from(tapEvent)
      .where(and(eq(tapEvent.jenis, jenis), gt(tapEvent.waktu, terakhir.waktu)));
    const total = rows.reduce((a, r) => a + r.delta, 0);
    if (total <= 0) return { error: "Belum ada yang bisa dikurangi di periode ini." };
  }

  await db.insert(tapEvent).values({ waktu: Date.now(), jenis, delta });
  refreshSemua();
  return {};
}

// ─── Waktu catatan ───────────────────────────────────────────────

/**
 * Ubah input tanggal (YYYY-MM-DD, WIB) jadi waktu catatan.
 * Hari ini → sekarang. Hari lain → jam 12:00 WIB, tapi tidak boleh sebelum tutup buku terakhir.
 */
async function waktuDariTanggal(iso: string): Promise<{ waktu: number } | { error: string }> {
  const now = Date.now();
  const terakhir = await getTutupTerakhir();
  if (!terakhir) return { error: "Setup belum selesai." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { error: "Tanggal tidak valid." };

  const hariIni = isoTanggalWib(now);
  if (iso > hariIni) return { error: "Tanggal tidak boleh di masa depan." };
  if (iso === hariIni) return { waktu: now };

  if (iso < isoTanggalWib(terakhir.waktu)) {
    return { error: "Tanggal itu sudah masuk periode yang dikunci (sebelum tutup buku terakhir)." };
  }
  return { waktu: Math.max(awalHariWib(iso) + 12 * 3600000, terakhir.waktu + 1) };
}

async function pastikanBelumDikunci(waktu: number) {
  const terakhir = await getTutupTerakhir();
  return terakhir !== undefined && waktu > terakhir.waktu;
}

// ─── Belanja ─────────────────────────────────────────────────────

export async function tambahBelanjaAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const kategori = str(fd, "kategori") as "bb" | "kopi" | "lain";
  if (!["bb", "kopi", "lain"].includes(kategori)) return { error: "Kategori tidak valid." };
  const sumber = str(fd, "sumber") === "pribadi" ? "pribadi" : "kantong";
  const total = parseRupiah(fd.get("total"));
  if (!Number.isFinite(total) || total <= 0) return { error: "Total harga harus lebih dari 0." };

  let qtyPcs: number | null = null;
  let nama = str(fd, "nama");
  if (kategori === "bb") {
    const jumlah = parseRupiah(fd.get("jumlah"));
    if (!Number.isFinite(jumlah) || jumlah <= 0) return { error: "Jumlah Beng Beng harus lebih dari 0." };
    const satuan = str(fd, "satuan");
    qtyPcs = satuan === "dus" ? jumlah * (await getIsiPerDus()) : jumlah;
    if (!nama) nama = satuan === "dus" ? `Beng Beng ${jumlah} dus` : `Beng Beng ${jumlah} pcs`;
  }
  if (!nama) return { error: "Nama barang wajib diisi." };

  const w = await waktuDariTanggal(str(fd, "tanggal"));
  if ("error" in w) return { error: w.error };

  await db.insert(belanja).values({
    waktu: w.waktu,
    kategori,
    nama,
    qtyPcs,
    total,
    sumber,
    catatan: str(fd, "catatan") || null,
  });
  refreshSemua();
  return { ok: `Tersimpan: ${nama}` };
}

export async function hapusBelanjaAction(id: number) {
  await requireAuth();
  const row = await db.query.belanja.findFirst({ where: eq(belanja.id, id) });
  if (!row || !(await pastikanBelumDikunci(row.waktu))) return { error: "Catatan sudah dikunci." };
  await db.delete(belanja).where(eq(belanja.id, id));
  refreshSemua();
  return {};
}

// ─── Kas ─────────────────────────────────────────────────────────

export async function tambahKasAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const jenis = str(fd, "jenis") === "tarik" ? "tarik" : "setor";
  const nominal = parseRupiah(fd.get("nominal"));
  if (!Number.isFinite(nominal) || nominal <= 0) return { error: "Nominal harus lebih dari 0." };
  const w = await waktuDariTanggal(str(fd, "tanggal"));
  if ("error" in w) return { error: w.error };
  await db.insert(kas).values({ waktu: w.waktu, jenis, nominal, catatan: str(fd, "catatan") || null });
  refreshSemua();
  return { ok: jenis === "setor" ? "Setor modal tersimpan." : "Tarik tersimpan." };
}

export async function hapusKasAction(id: number) {
  await requireAuth();
  const row = await db.query.kas.findFirst({ where: eq(kas.id, id) });
  if (!row || !(await pastikanBelumDikunci(row.waktu))) return { error: "Catatan sudah dikunci." };
  await db.delete(kas).where(eq(kas.id, id));
  refreshSemua();
  return {};
}

// ─── Tutup Buku ──────────────────────────────────────────────────

export type TutupBukuInput = { saldo: number; sisaBb: number; cash: number };

async function hitungTutupBuku(input: TutupBukuInput, waktu: number) {
  const terakhir = await getTutupTerakhir();
  if (!terakhir) throw new Error("Setup belum selesai.");
  const data = await getDataPeriode(terakhir.waktu, waktu);
  return hitungPeriode(
    {
      saldoKantong: terakhir.saldoKantong,
      sisaBb: terakhir.sisaBb,
      cashBelumDisetor: terakhir.cashBelumDisetor,
      avgModalBb: terakhir.avgModalBb,
    },
    { waktu, saldoKantong: input.saldo, sisaBb: input.sisaBb, cashBelumDisetor: input.cash },
    data,
  );
}

function validasiTutupBuku(input: TutupBukuInput): string | null {
  if (!Number.isFinite(input.saldo) || input.saldo < 0) return "Saldo kantong tidak valid.";
  if (!Number.isInteger(input.sisaBb) || input.sisaBb < 0) return "Sisa Beng Beng tidak valid.";
  if (!Number.isFinite(input.cash) || input.cash < 0) return "Cash belum disetor tidak valid.";
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
      sisaBb: input.sisaBb,
      cashBelumDisetor: input.cash,
      avgModalBb: hasil.avgModalBb,
      hasilJson: JSON.stringify(hasil),
    })
    .returning({ id: tutupBuku.id });
  refreshSemua();
  redirect(`/laporan/${row.id}`);
}

// ─── Pengaturan ──────────────────────────────────────────────────

export async function ubahHargaAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const key = str(fd, "key");
  const map = {
    jual_bb: { produk: "bb", jenis: "jual" },
    jual_kopi: { produk: "kopi", jenis: "jual" },
    hpp_kopi: { produk: "kopi", jenis: "hpp" },
  } as const;
  const target = map[key as keyof typeof map];
  if (!target) return { error: "Jenis harga tidak valid." };
  const nilai = parseRupiah(fd.get("nilai"));
  if (!Number.isFinite(nilai) || nilai < 0) return { error: "Harga tidak valid." };
  await db.insert(harga).values({ ...target, nilai, berlakuMulai: Date.now() });
  refreshSemua();
  return { ok: "Harga diperbarui, berlaku mulai sekarang." };
}

export async function ubahIsiDusAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const n = parseRupiah(fd.get("isi_dus"));
  if (!Number.isInteger(n) || n <= 0) return { error: "Isi per dus harus angka lebih dari 0." };
  await setSetting("isi_per_dus", String(n));
  refreshSemua();
  return { ok: "Isi per dus diperbarui." };
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
