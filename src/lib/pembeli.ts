import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// Identitas HP pembeli (tanpa akun): id perangkat acak + daftar kode pesanan miliknya, di cookie.

const COOKIE_PERANGKAT = "perangkat";
const COOKIE_PESANANKU = "pesananku";
const MAKS_KODE = 40;
const opsi = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" };

export async function getPerangkat(): Promise<string | null> {
  return (await cookies()).get(COOKIE_PERANGKAT)?.value ?? null;
}

/** Hanya di server action / route handler (menulis cookie). */
export async function pastikanPerangkat(): Promise<string> {
  const jar = await cookies();
  const ada = jar.get(COOKIE_PERANGKAT)?.value;
  if (ada) return ada;
  const id = randomBytes(12).toString("base64url");
  jar.set(COOKIE_PERANGKAT, id, opsi);
  return id;
}

/** Kode pesanan yang pernah dibuat / dibuka di HP ini (terbaru dulu). */
export async function getKodePesananku(): Promise<string[]> {
  const v = (await cookies()).get(COOKIE_PESANANKU)?.value ?? "";
  return v.split(".").filter((k) => /^[a-z0-9]{6,16}$/.test(k));
}

/** Hanya di server action / route handler. Menimpa daftar kode (mis. setelah bersihkan riwayat). */
export async function aturKodePesananku(kode: string[]) {
  (await cookies()).set(COOKIE_PESANANKU, kode.slice(0, MAKS_KODE).join("."), opsi);
}

/** Hanya di server action / route handler. */
export async function ingatKode(kode: string) {
  const lama = await getKodePesananku();
  if (lama[0] === kode) return;
  const baru = [kode, ...lama.filter((k) => k !== kode)].slice(0, MAKS_KODE);
  (await cookies()).set(COOKIE_PESANANKU, baru.join("."), opsi);
}
