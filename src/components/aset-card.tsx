import Link from "next/link";
import { getBep, getUangBarang } from "@/lib/data";
import { plus, rupiah, tanggal } from "@/lib/format";

/** Ringkasan uang & barang di Laporan: tunai + barang jualan + bahan, dibanding modal yang masuk (spec §4.8). */
export async function AsetCard() {
  const [u, bep] = await Promise.all([getUangBarang(), getBep()]);
  if (!u || !bep) return null;
  const total = u.saldo + u.totalBarang + u.totalBahan;
  // Posisi balik modal (uang nyata) ditambah barang & bahan yang masih ada
  const posisi = bep.posisi + u.totalBarang + u.totalBahan;

  return (
    <Link href="/lainnya/uang-barang" className="card block space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">Uang & barang</h2>
        <span className="text-xs text-muted">per tutup buku {tanggal(u.waktu)} ›</span>
      </div>
      <div className="num font-display text-2xl font-extrabold">±{rupiah(total)}</div>
      <p className="num text-sm text-muted">
        <span className="whitespace-nowrap">Tunai {rupiah(u.saldo)}</span> ·{" "}
        <span className="whitespace-nowrap">Barang {rupiah(u.totalBarang)}</span> ·{" "}
        <span className="whitespace-nowrap">Bahan ±{rupiah(u.totalBahan)}</span>
      </p>
      {!bep.belumTutupBuku && (
        <div className="num border-t border-line pt-1 text-sm">
          <div className="flex justify-between gap-3">
            <span>
              Dibanding modal masuk <span className="whitespace-nowrap">{rupiah(bep.modalMasuk)}</span>
            </span>
            <span className={`whitespace-nowrap font-semibold ${posisi < 0 ? "text-bad" : "text-good"}`}>{plus(posisi)}</span>
          </div>
          <span className="block text-xs text-muted">
            {posisi < 0
              ? "Belum kembali, walau barang & bahan dihitung."
              : "Kalau barang & bahan dihitung. Yang berupa uang tunai baru " + rupiah(u.saldo) + "."}
          </span>
        </div>
      )}
    </Link>
  );
}
