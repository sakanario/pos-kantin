"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        autoFocus
        required
        autoComplete="current-password"
        className="input text-center text-2xl tracking-[0.5em]"
      />
      <FormMessage state={state} />
      <SubmitButton>Masuk</SubmitButton>
    </form>
  );
}
