"use client";

import { batalkanTutupBukuAction } from "@/app/actions";
import { KonfirmasiButton } from "@/components/konfirmasi";
import { rupiah } from "@/lib/format";

export function BatalkanTutupBukuButton({ id, saldo, sisa }: { id: number; saldo: number; sisa: string[] }) {
  return (
    <div className="space-y-2">
      <KonfirmasiButton
        ya="Ya, batalkan"
        pesan={
          <div className="space-y-2">
            <p className="font-medium">Batalkan tutup buku ini?</p>
            <p>
              Laporan periode ini dihapus dan catatannya kembali ke periode berjalan. Catatan belanja, penjualan, dan
              setor/tarik tidak ikut terhapus.
            </p>
            <p>Isian yang dihapus (catat kalau mau tutup buku ulang):</p>
            <ul className="list-disc pl-5">
              <li>Saldo kantong: {rupiah(saldo)}</li>
              {sisa.map((s) => (
                <li key={s}>Sisa {s}</li>
              ))}
            </ul>
          </div>
        }
        onConfirm={async () => (await batalkanTutupBukuAction(id))?.error}
      >
        Batalkan tutup buku ini
      </KonfirmasiButton>
      <p className="text-center text-xs text-muted">Hanya tutup buku terakhir yang bisa dibatalkan.</p>
    </div>
  );
}
