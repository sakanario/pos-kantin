"use client";

import { useActionState } from "react";
import { setupAction } from "@/app/actions";
import { FormMessage, RupiahInput, SubmitButton } from "@/components/form";

export function SetupForm() {
  const [state, action] = useActionState(setupAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-medium">PIN</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">PIN (4–6 digit)</label>
            <input name="pin" type="password" inputMode="numeric" maxLength={6} required className="input" />
          </div>
          <div>
            <label className="label">Ulangi PIN</label>
            <input name="pin2" type="password" inputMode="numeric" maxLength={6} required className="input" />
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium">Kantong Kantin (Jago)</h2>
        <div>
          <label className="label">Saldo saat ini</label>
          <RupiahInput name="saldo" defaultValue={0} required />
        </div>
      </section>

      <p className="text-sm text-muted">
        Sesudah ini, buat menu (kopi, snack) dan bahan di Lainnya → Menu. Stok barang jadi mulai dari 0 dan bertambah dari
        belanja.
      </p>

      <FormMessage state={state} />
      <SubmitButton>Mulai</SubmitButton>
    </form>
  );
}
