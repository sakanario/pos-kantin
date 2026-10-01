"use client";

import { useState, useTransition } from "react";

/**
 * Tombol untuk aksi yang perlu dikonfirmasi. Konfirmasinya tampil di halaman, bukan `confirm()` browser
 * (dialog bawaan bisa diblokir, misalnya di browser dalam aplikasi, dan selalu dianggap "Batal").
 * `onConfirm` mengembalikan pesan error bila gagal.
 */
export function KonfirmasiButton({
  children,
  pesan,
  ya,
  onConfirm,
  className = "btn-ghost w-full text-bad",
  ariaLabel,
}: {
  children: React.ReactNode;
  pesan: React.ReactNode;
  ya: string;
  onConfirm: () => Promise<string | void | undefined>;
  className?: string;
  ariaLabel?: string;
}) {
  const [tanya, setTanya] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!tanya) {
    return (
      <>
        <button
          type="button"
          aria-label={ariaLabel}
          className={className}
          onClick={() => {
            setError(null);
            setTanya(true);
          }}
        >
          {children}
        </button>
        {error && <p className="w-full rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
      </>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-bad/40 bg-bad/5 p-3 text-left text-sm">
      <div>{pesan}</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-ghost py-2 text-sm" disabled={pending} onClick={() => setTanya(false)}>
          Batal
        </button>
        <button
          type="button"
          className="btn bg-bad py-2 text-sm text-card"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const e = await onConfirm();
              if (e) setError(e);
              setTanya(false);
            })
          }
        >
          {pending ? "Memproses…" : ya}
        </button>
      </div>
    </div>
  );
}
