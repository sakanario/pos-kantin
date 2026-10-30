import "server-only";
import { createHash } from "node:crypto";

// Midtrans Core API (CR-005 Tahap 3b): QRIS & GoPay. Kunci di env MIDTRANS_SERVER_KEY; sandbox kecuali
// MIDTRANS_PRODUCTION=true. Webhook di /api/gateway.

export const midtransProduksi = process.env.MIDTRANS_PRODUCTION === "true";
const BASE = midtransProduksi ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

/** Potongan (MDR) per cara bayar; gateway tidak menyebutnya per transaksi, jadi dihitung sendiri. */
export const TARIF_POTONGAN = { qris: 0.007, gopay: 0.02 } as const;
export type MetodeMidtrans = keyof typeof TARIF_POTONGAN;

const kunci = () => process.env.MIDTRANS_SERVER_KEY ?? "";

type Jawaban = {
  status_code: string;
  status_message?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_status?: string;
  fraud_status?: string;
  settlement_time?: string;
  qr_string?: string;
  actions?: { name: string; url: string }[];
};

async function panggil(path: string, body?: unknown): Promise<Jawaban> {
  const res = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(kunci() + ":").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => null)) as Jawaban | null;
  if (!j) throw new Error(`Midtrans ${path}: HTTP ${res.status}`);
  return j;
}

const sukses = (j: Jawaban) => j.status_code?.startsWith("2");
const aksi = (j: Jawaban, nama: string) => j.actions?.find((a) => a.name === nama)?.url ?? null;
/** Sisa masa bayar dalam menit (Midtrans minta bilangan bulat, minimal 1). */
const menit = (sisaMs: number) => Math.max(1, Math.ceil(sisaMs / 60000));

export async function tagihQris(orderId: string, total: number, sisaMs: number) {
  const j = await panggil("/v2/charge", {
    payment_type: "qris",
    transaction_details: { order_id: orderId, gross_amount: total },
    qris: { acquirer: "gopay" },
    custom_expiry: { expiry_duration: menit(sisaMs), unit: "minute" },
  });
  if (!sukses(j) || !j.qr_string) throw new Error(`Midtrans QRIS ${orderId}: ${j.status_code} ${j.status_message}`);
  return { orderId, qr: j.qr_string, qrUrl: aksi(j, "generate-qr-code") };
}

export async function tagihGopay(orderId: string, total: number, sisaMs: number, kembaliKe: string) {
  const j = await panggil("/v2/charge", {
    payment_type: "gopay",
    transaction_details: { order_id: orderId, gross_amount: total },
    gopay: { enable_callback: true, callback_url: kembaliKe },
    custom_expiry: { expiry_duration: menit(sisaMs), unit: "minute" },
  });
  const deeplink = aksi(j, "deeplink-redirect");
  if (!sukses(j) || !deeplink) throw new Error(`Midtrans GoPay ${orderId}: ${j.status_code} ${j.status_message}`);
  return { orderId, deeplink };
}

/** Status transaksi langsung dari Midtrans (null = order_id tidak dikenal). */
export async function statusMidtrans(orderId: string): Promise<Jawaban | null> {
  const j = await panggil(`/v2/${encodeURIComponent(orderId)}/status`);
  if (j.status_code === "404") return null;
  if (!sukses(j) && !j.transaction_status) throw new Error(`Midtrans status ${orderId}: ${j.status_code} ${j.status_message}`);
  return j;
}

/** Batalkan tagihan yang belum dibayar (supaya QR / GoPay pesanan batal tidak bisa dibayar). Tidak melempar error. */
export async function batalkanTagihan(orderId: string) {
  try {
    await panggil(`/v2/${encodeURIComponent(orderId)}/cancel`, {});
  } catch (e) {
    console.error("Midtrans cancel", orderId, e);
  }
}

export const lunasMidtrans = (j: Jawaban) =>
  j.transaction_status === "settlement" || (j.transaction_status === "capture" && j.fraud_status === "accept");

/** Tanda tangan notifikasi: SHA512(order_id + status_code + gross_amount + server key). */
export function tandaTanganSah(n: { order_id?: unknown; status_code?: unknown; gross_amount?: unknown; signature_key?: unknown }) {
  if (typeof n.signature_key !== "string" || !kunci()) return false;
  const harap = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${kunci()}`).digest("hex");
  return harap === n.signature_key;
}

/** Waktu Midtrans ("2026-10-30 10:12:33", WIB) → epoch ms. */
export function waktuMidtrans(s: string | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s.replace(" ", "T") + "+07:00");
  return Number.isFinite(t) ? t : null;
}

/** `<kode>-qris` / `<kode>-gopay` → kode pesanan. */
export function kodeDariOrderId(orderId: string) {
  const m = /^([a-z0-9]+)-(qris|gopay)$/.exec(orderId);
  return m ? m[1] : null;
}
