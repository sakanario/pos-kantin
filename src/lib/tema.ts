/** Pilihan tampilan per perangkat (cookie): terang, gelap, atau ikut setelan HP. */
export type Tema = "terang" | "gelap" | "hp";

export const COOKIE_TEMA = "tema";

/** Tema halaman pembeli (/pesan): terpisah dari tema pengguna, bawaan terang, tidak ikut setelan HP. */
export type TemaPembeli = "terang" | "gelap";
export const COOKIE_TEMA_PEMBELI = "tema_pembeli";
/** Header yang dipasang proxy.ts untuk request halaman pembeli. */
export const HEADER_AREA = "x-area";

export function isTema(v: unknown): v is Tema {
  return v === "terang" || v === "gelap" || v === "hp";
}

/** Nilai atribut `data-theme` di <html>; "hp" tidak memasang atribut (CSS memakai prefers-color-scheme). */
export function dataTheme(t: Tema): "light" | "dark" | undefined {
  return t === "terang" ? "light" : t === "gelap" ? "dark" : undefined;
}

/** Warna bilah status HP per tema (sama dengan token `bg`). */
export const WARNA_BAR = { light: "#ddd2c4", dark: "#1b1310" } as const;
