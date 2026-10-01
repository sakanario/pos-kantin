/** Pilihan tampilan per perangkat (cookie): terang, gelap, atau ikut setelan HP. */
export type Tema = "terang" | "gelap" | "hp";

export const COOKIE_TEMA = "tema";

export function isTema(v: unknown): v is Tema {
  return v === "terang" || v === "gelap" || v === "hp";
}

/** Nilai atribut `data-theme` di <html>; "hp" tidak memasang atribut (CSS memakai prefers-color-scheme). */
export function dataTheme(t: Tema): "light" | "dark" | undefined {
  return t === "terang" ? "light" : t === "gelap" ? "dark" : undefined;
}
