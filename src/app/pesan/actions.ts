"use server";

// Server action halaman pembeli /pesan (publik, TANPA login). Semua input dari HP pembeli divalidasi ulang di
// lib/pesanan.ts; harga selalu dari database.

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { COOKIE_TEMA_PEMBELI, type TemaPembeli } from "@/lib/tema";
import { aturKodePesananku, getKodePesananku, getPerangkat, ingatKode, pastikanPerangkat } from "@/lib/pembeli";
import {
  batalkanBelumBayar,
  buatPesanan,
  gatewayAktif,
  getPesananKode,
  getPesananKodeBanyak,
  potonganPalsu,
  sedangBerjalan,
  tandaiLunas,
  type PesananInput,
} from "@/lib/pesanan";

export async function buatPesananAction(input: PesananInput): Promise<{ kode: string } | { error: string }> {
  const perangkat = await pastikanPerangkat();
  const r = await buatPesanan(input, perangkat);
  if ("kode" in r) await ingatKode(r.kode);
  revalidatePath("/", "layout");
  return r;
}

export async function batalkanPesananAction(kode: string) {
  const perangkat = await getPerangkat();
  if (!perangkat) return;
  await batalkanBelumBayar(String(kode), perangkat);
  revalidatePath("/", "layout");
}

/** Membuka /pesan/[kode] menambahkan pesanan itu ke daftar "Pesananku" di HP ini. */
export async function ingatPesananAction(kode: string) {
  const p = await getPesananKode(String(kode));
  if (p) await ingatKode(p.kode);
}

/** Tema terang/gelap pilihan pembeli (cookie HP ini). */
export async function aturTemaPembeliAction(tema: TemaPembeli) {
  (await cookies()).set(COOKIE_TEMA_PEMBELI, tema === "gelap" ? "gelap" : "terang", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

/** Hapus pesanan selesai dari daftar "Pesananku" di HP ini saja (database tidak berubah). */
export async function bersihkanRiwayatAction() {
  const kode = await getKodePesananku();
  const semua = await getPesananKodeBanyak(kode);
  const tetap = new Set(semua.filter((p) => sedangBerjalan(p.status)).map((p) => p.kode));
  await aturKodePesananku(kode.filter((k) => tetap.has(k)));
  revalidatePath("/pesan", "layout");
}

/** Gateway palsu saja: berlaku seperti notifikasi "lunas" dari gateway. */
export async function simulasiBayarAction(kode: string): Promise<{ error?: string }> {
  if (gatewayAktif() !== "palsu") return { error: "Simulasi hanya untuk gateway palsu." };
  const p = await getPesananKode(String(kode));
  if (!p) return { error: "Pesanan tidak ditemukan." };
  if (p.status !== "menunggu_bayar") return { error: "Pesanan ini sudah tidak menunggu pembayaran." };
  await tandaiLunas({ kode: p.kode, dibayar: Date.now(), potongan: potonganPalsu(p.total), metode: "qris" });
  revalidatePath("/", "layout");
  return {};
}
