import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSetting, setSetting } from "./settings";

export const SESSION_COOKIE = "sesi";
const SESSION_DAYS = 30;
const MAX_GAGAL = 5;
const JEDA_MS = 5 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET belum diset");
  return s ?? "dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  const expected = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return false;
  return Number(exp) > Date.now();
}

export async function startSession() {
  const exp = String(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isLoggedIn(): Promise<boolean> {
  return isValidToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Dipanggil di setiap halaman & server action yang butuh login. */
export async function requireAuth() {
  if (!(await isLoggedIn())) redirect("/login");
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export type HasilCekPin = { ok: true } | { ok: false; pesan: string };

/** Cek PIN dengan pembatasan percobaan: setelah 5x salah, jeda 5 menit. */
export async function cekPin(pin: string): Promise<HasilCekPin> {
  const kunciSampai = Number((await getSetting("pin_kunci_sampai")) ?? 0);
  if (kunciSampai > Date.now()) {
    const menit = Math.ceil((kunciSampai - Date.now()) / 60000);
    return { ok: false, pesan: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.` };
  }

  const hash = await getSetting("pin_hash");
  if (hash && (await bcrypt.compare(pin, hash))) {
    await setSetting("pin_gagal", "0");
    return { ok: true };
  }

  const gagal = Number((await getSetting("pin_gagal")) ?? 0) + 1;
  if (gagal >= MAX_GAGAL) {
    await setSetting("pin_gagal", "0");
    await setSetting("pin_kunci_sampai", String(Date.now() + JEDA_MS));
    return { ok: false, pesan: "PIN salah 5 kali. Coba lagi dalam 5 menit." };
  }
  await setSetting("pin_gagal", String(gagal));
  return { ok: false, pesan: `PIN salah (${gagal}/${MAX_GAGAL}).` };
}
