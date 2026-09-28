"use client";

import { useOptimistic, useState, useTransition } from "react";
import { tapAction } from "@/app/actions";

type Jenis = "kopi" | "kopi_sendiri" | "bb_sendiri";
type Counts = Record<Jenis, number>;

export function TapPanel({ counts, periode, hargaKopi }: { counts: Counts; periode: Counts; hargaKopi: number }) {
  const [optimistic, apply] = useOptimistic(
    { hariIni: counts, periode },
    (s, { jenis, delta }: { jenis: Jenis; delta: 1 | -1 }) => ({
      hariIni: { ...s.hariIni, [jenis]: s.hariIni[jenis] + delta },
      periode: { ...s.periode, [jenis]: s.periode[jenis] + delta },
    }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function tap(jenis: Jenis, delta: 1 | -1) {
    if (delta === -1 && optimistic.periode[jenis] <= 0) return;
    setError(null);
    if (delta === 1) navigator.vibrate?.(15);
    startTransition(async () => {
      apply({ jenis, delta });
      const r = await tapAction(jenis, delta);
      if (r?.error) setError(r.error);
    });
  }

  const kopi = optimistic.hariIni.kopi;

  return (
    <section className="space-y-3">
      <div className="card flex flex-col items-center gap-3 py-6">
        <div className="text-center">
          <div className="num text-6xl font-semibold">{kopi}</div>
          <div className="text-sm text-muted">
            kopi terjual hari ini · Rp {(kopi * hargaKopi).toLocaleString("id-ID")}
          </div>
        </div>
        <button
          onClick={() => tap("kopi", 1)}
          className="btn-primary h-24 w-full text-2xl shadow-sm"
        >
          +1 Kopi
        </button>
        <button onClick={() => tap("kopi", -1)} className="btn-ghost w-full text-sm" disabled={optimistic.periode.kopi <= 0}>
          −1 (koreksi)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SmallCounter
          label="Kopi Sendiri"
          icon="🙋"
          value={optimistic.hariIni.kopi_sendiri}
          onPlus={() => tap("kopi_sendiri", 1)}
          onMinus={() => tap("kopi_sendiri", -1)}
          canMinus={optimistic.periode.kopi_sendiri > 0}
        />
        <SmallCounter
          label="Beng Beng Sendiri"
          icon="🍫"
          value={optimistic.hariIni.bb_sendiri}
          onPlus={() => tap("bb_sendiri", 1)}
          onMinus={() => tap("bb_sendiri", -1)}
          canMinus={optimistic.periode.bb_sendiri > 0}
        />
      </div>

      {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
    </section>
  );
}

function SmallCounter(props: {
  label: string;
  icon: string;
  value: number;
  onPlus: () => void;
  onMinus: () => void;
  canMinus: boolean;
}) {
  return (
    <div className="card space-y-2 p-3">
      <div className="flex items-center justify-between text-sm">
        <span>
          {props.icon} {props.label}
        </span>
        <span className="num font-semibold">{props.value}</span>
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button onClick={props.onMinus} disabled={!props.canMinus} className="btn-ghost px-0 py-2 text-sm">
          −1
        </button>
        <button onClick={props.onPlus} className="btn-ghost border-accent px-0 py-2 text-sm font-semibold text-accent">
          +1
        </button>
      </div>
    </div>
  );
}
