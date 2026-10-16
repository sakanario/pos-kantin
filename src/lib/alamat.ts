import "server-only";
import { headers } from "next/headers";

/** Asal alamat (proto://host) yang sedang dipakai membuka halaman: domain Vercel / IP laptop. */
export async function alamatAsal() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || /^\d/.test(host) ? "http" : "https");
  const lokal = /^(localhost|127\.|\[::1\])/.test(host) ? "laptop" : /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host) ? "wifi" : null;
  return { asal: `${proto}://${host}`, lokal } as const;
}
