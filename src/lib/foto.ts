import type { CSSProperties } from "react";

/** Foto menu katalog: dikecilkan di browser lalu disimpan mentah (BLOB) di tabel menu. */

export const FOTO_SISI_MAKS = 800; // px, sisi terpanjang
export const FOTO_MAKS_BYTE = 400 * 1024;

/** Jenis gambar dari byte awal; hanya WebP & JPEG (hasil kompres di browser) yang diterima. */
export function jenisFoto(b: Uint8Array): "image/webp" | "image/jpeg" | null {
  const ascii = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
  if (b.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

/** Bingkai thumbnail: titik fokus (x, y dalam % foto) dan zoom. Foto asli tidak diubah. */
export type AturFoto = { x: number; y: number; z: number };
export const ATUR_BAWAAN: AturFoto = { x: 50, y: 50, z: 1 };
export const ZOOM_MAKS = 3;

const batas = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

/** Rapikan nilai dari DB / input (selalu dalam batas). */
export function rapikanAtur(v: unknown): AturFoto {
  const o = (v ?? {}) as Partial<AturFoto>;
  return {
    x: Math.round(batas(o.x, 0, 100, 50) * 10) / 10,
    y: Math.round(batas(o.y, 0, 100, 50) * 10) / 10,
    z: Math.round(batas(o.z, 1, ZOOM_MAKS, 1) * 100) / 100,
  };
}

export function bacaAtur(json: string | null): AturFoto {
  if (!json) return ATUR_BAWAAN;
  try {
    return rapikanAtur(JSON.parse(json));
  } catch {
    return ATUR_BAWAAN;
  }
}

/**
 * Gaya <img> di dalam kotak overflow-hidden: object-fit cover, titik (x%, y%) foto ditaruh di (x%, y%) kotak, lalu
 * diperbesar di sekitar titik itu. Semua dalam %, jadi hasilnya sama di ukuran mana pun dan tepi kosong tidak
 * pernah terlihat.
 */
export function gayaFoto(a: AturFoto): CSSProperties {
  return {
    objectFit: "cover",
    objectPosition: `${a.x}% ${a.y}%`,
    transform: a.z !== 1 ? `scale(${a.z})` : undefined,
    transformOrigin: `${a.x}% ${a.y}%`,
  };
}

/**
 * Ruang geser (px) di kotak `sisi` px: bagian foto yang keluar kotak setelah object-fit cover lalu zoom `z`.
 * Sama dengan cara gayaFoto menaruh foto: kiri foto = −(x/100) × ruang.x.
 */
export function ruangGeser(u: { w: number; h: number } | null, sisi: number, z: number) {
  if (!u || !u.w || !u.h) return { x: 0, y: 0 };
  const s = Math.max(sisi / u.w, sisi / u.h) * z;
  return { x: Math.max(0, u.w * s - sisi), y: Math.max(0, u.h * s - sisi) };
}

/**
 * Titik fokus baru setelah diseret (dx, dy) px dari titik awal `awal`: foto bergerak tepat sejauh jari.
 * Seret ke kanan = kiri foto naik dx = x berkurang dx / ruang × 100. Tanpa ruang di satu sisi = tidak bergeser.
 */
export function geserAtur(awal: { x: number; y: number }, ruang: { x: number; y: number }, dx: number, dy: number) {
  return {
    x: ruang.x > 0 ? awal.x - (dx / ruang.x) * 100 : awal.x,
    y: ruang.y > 0 ? awal.y - (dy / ruang.y) * 100 : awal.y,
  };
}

/** URL foto; berubah setiap foto diganti sehingga boleh di-cache selamanya. */
export function urlFoto(menuId: number, versi: number) {
  return `/pesan/foto/${menuId}?v=${versi}`;
}
