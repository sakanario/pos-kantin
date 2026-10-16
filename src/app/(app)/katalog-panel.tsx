"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { aturKantinBukaAction, aturKatalogMenuAction } from "@/app/actions";
import { FotoMenu } from "@/components/foto-menu";
import { Sakelar } from "@/components/sakelar";
import type { MenuKatalog } from "@/lib/data";

/** Beranda: buka/tutup kantin dan tanda habis per menu katalog (dipakai sehari-hari). */
export function KatalogPanel({ buka, menu }: { buka: boolean; menu: MenuKatalog[] }) {
  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">Katalog pembeli</h2>
        <Link href="/pesan" className="text-sm font-bold text-accent">
          Lihat ›
        </Link>
      </div>
      <Sakelar
        label={<span className="text-lg font-bold">{buka ? "🟢 Kantin buka" : "⚪ Kantin tutup"}</span>}
        sub={buka ? "Katalog menampilkan ● Buka" : "Katalog tetap bisa dilihat, tapi tidak bisa pesan"}
        nilai={buka}
        simpan={aturKantinBukaAction}
      />
      <ul className="divide-y divide-line border-t border-line">
        {menu.map((m) => (
          <BarisHabis key={m.id} m={m} />
        ))}
      </ul>
      <p className="text-xs text-muted">Tanda habis tidak hilang sendiri: ketuk lagi saat stoknya ada.</p>
    </section>
  );
}

function BarisHabis({ m }: { m: MenuKatalog }) {
  const [habis, setHabis] = useOptimistic(m.habis);
  const [, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 py-2">
      <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} size={40} className={habis ? "opacity-45" : ""} />
      <span className={`min-w-0 flex-1 font-medium ${habis ? "text-muted line-through" : ""}`}>{m.nama}</span>
      <button
        type="button"
        aria-pressed={habis}
        aria-label={`${m.nama}: ${habis ? "habis, ketuk jika sudah ada" : "ada, ketuk jika habis"}`}
        onClick={() =>
          startTransition(async () => {
            setHabis(!habis);
            await aturKatalogMenuAction(m.id, { habis: !habis });
          })
        }
        className="chip min-h-10 px-4"
        style={habis ? { backgroundColor: "var(--bad-soft)", color: "var(--bad)" } : undefined}
      >
        {habis ? "Habis" : "Ada"}
      </button>
    </li>
  );
}
