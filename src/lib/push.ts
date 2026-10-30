import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { pesanan, pesananItem, pushLangganan } from "@/db/schema";

// Web push ke HP pengguna saat pesanan online lunas (CR-005 Tahap 4). Kunci VAPID di env.

export function kunciPublik(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function siap(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:kantin@example.com", pub, priv);
  return true;
}

export type Langganan = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function simpanLangganan(sub: Langganan, perangkat: string) {
  const values = { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, perangkat, dibuat: Date.now() };
  await db
    .insert(pushLangganan)
    .values(values)
    .onConflictDoUpdate({ target: pushLangganan.endpoint, set: { p256dh: values.p256dh, auth: values.auth, perangkat } });
}

export async function hapusLangganan(endpoint: string) {
  await db.delete(pushLangganan).where(eq(pushLangganan.endpoint, endpoint));
}

export async function jumlahLangganan(): Promise<number> {
  return (await db.select({ id: pushLangganan.id }).from(pushLangganan)).length;
}

/**
 * Kirim ke semua HP yang berlangganan. Langganan yang ditolak layanan push (404/410: sudah tidak berlaku)
 * dihapus otomatis. Tidak pernah melempar error: notifikasi gagal tidak boleh menggagalkan pencatatan lunas.
 */
export async function kirimKeSemua(isi: { title: string; body: string; url: string; tag?: string }) {
  try {
    if (!siap()) return { terkirim: 0, gagal: 0 };
    const semua = await db.select().from(pushLangganan);
    const mati: number[] = [];
    let terkirim = 0;
    await Promise.all(
      semua.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(isi), {
            TTL: 60 * 60,
            urgency: "high",
          });
          terkirim++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) mati.push(s.id);
        }
      }),
    );
    if (mati.length) await db.delete(pushLangganan).where(inArray(pushLangganan.id, mati));
    return { terkirim, gagal: semua.length - terkirim };
  } catch {
    return { terkirim: 0, gagal: 0 };
  }
}

/** "Pesanan #7 · Budi · 1× Kopi Susu SKM", ketuk → /pesanan. */
export async function kabariPesananLunas(pesananId: number) {
  const p = await db.query.pesanan.findFirst({ where: eq(pesanan.id, pesananId) });
  if (!p) return;
  const item = await db.select().from(pesananItem).where(eq(pesananItem.pesananId, pesananId));
  const isi = item.map((i) => `${i.qty}× ${i.nama}${i.lessSugar ? " (less sugar)" : ""}`).join(", ");
  await kirimKeSemua({
    title: `Pesanan #${p.nomor} · ${p.nama}`,
    body: `${isi}${p.cara === "delivery" ? " · Delivery" : ""}`,
    url: "/pesanan",
    tag: `pesanan-${p.id}`,
  });
}
