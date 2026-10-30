import { eq } from "drizzle-orm";
import { db } from "@/db";
import { menu } from "@/db/schema";
import { jenisFoto } from "@/lib/foto";

/**
 * Foto menu katalog (publik). URL memuat `?v=<foto_versi>`; ganti foto → versi baru → URL baru,
 * jadi versi yang cocok boleh di-cache selamanya oleh browser & CDN.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await db.query.menu.findFirst({
    where: eq(menu.id, Number(id)),
    columns: { foto: true, fotoVersi: true },
  });
  if (!row?.foto) return new Response("Tidak ada foto", { status: 404 });
  const bytes = new Uint8Array(row.foto);
  const v = new URL(req.url).searchParams.get("v");
  return new Response(bytes, {
    headers: {
      "Content-Type": jenisFoto(bytes) ?? "application/octet-stream",
      "Cache-Control": v === String(row.fotoVersi) ? "public, max-age=31536000, immutable" : "no-cache",
    },
  });
}
