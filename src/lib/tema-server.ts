import { cookies, headers } from "next/headers";
import { COOKIE_TEMA, COOKIE_TEMA_PEMBELI, dataTheme, HEADER_AREA, isTema, type Tema, type TemaPembeli } from "./tema";

export async function getTema(): Promise<Tema> {
  const v = (await cookies()).get(COOKIE_TEMA)?.value;
  return isTema(v) ? v : "hp";
}

export async function getTemaPembeli(): Promise<TemaPembeli> {
  return (await cookies()).get(COOKIE_TEMA_PEMBELI)?.value === "gelap" ? "gelap" : "terang";
}

/**
 * `data-theme` untuk <html>: halaman pembeli (/pesan, ditandai proxy) selalu terang/gelap sesuai pilihan pembeli
 * (bawaan terang); halaman lain mengikuti Setelan (bisa "ikut HP" = tanpa atribut).
 */
export async function getDataThemeHalaman(): Promise<"light" | "dark" | undefined> {
  if ((await headers()).get(HEADER_AREA) === "pembeli") return (await getTemaPembeli()) === "gelap" ? "dark" : "light";
  return dataTheme(await getTema());
}
