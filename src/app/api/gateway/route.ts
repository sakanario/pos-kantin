import { revalidatePath } from "next/cache";
import { tandaTanganSah } from "@/lib/midtrans";
import { prosesNotifikasiMidtrans } from "@/lib/pesanan";

// Webhook Midtrans (Notification URL di dashboard: https://<domain>/api/gateway). Publik, dikecualikan di proxy.ts.
// Tanda tangan dicek, lalu status dibaca ulang dari Midtrans; tandaiLunas idempoten, jadi notifikasi ganda aman.

export async function POST(request: Request) {
  const n = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!n || typeof n.order_id !== "string") return Response.json({ error: "notifikasi tidak valid" }, { status: 400 });
  if (!tandaTanganSah(n)) return Response.json({ error: "tanda tangan salah" }, { status: 403 });
  try {
    await prosesNotifikasiMidtrans(n.order_id);
  } catch (e) {
    console.error("Webhook Midtrans", n.order_id, e);
    return Response.json({ error: "gagal memproses" }, { status: 500 }); // Midtrans akan mengulang
  }
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
