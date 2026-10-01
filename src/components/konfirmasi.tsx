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
  className = "btn-danger w-full",
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
        {error && <p className="w-full rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
      </>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[var(--r-lg)] border-[length:var(--stroke)] border-outline bg-card text-left text-sm shadow-pop-lg">
      <div className="flex items-center justify-between gap-3 border-b-[length:var(--stroke)] border-outline bg-bad px-4 py-2 font-display text-sm font-bold text-card">
        <span>Yakin?</span>
        <span className="flex gap-1.5 poster:hidden" aria-hidden="true">
          <i className="size-3 rounded-full border-2 border-outline bg-card-raised" />
          <i className="size-3 rounded-full border-2 border-outline bg-sun" />
          <i className="size-3 rounded-full border-2 border-outline bg-accent" />
        </span>
      </div>
      <div className="space-y-3 p-4">
      <div>{pesan}</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-ghost py-2 text-sm" disabled={pending} onClick={() => setTanya(false)}>
          Batal
        </button>
        <button
          type="button"
          className="btn-danger py-2 text-sm"
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
    </div>
  );
}
