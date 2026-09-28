import type { Belanja } from "@/db/schema";
import { rupiah, tanggal } from "@/lib/format";
import { HapusButton } from "./hapus-button";

export const labelKategori = { bb: "🍫 Beng Beng", kopi: "☕ Bahan Kopi", lain: "📦 Lain-lain" } as const;

/** Daftar belanja. `bisaHapus` hanya untuk periode yang belum dikunci. */
export function BelanjaList({ items, bisaHapus = false, kosong = "Belum ada belanja." }: {
  items: Belanja[];
  bisaHapus?: boolean;
  kosong?: string;
}) {
  if (items.length === 0) return <p className="card text-sm text-muted">{kosong}</p>;
  return (
    <ul className="card divide-y divide-line p-0">
      {items.map((b) => (
        <li key={b.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{b.nama}</div>
            <div className="text-xs text-muted">
              {labelKategori[b.kategori]} · {tanggal(b.waktu)}
              {b.qtyPcs ? ` · ${b.qtyPcs} pcs @${rupiah(b.total / b.qtyPcs)}` : ""}
              {b.sumber === "pribadi" ? " · dibayar pribadi" : ""}
              {b.catatan ? ` · ${b.catatan}` : ""}
            </div>
          </div>
          <div className="num text-right text-sm">{rupiah(b.total)}</div>
          {bisaHapus && <HapusButton id={b.id} jenis="belanja" />}
        </li>
      ))}
    </ul>
  );
}
