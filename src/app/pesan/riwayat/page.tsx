import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { rupiah, tanggalJam } from "@/lib/format";
import { NAMA_KANTIN } from "@/lib/katalog";
import { getKodePesananku } from "@/lib/pembeli";
import { getRiwayatPembeli, LABEL_STATUS, type PesananLengkap } from "@/lib/pesanan";
import { Pantau } from "../hidup";

export const metadata: Metadata = { title: `Pesananku · ${NAMA_KANTIN}` };

/** Pesanan yang pernah dibuat / dibuka di HP ini (cookie), 30 hari terakhir. */
export default async function RiwayatPage() {
  await connection();
  const { berjalan, selesai } = await getRiwayatPembeli(await getKodePesananku());

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-10 pt-5">
      {berjalan.length > 0 && <Pantau ms={8000} />}
      <Link href="/pesan" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Menu
      </Link>
      <h1 className="text-[28px] font-bold">Pesananku</h1>

      {berjalan.length === 0 && selesai.length === 0 && <p className="card text-sm text-muted">Belum ada pesanan di HP ini.</p>}

      {berjalan.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xs font-semibold tracking-[.12em] text-muted">SEDANG BERJALAN</h2>
          {berjalan.map((p) => (
            <Kartu key={p.id} p={p} />
          ))}
        </section>
      )}
      {selesai.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xs font-semibold tracking-[.12em] text-muted">SELESAI</h2>
          {selesai.map((p) => (
            <Kartu key={p.id} p={p} />
          ))}
        </section>
      )}
    </main>
  );
}

function Kartu({ p }: { p: PesananLengkap }) {
  const belumBayar = p.status === "menunggu_bayar";
  return (
    <Link href={belumBayar ? `/pesan/${p.kode}/bayar` : `/pesan/${p.kode}`} className="card flex items-center gap-3 p-3.5">
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-[var(--r-md)] font-display text-lg font-extrabold ${belumBayar ? "bg-sun text-on-sun" : "bg-card-raised"}`}
      >
        {belumBayar ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Belum bayar" role="img">
            <rect x="3" y="6" width="18" height="13" rx="3" />
            <path d="M3 10h18M16 15h2" />
          </svg>
        ) : (
          `#${p.nomor}`
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{p.item.map((i) => `${i.qty}× ${i.nama}`).join(", ")}</span>
        <span className="block text-[13px] text-muted">
          {LABEL_STATUS[p.status]} · {tanggalJam(p.dibayar ?? p.dibuat)}
        </span>
      </span>
      <span className="num shrink-0 text-sm font-semibold">{rupiah(p.total)}</span>
    </Link>
  );
}
