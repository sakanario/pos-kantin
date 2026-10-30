"use client";

import { useTransition } from "react";
import { majukanPesananAction } from "@/app/actions";
import type { StatusPesanan } from "@/db/schema";

const LABEL: Partial<Record<StatusPesanan, string>> = {
  lunas: "Terima",
  diterima: "Mulai dibuat",
};

/** Satu tombol untuk maju ke status berikutnya. */
export function TombolMaju({ id, status, cara }: { id: number; status: StatusPesanan; cara: "pickup" | "delivery" }) {
  const [pending, startTransition] = useTransition();
  const label = LABEL[status] ?? (cara === "delivery" ? "Sudah diantar" : "Siap diambil");
  return (
    <button
      type="button"
      disabled={pending}
      className={status === "dibuat" ? "btn-sun w-full" : "btn-primary w-full"}
      onClick={() => startTransition(() => majukanPesananAction(id, status))}
    >
      {pending ? "Menyimpan…" : label}
    </button>
  );
}
