import Link from "next/link";
import type { Belanja } from "@/db/schema";
import { rupiah, tanggal } from "@/lib/format";

export const labelKategori = { bahan: "🧂 Bahan", barang: "🍫 Barang jadi", lain: "📦 Lain-lain" } as const;

/** Daftar belanja. Tiap baris membuka halaman edit. */
export function BelanjaList({ items, kosong = "Belum ada belanja." }: { items: Belanja[]; kosong?: string }) {
  if (items.length === 0) return <p className="card text-sm text-muted">{kosong}</p>;
  return (
    <ul className="card divide-y divide-line p-0">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/catat/belanja/${b.id}`} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{b.nama}</div>
              <div className="text-xs text-muted">
                {labelKategori[b.kategori]} · {tanggal(b.waktu)}
                {b.qtyPcs ? ` · ${b.qtyPcs} pcs @${rupiah(b.total / b.qtyPcs)}` : ""}
                {b.kategori === "bahan" && b.bahanId === null ? " · belum ditandai" : ""}
                {b.sumber === "pribadi" ? " · dibayar pribadi" : ""}
                {b.catatan ? ` · ${b.catatan}` : ""}
              </div>
            </div>
            <div className="num text-right text-sm">{rupiah(b.total)}</div>
            <span className="text-muted">›</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
