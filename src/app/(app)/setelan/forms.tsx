"use client";

import { useActionState } from "react";
import { gantiPinAction, hitungUlangSemuaAction } from "@/app/actions";
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
