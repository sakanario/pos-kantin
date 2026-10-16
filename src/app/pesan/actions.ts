"use server";

// Server action halaman pembeli /pesan (publik, TANPA login). Semua input dari HP pembeli divalidasi ulang di
// lib/pesanan.ts; harga selalu dari database.

import { revalidatePath } from "next/cache";
import { ingatKode, pastikanPerangkat, getPerangkat } from "@/lib/pembeli";
import {
  batalkanBelumBayar,
  buatPesanan,
  gatewayAktif,
  getPesananKode,
  potonganPalsu,
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
