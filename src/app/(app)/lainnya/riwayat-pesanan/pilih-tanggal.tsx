"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** Lompat ke satu tanggal (kalender bawaan HP). `hrefTanggal` berisi "TGL" yang diganti tanggal terpilih. */
export function PilihTanggal({
  nilai,
  min,
  max,
  hrefTanggal,
  hrefHapus,
}: {
  nilai: string | null;
  min: string;
  max: string;
  hrefTanggal: string;
  hrefHapus: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-line px-3 text-sm">
        <span aria-hidden="true">📅</span>
        <span className="text-muted">{nilai ? "Tanggal" : "Pilih tanggal"}</span>
        <input
          type="date"
          value={nilai ?? ""}
          min={min}
          max={max}
          onChange={(e) => e.target.value && router.push(hrefTanggal.replace("TGL", e.target.value))}
          className="num ml-auto min-w-0 bg-transparent text-right font-medium"
        />
      </label>
      {nilai && (
        <Link href={hrefHapus} className="btn-ghost min-h-11 px-3 py-2 text-sm">
          Semua hari
        </Link>
      )}
    </div>
  );
}
