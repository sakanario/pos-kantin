"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { batalkanPesananAction, simulasiBayarAction } from "../../actions";

export function AksiBayar({ kode, png, palsu }: { kode: string; png: string; palsu: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <div className="card flex flex-col gap-2.5">
        <p className="font-display text-[15px] font-semibold">Bayar dari HP ini?</p>
        <a href={png} download={`bayar-${kode}.png`} className="btn-primary font-display">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          Simpan gambar QR
        </a>
        <p className="text-[13px] text-muted">Lalu buka GoPay / OVO / DANA / m-banking → Scan → pilih gambar dari galeri.</p>
        {/* Tahap 3b: tombol "Bayar pakai GoPay" (deeplink Midtrans) */}
      </div>

      {palsu && (
        <div className="card space-y-2 border-2 border-dashed border-warn">
          <p className="text-sm font-semibold">🧪 Mode coba (gateway palsu)</p>
          <p className="text-[13px] text-muted">
            Tombol ini berlaku seperti notifikasi &quot;lunas&quot; dari payment gateway. Hanya ada di laptop, tidak di Vercel.
          </p>
          <button
            type="button"
            disabled={pending}
            className="btn-sun w-full"
            onClick={() =>
              startTransition(async () => {
                const r = await simulasiBayarAction(kode);
                if (r.error) return setError(r.error);
                router.refresh();
              })
            }
          >
            {pending ? "Memproses…" : "Simulasikan bayar"}
          </button>
          {error && <p className="text-sm font-semibold text-bad">{error}</p>}
        </div>
      )}

      <button
        type="button"
        disabled={pending}
        className="btn-danger self-center px-5"
        onClick={() =>
          startTransition(async () => {
            await batalkanPesananAction(kode);
            router.push("/pesan/keranjang");
          })
        }
      >
        Batalkan pesanan
      </button>
    </>
  );
}
