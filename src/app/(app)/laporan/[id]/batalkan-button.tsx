"use client";

import { useState, useTransition } from "react";
import { batalkanTutupBukuAction } from "@/app/actions";
import { rupiah } from "@/lib/format";

export function BatalkanTutupBukuButton({ id, saldo, sisa }: { id: number; saldo: number; sisa: string[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="btn-ghost w-full text-bad"
        onClick={() => {
          const ok = confirm(
            `Batalkan tutup buku ini?\n\n` +
              `Laporan periode ini dihapus dan catatannya kembali ke periode berjalan. ` +
              `Catatan belanja, kopi, dan setor/tarik tidak ikut terhapus.\n\n` +
              `Isian yang dihapus (catat kalau mau tutup buku ulang):\n` +
              `• Saldo kantong: ${rupiah(saldo)}` +
              sisa.map((s) => `\n• Sisa ${s}`).join(""),
          );
          if (!ok) return;
          setError(null);
          startTransition(async () => {
            const r = await batalkanTutupBukuAction(id);
            if (r?.error) setError(r.error);
          });
        }}
      >
        {pending ? "Membatalkan…" : "Batalkan tutup buku ini"}
      </button>
      {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
      <p className="text-center text-xs text-muted">Hanya tutup buku terakhir yang bisa dibatalkan.</p>
    </div>
  );
}
