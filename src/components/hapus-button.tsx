"use client";

import { useTransition } from "react";
import { hapusBelanjaAction, hapusKasAction } from "@/app/actions";

export function HapusButton({ id, jenis }: { id: number; jenis: "belanja" | "kas" }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      aria-label="Hapus"
      disabled={pending}
      className="rounded-lg px-2 py-1 text-muted hover:text-bad disabled:opacity-40"
      onClick={() => {
        if (!confirm("Hapus catatan ini?")) return;
        startTransition(async () => {
          const r = jenis === "belanja" ? await hapusBelanjaAction(id) : await hapusKasAction(id);
          if (r?.error) alert(r.error);
        });
      }}
    >
      ✕
    </button>
  );
}
