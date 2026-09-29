"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { CardSkeleton } from "@/components/skeleton";

const tabs = [
  ["belanja", "Belanja", "/catat"],
  ["kopi", "Kopi", "/catat?tab=kopi"],
  ["kas", "Setor / Tarik", "/catat?tab=kas"],
] as const;

export type TabCatat = (typeof tabs)[number][0];

/**
 * Pindah tab hanya mengubah ?tab=, jadi loading.tsx tidak ikut tampil.
 * Tab yang dipilih langsung disorot dan isinya diganti skeleton sampai server selesai.
 */
export function CatatTabs({ aktif, children }: { aktif: TabCatat; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tampil, setTampil] = useOptimistic(aktif);

  return (
    <>
      <div className="mx-4 mb-4 grid grid-cols-3 rounded-xl border border-line bg-card p-1 text-sm">
        {tabs.map(([t, label, href]) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (t === tampil) return;
              startTransition(() => {
                setTampil(t);
                router.push(href);
              });
            }}
            className={`rounded-lg py-2 text-center ${tampil === t ? "bg-accent font-medium text-accent-fg" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {pending ? (
        <div className="space-y-4 px-4" aria-busy="true">
          <CardSkeleton rows={5} />
          <CardSkeleton rows={3} />
        </div>
      ) : (
        children
      )}
    </>
  );
}
