import Link from "next/link";
import { rupiah } from "@/lib/format";
import { LABEL_STATUS, type PesananLengkap } from "@/lib/pesanan";

export const ringkasItem = (p: PesananLengkap) =>
  p.item.map((i) => `${i.qty}× ${i.nama}${i.lessSugar ? " (less sugar)" : ""}`).join(", ");

/**
 * Satu baris pesanan di daftar (Selesai hari ini, Riwayat Pesanan); ketuk → detail. `jam`: jam bayar di depan item.
 */
export function BarisPesanan({ p, jam }: { p: PesananLengkap; jam?: string }) {
  return (
    <li>
      <Link href={`/lainnya/riwayat-pesanan/${p.id}`} className="flex items-center gap-3 py-2.5 pl-4 pr-3 text-sm">
        <span className="num w-9 font-display font-bold">#{p.nomor}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            {p.nama}
            {p.cara === "delivery" && <span className="ml-1.5 text-xs text-muted">🛵</span>}
          </span>
          <span className="block truncate text-xs text-muted">
            {jam && <span className="num">{jam} · </span>}
            {ringkasItem(p)}
          </span>
        </span>
        <span className="text-right">
          <span className={`num block ${p.status === "batal" ? "text-muted line-through" : ""}`}>{rupiah(p.total)}</span>
          <span className={`block text-xs ${p.status === "batal" ? "text-bad" : "text-muted"}`}>
            {LABEL_STATUS[p.status]}
            {p.refundDari && ` · refund ${p.refundDari === "kantong" ? "Kantong" : "pribadi"}`}
          </span>
        </span>
        <span className="text-muted" aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
}
