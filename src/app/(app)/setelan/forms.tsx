"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { aturGayaAction, aturTemaAction, gantiPinAction, hitungUlangSemuaAction } from "@/app/actions";
import { dataTheme, type Gaya, type Tema } from "@/lib/tema";
import { FormMessage, SubmitButton } from "@/components/form";

export function GantiPinForm() {
  const [state, action] = useActionState(gantiPinAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input name="pin_lama" type="password" inputMode="numeric" maxLength={6} placeholder="PIN lama" required className="input" />
      <div className="grid grid-cols-2 gap-2">
        <input name="pin_baru" type="password" inputMode="numeric" maxLength={6} placeholder="PIN baru" required className="input" />
        <input name="pin_baru2" type="password" inputMode="numeric" maxLength={6} placeholder="Ulangi" required className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-ghost w-full">Ganti PIN</SubmitButton>
    </form>
  );
}

export function HitungUlangForm() {
  const [state, action] = useActionState(hitungUlangSemuaAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <SubmitButton className="btn-ghost w-full">Hitung ulang semua laporan</SubmitButton>
    </form>
  );
}

const pilihanTema: [Tema, string][] = [
  ["terang", "Terang"],
  ["gelap", "Gelap"],
  ["hp", "Ikut HP"],
];

const pilihanGaya: [Gaya, string][] = [
  ["pop", "Pop"],
  ["poster", "Poster"],
];

/** Deretan tombol pilihan; yang dipilih langsung tampil (optimistic), lalu disimpan lewat `simpan`. */
function Pilihan<T extends string>({
  nilai,
  opsi,
  label,
  terapkan,
  simpan,
}: {
  nilai: T;
  opsi: [T, string][];
  label: string;
  terapkan: (v: T) => void;
  simpan: (v: T) => Promise<void>;
}) {
  const [tampil, setTampil] = useOptimistic(nilai);
  const [, startTransition] = useTransition();
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-[var(--r-ctl)] border-[length:var(--stroke)] border-outline bg-card-raised p-1 text-sm shadow-pop"
      style={{ gridTemplateColumns: `repeat(${opsi.length}, 1fr)` }}
    >
      {opsi.map(([v, teks]) => (
        <button
          key={v}
          type="button"
          aria-pressed={tampil === v}
          onClick={() =>
            startTransition(async () => {
              setTampil(v);
              terapkan(v);
              await simpan(v);
            })
          }
          className={`rounded-[var(--r-ctl)] py-2 text-center font-bold ${tampil === v ? "bg-accent text-accent-fg" : "text-muted"}`}
        >
          {teks}
        </button>
      ))}
    </div>
  );
}

/** Tema & gaya langsung diterapkan ke <html>, lalu disimpan sebagai cookie di perangkat ini. */
export function TemaPicker({ tema }: { tema: Tema }) {
  return (
    <Pilihan
      nilai={tema}
      opsi={pilihanTema}
      label="Tema"
      terapkan={(t) => {
        const d = dataTheme(t);
        if (d) document.documentElement.dataset.theme = d;
        else delete document.documentElement.dataset.theme;
      }}
      simpan={aturTemaAction}
    />
  );
}

export function GayaPicker({ gaya }: { gaya: Gaya }) {
  return (
    <Pilihan
      nilai={gaya}
      opsi={pilihanGaya}
      label="Gaya"
      terapkan={(g) => {
        if (g === "pop") delete document.documentElement.dataset.gaya;
        else document.documentElement.dataset.gaya = g;
      }}
      simpan={aturGayaAction}
    />
  );
}
