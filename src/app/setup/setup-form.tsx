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

      <section className="card space-y-3">
        <h2 className="font-medium">Beng Beng</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Stok sekarang (pcs)</label>
            <input name="stok_bb" inputMode="numeric" defaultValue={0} required className="input num" />
          </div>
          <div>
            <label className="label">Isi per dus</label>
            <input name="isi_dus" inputMode="numeric" defaultValue={17} required className="input num" />
          </div>
        </div>
        <div>
          <label className="label">Harga beli per dus (untuk modal stok sekarang)</label>
          <RupiahInput name="harga_dus" defaultValue={36500} required />
        </div>
        <div>
          <label className="label">Harga jual per pcs</label>
          <RupiahInput name="jual_bb" defaultValue={3000} required />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium">Kopi Susu Gula Aren</h2>
        <div>
          <label className="label">Harga jual per cup</label>
          <RupiahInput name="jual_kopi" defaultValue={10000} required />
        </div>
        <div>
          <label className="label">HPP estimasi per cup (untuk kopi yang kamu minum sendiri)</label>
          <RupiahInput name="hpp_kopi" defaultValue={6428} required />
        </div>
      </section>

      <FormMessage state={state} />
      <SubmitButton>Mulai</SubmitButton>
    </form>
  );
}
