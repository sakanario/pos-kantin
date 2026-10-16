"use client";

import { useOptimistic, useTransition } from "react";

/**
 * Sakelar on/off yang langsung tersimpan: tampilan berubah seketika (optimistic), lalu `simpan` dipanggil.
 * Bila gagal, kembali ke nilai dari server setelah refresh.
 */
export function Sakelar({
  nilai,
  simpan,
  label,
  sub,
}: {
  nilai: boolean;
  simpan: (v: boolean) => Promise<unknown>;
  label: React.ReactNode;
  sub?: React.ReactNode;
}) {
  const [tampil, setTampil] = useOptimistic(nilai);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={tampil}
      onClick={() =>
        startTransition(async () => {
          setTampil(!tampil);
          await simpan(!tampil);
        })
      }
      className="flex w-full items-center gap-3 py-1 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${tampil ? "bg-accent" : "bg-line shadow-[inset_0_0_0_1.5px_var(--outline)]"}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full shadow-pop transition-[left] ${tampil ? "left-[24px] bg-accent-fg" : "left-1 bg-card-raised"}`}
        />
      </span>
    </button>
  );
}
