"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { batalkanPesananAction, bayarGopayAction, simulasiBayarAction } from "../../actions";

const SIMULATOR_QRIS = "https://simulator.sandbox.midtrans.com/v2/qris/index";

export function AksiBayar({
  kode,
  png,
  palsu,
  gopay,
  sandbox,
}: {
  kode: string;
  png: string;
  palsu: boolean;
  gopay: boolean;
  sandbox: { qrUrl: string | null } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tersalin, setTersalin] = useState(false);

  return (
    <>
      <div className="card flex animate-masuk flex-col gap-2.5" style={{ animationDelay: "140ms" }}>
        <p className="font-display text-[15px] font-semibold">Bayar dari HP ini?</p>
        <a href={png} download={`bayar-${kode}.png`} className="btn-primary font-display transition-transform active:scale-[.98]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          Simpan gambar QR
        </a>
        <p className="text-[13px] text-muted">Lalu buka GoPay / OVO / DANA / m-banking → Scan → pilih gambar dari galeri.</p>
        {gopay && (
          <>
            <button
              type="button"
              disabled={pending}
              className="btn-ghost font-display"
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const r = await bayarGopayAction(kode);
                  if ("error" in r) return setError(r.error);
                  window.location.href = r.url;
                })
              }
            >
              {pending ? "Membuka GoPay…" : "Bayar pakai GoPay"}
            </button>
            {error && <p className="animate-muncul text-sm font-semibold text-bad">{error}</p>}
          </>
        )}
      </div>

      {sandbox && (
        <div className="card animate-masuk space-y-2 border-2 border-dashed border-warn" style={{ animationDelay: "190ms" }}>
          <p className="text-sm font-semibold">🧪 Sandbox Midtrans (uang bohongan)</p>
          <p className="text-[13px] text-muted">
            QRIS: buka simulator, tempel URL gambar QR, lalu bayar. GoPay: tombol di atas membuka simulator GoPay.
          </p>
          <div className="flex gap-2">
            <a href={SIMULATOR_QRIS} target="_blank" rel="noreferrer" className="btn-sun flex-1">
              Buka simulator QRIS
            </a>
            {sandbox.qrUrl && (
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => navigator.clipboard.writeText(sandbox.qrUrl!).then(() => setTersalin(true))}
              >
                {tersalin ? "Tersalin ✓" : "Salin URL QR"}
              </button>
            )}
          </div>
        </div>
      )}

      {palsu && (
        <div className="card animate-masuk space-y-2 border-2 border-dashed border-warn" style={{ animationDelay: "190ms" }}>
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
          {error && <p className="animate-muncul text-sm font-semibold text-bad">{error}</p>}
        </div>
      )}

      <button
        type="button"
        disabled={pending}
        className="btn-danger animate-masuk self-center px-5"
        style={{ animationDelay: "240ms" }}
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
