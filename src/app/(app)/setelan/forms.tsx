"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { aturTemaAction, gantiPinAction, hitungUlangSemuaAction } from "@/app/actions";
import { dataTheme, type Tema } from "@/lib/tema";
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

/** Pilihan tema langsung diterapkan ke halaman, lalu disimpan sebagai cookie di perangkat ini. */
export function TemaPicker({ tema }: { tema: Tema }) {
  const [tampil, setTampil] = useOptimistic(tema);
  const [, startTransition] = useTransition();
  return (
    <div className="grid grid-cols-3 gap-1 rounded-full border-[3px] border-outline bg-card-raised p-1 text-sm shadow-pop">
      {pilihanTema.map(([t, label]) => (
        <button
          key={t}
          type="button"
          aria-pressed={tampil === t}
          onClick={() =>
            startTransition(async () => {
              setTampil(t);
              const d = dataTheme(t);
              if (d) document.documentElement.dataset.theme = d;
              else delete document.documentElement.dataset.theme;
              await aturTemaAction(t);
            })
          }
          className={`rounded-full py-2 text-center font-bold ${tampil === t ? "bg-accent text-accent-fg" : "text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
