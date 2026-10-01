"use client";

import { useOptimistic, useState, useTransition } from "react";
import { tapAction } from "@/app/actions";

type Jenis = "terjual" | "sendiri";
type Hitung = Record<Jenis, number>;
export type MenuTap = {
  id: number;
  nama: string;
  jenis: "racikan" | "barang_jadi";
  hargaJual: number;
  hariIni: Hitung;
  periode: Hitung;
};
type State = Record<number, { hariIni: Hitung; periode: Hitung }>;

/** Kartu tap per menu aktif: racikan +1 terjual / +1 sendiri, barang jadi +1 sendiri saja. */
export function TapPanel({ menu }: { menu: MenuTap[] }) {
  const [optimistic, apply] = useOptimistic(
    Object.fromEntries(menu.map((m) => [m.id, { hariIni: m.hariIni, periode: m.periode }])) as State,
    (s, { id, jenis, delta }: { id: number; jenis: Jenis; delta: 1 | -1 }) => ({
      ...s,
      [id]: {
        hariIni: { ...s[id].hariIni, [jenis]: s[id].hariIni[jenis] + delta },
        periode: { ...s[id].periode, [jenis]: s[id].periode[jenis] + delta },
      },
    }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function tap(id: number, jenis: Jenis, delta: 1 | -1) {
    if (delta === -1 && optimistic[id].periode[jenis] <= 0) return;
    setError(null);
    if (delta === 1) navigator.vibrate?.(15);
    startTransition(async () => {
      apply({ id, jenis, delta });
      const r = await tapAction(id, jenis, delta);
      if (r?.error) setError(r.error);
    });
  }

  const racikan = menu.filter((m) => m.jenis === "racikan");
  const terjual = racikan.reduce((a, m) => a + optimistic[m.id].hariIni.terjual, 0);
  const omzet = racikan.reduce((a, m) => a + optimistic[m.id].hariIni.terjual * m.hargaJual, 0);

  return (
    <section className="space-y-3">
      {racikan.length > 0 && (
        <p className="text-center text-sm text-muted">
          <span className="num text-base font-semibold text-fg">{terjual}</span> terjual hari ini · Rp{" "}
          {omzet.toLocaleString("id-ID")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {menu.map((m) => {
          const s = optimistic[m.id];
          return m.jenis === "racikan" ? (
            <div key={m.id} className="card flex flex-col gap-2 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium leading-tight">{m.nama}</span>
                <span className="num text-2xl font-semibold">{s.hariIni.terjual}</span>
              </div>
              <button onClick={() => tap(m.id, "terjual", 1)} className="btn-primary h-16 w-full text-lg shadow-sm">
                +1
              </button>
              <button
                onClick={() => tap(m.id, "terjual", -1)}
                disabled={s.periode.terjual <= 0}
                className="btn-ghost w-full py-1.5 text-xs"
              >
                −1 (koreksi)
              </button>
              <Sendiri
                label="🙋 Sendiri"
                value={s.hariIni.sendiri}
                onPlus={() => tap(m.id, "sendiri", 1)}
                onMinus={() => tap(m.id, "sendiri", -1)}
                canMinus={s.periode.sendiri > 0}
              />
            </div>
          ) : (
            <div key={m.id} className="card flex flex-col justify-between gap-2 p-3">
              <span className="text-sm font-medium leading-tight">🍫 {m.nama}</span>
              <p className="text-xs text-muted">Terjual dihitung saat tutup buku.</p>
              <Sendiri
                label="🙋 Sendiri"
                value={s.hariIni.sendiri}
                onPlus={() => tap(m.id, "sendiri", 1)}
                onMinus={() => tap(m.id, "sendiri", -1)}
                canMinus={s.periode.sendiri > 0}
              />
            </div>
          );
        })}
      </div>

      {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
    </section>
  );
}

function Sendiri(props: { label: string; value: number; onPlus: () => void; onMinus: () => void; canMinus: boolean }) {
  return (
    <div className="space-y-1 border-t border-line pt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{props.label}</span>
        <span className="num font-semibold">{props.value}</span>
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button onClick={props.onMinus} disabled={!props.canMinus} className="btn-ghost px-0 py-1.5 text-sm">
          −1
        </button>
        <button onClick={props.onPlus} className="btn-ghost border-accent px-0 py-1.5 text-sm font-semibold text-accent">
          +1
        </button>
      </div>
    </div>
  );
}
