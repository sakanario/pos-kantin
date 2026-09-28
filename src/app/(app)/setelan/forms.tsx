"use client";

import { useActionState } from "react";
import { gantiPinAction, ubahHargaAction, ubahIsiDusAction } from "@/app/actions";
import { FormMessage, RupiahInput, SubmitButton } from "@/components/form";

export function HargaForm({ hargaKey, label, nilai }: { hargaKey: string; label: string; nilai: number }) {
  const [state, action] = useActionState(ubahHargaAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="key" value={hargaKey} />
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <div className="flex-1">
          <RupiahInput name="nilai" defaultValue={nilai} required />
        </div>
        <SubmitButton className="btn-ghost">Simpan</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function IsiDusForm({ isiDus }: { isiDus: number }) {
  const [state, action] = useActionState(ubahIsiDusAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="label">Isi per dus (pcs)</label>
      <div className="flex gap-2">
        <input name="isi_dus" inputMode="numeric" defaultValue={isiDus} required className="input num flex-1" />
        <SubmitButton className="btn-ghost">Simpan</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

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
