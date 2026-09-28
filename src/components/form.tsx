"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

export function SubmitButton({ children, className = "btn-primary w-full" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Menyimpan…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{state.error}</p>;
  if (state.ok) return <p className="rounded-lg bg-good/10 px-3 py-2 text-sm text-good">{state.ok}</p>;
  return null;
}

/** Input nominal rupiah dengan pemisah ribuan otomatis. */
export function RupiahInput({
  name,
  defaultValue,
  placeholder = "0",
  required,
  autoFocus,
}: {
  name: string;
  defaultValue?: number;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">Rp</span>
      <input
        name={name}
        inputMode="numeric"
        autoComplete="off"
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        defaultValue={defaultValue !== undefined ? defaultValue.toLocaleString("id-ID") : undefined}
        className="input num pl-10"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          e.target.value = digits ? Number(digits).toLocaleString("id-ID") : "";
        }}
      />
    </div>
  );
}
