"use client";

import { useState, useTransition } from "react";
import { batalkanPesananLunasAction } from "@/app/actions";
import { rupiah } from "@/lib/format";

/**
 * Tolak (saat belum diterima) / batalkan pesanan lunas. Pengguna mengembalikan uang pembeli sendiri, lalu
 * memilih uang refund-nya dari mana (lihat batalkanLunas di lib/pesanan.ts).
 */
export function TombolBatal({ id, nomor, total, tolak }: { id: number; nomor: number | null; total: number; tolak: boolean }) {
  const [buka, setBuka] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const kata = tolak ? "Tolak" : "Batalkan";

  const pilih = (refundDari: "kantong" | "pribadi") =>
    startTransition(async () => {
      const e = await batalkanPesananLunasAction(id, refundDari);
      if (e) setError(e);
      else setBuka(false);
    });

  if (!buka) {
    return (
      <>
        <button type="button" className="w-full py-1 text-sm font-bold text-bad" onClick={() => (setError(null), setBuka(true))}>
          {kata} pesanan…
        </button>
        {error && <p className="rounded-2xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] bg-card text-sm shadow-pop-lg">
      <div className="bg-bad px-4 py-2 font-display font-bold text-card">
        {kata} pesanan #{nomor}?
      </div>
      <div className="space-y-3 p-4">
        <p>
          Kembalikan dulu <b className="num">{rupiah(total)}</b> ke pembeli (transfer / QRIS / cash). Uang refund-nya dari mana?
        </p>
        <div className="grid gap-2">
          <button type="button" disabled={pending} className="btn-ghost py-2 text-left" onClick={() => pilih("kantong")}>
            <span>
              🏦 Kantong Kantin
              <span className="block text-xs font-normal text-muted">saldo Kantong turun sendiri saat refund</span>
            </span>
          </button>
          <button type="button" disabled={pending} className="btn-ghost py-2 text-left" onClick={() => pilih("pribadi")}>
            <span>
              👛 Uang pribadi
              <span className="block text-xs font-normal text-muted">dicatat sebagai setor modal {rupiah(total)}</span>
            </span>
          </button>
          <button type="button" disabled={pending} className="py-1 font-bold text-muted" onClick={() => setBuka(false)}>
            {pending ? "Memproses…" : "Jangan dulu"}
          </button>
        </div>
        <p className="text-xs text-muted">Tap terjual pesanan ini dihapus. Potongan payment gateway tetap dihitung sebagai biaya.</p>
        {error && <p className="rounded-2xl bg-bad-soft px-3 py-2 font-semibold text-bad">{error}</p>}
      </div>
    </div>
  );
}
