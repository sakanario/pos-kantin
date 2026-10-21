"use client";

import { useEffect, useRef, useState } from "react";
import { desimal } from "@/lib/format";

/**
 * Saat ganti kemasan: sisa kemasan lama (menurut resep) habis terpakai, atau dibuang (basi/tumpah)?
 * "Dibuang" → `buang_sisa=1`, sisanya dicatat sebagai bahan terbuang. Tidak tampil bila sisa ≤ 0.
 */
export function SisaLamaPilih({ nama, sisa, satuan }: { nama: string; sisa: number | null; satuan: string }) {
  const [buang, setBuang] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Hidden input, bukan radio: form.reset() setelah simpan tidak mengubah nilainya, jadi samakan state-nya
  useEffect(() => {
    const form = ref.current?.form;
    const onReset = () => setBuang(false);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, []);

  if (sisa === null || sisa <= 0) return null;
  const pilihan = [
    [false, "Habis terpakai"],
    [true, "Dibuang (basi/tumpah)"],
  ] as const;
  return (
    <div className="space-y-1">
      <input ref={ref} type="hidden" name="buang_sisa" value={buang ? "1" : ""} />
      <p className="text-sm">
        Menurut resep, {nama} lama masih ±{desimal(Math.round(sisa))} {satuan}. Sisanya…
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {pilihan.map(([v, l]) => (
          <button
            key={l}
            type="button"
            aria-pressed={buang === v}
            onClick={() => setBuang(v)}
            className={`rounded-xl border px-2 py-1.5 text-center ${buang === v ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {buang && <p className="text-xs text-muted">Dicatat sebagai bahan terbuang: mengurangi untung jualan.</p>}
    </div>
  );
}
