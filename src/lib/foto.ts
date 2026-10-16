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

/** URL foto; berubah setiap foto diganti sehingga boleh di-cache selamanya. */
export function urlFoto(menuId: number, versi: number) {
  return `/pesan/foto/${menuId}?v=${versi}`;
}
