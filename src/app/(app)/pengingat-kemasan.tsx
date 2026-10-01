"use client";

import { useState, useTransition } from "react";
import { gantiKemasanSekarangAction, tundaPengingatAction } from "@/app/actions";

export type Pengingat = {
  bahanId: number;
  bahanNama: string;
  lama: string;
  baru: { id: number; nama: string };
  perkiraan: number;
  sudah: number;
};

/** "Nescafe kemungkinan sudah habis (perkiraan 5 cup, sudah 7 cup). Sudah pakai Indocafe?" */
export function PengingatKemasan({ items }: { items: Pengingat[] }) {
  const [pending, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  if (items.length === 0 && !info) return null;
  return (
    <div className="space-y-2">
      {items.map((p) => (
        <section key={p.bahanId} className="card space-y-2 border-accent bg-accent-soft text-sm">
          <p>
            🧂 <b>{p.lama}</b> kemungkinan sudah habis (perkiraan {p.perkiraan} cup, sudah {p.sudah} cup). Sudah pakai{" "}
            <b>{p.baru.nama}</b>?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-primary py-2 text-sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await gantiKemasanSekarangAction(p.baru.id);
                  setInfo(r.error ?? r.ok ?? null);
                })
              }
            >
              Ya, ganti
            </button>
            <button
              className="btn-ghost py-2 text-sm"
              disabled={pending}
              onClick={() => startTransition(() => tundaPengingatAction(p.bahanId))}
            >
              Belum
            </button>
          </div>
        </section>
      ))}
      {info && (
        <p className="rounded-2xl border-2 border-good bg-card-raised font-semibold px-3 py-2 text-sm text-good" onClick={() => setInfo(null)}>
          {info}
        </p>
      )}
    </div>
  );
}
