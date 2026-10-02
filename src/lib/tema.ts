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

/** Gaya tampilan (design system): Kantin Pop, Poster, atau Latte. Per perangkat (cookie). */
export type Gaya = "pop" | "poster" | "latte";

export const COOKIE_GAYA = "gaya";

export function isGaya(v: unknown): v is Gaya {
  return v === "pop" || v === "poster" || v === "latte";
}

/** Warna bilah status HP per gaya & tema (sama dengan token `bg`). */
export const WARNA_BAR: Record<Gaya, { light: string; dark: string }> = {
  pop: { light: "#ffdf4f", dark: "#121433" },
  poster: { light: "#f2d03f", dark: "#1f1e1b" },
  latte: { light: "#ddd2c4", dark: "#1b1310" },
};
