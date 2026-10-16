import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getKatalog } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { NAMA_KANTIN } from "@/lib/katalog";
import { getKodePesananku } from "@/lib/pembeli";
import { getRiwayatPembeli, LABEL_STATUS, type PesananRiwayat } from "@/lib/pesanan";
import { Pantau } from "../hidup";
import { BersihkanRiwayat, PesanLagi } from "./riwayat-client";

export const metadata: Metadata = { title: `Riwayat pesanan · ${NAMA_KANTIN}` };

const panah = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/** Pesanan yang pernah dibuat / dibuka di HP ini (cookie), 30 hari terakhir. */
export default async function RiwayatPage() {
  await connection();
  const [{ berjalan, selesai }, { menu, buka }] = await Promise.all([getRiwayatPembeli(await getKodePesananku()), getKatalog()]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-10 pt-5">
      {berjalan.length > 0 && <Pantau ms={8000} />}
      <Link href="/pesan" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Menu
      </Link>
      <div>
        <h1 className="text-[28px] font-bold">Riwayat pesanan</h1>
        <p className="mt-1 text-sm text-muted">30 hari terakhir, tersimpan di HP ini.</p>
      </div>

      {berjalan.length === 0 && selesai.length === 0 && <p className="card text-sm text-muted">Belum ada pesanan di HP ini.</p>}

      {berjalan.length > 0 && (
        <>
          <h2 className="mt-1 font-display text-xs font-semibold tracking-[.12em] text-muted">SEDANG BERJALAN</h2>
          {berjalan.map((p) => (
            <KartuBerjalan key={p.id} p={p} />
          ))}
        </>
      )}

      {selesai.length > 0 && (
        <>
          <div className="mt-1 flex h-4 items-center justify-between gap-3">
            <h2 className="font-display text-xs font-semibold tracking-[.12em] text-muted">SELESAI</h2>
            <BersihkanRiwayat jumlah={selesai.length} />
          </div>
          <div className="card px-4 py-1">
            {selesai.map((p) => (
              <div key={p.id} className="flex flex-col gap-2.5 border-b border-line py-3.5 last:border-b-0">
                <Link href={`/pesan/${p.kode}`} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className={`block text-[13px] ${p.status === "batal" ? "text-bad" : "text-muted"}`}>
                      {p.waktuLabel} · #{p.nomor} · {LABEL_STATUS[p.status]}
                    </span>
                    <span className="mt-0.5 block font-semibold">
                      {p.item.map((i, n) => (
                        <span key={i.id}>
                          {n > 0 && ", "}
                          {i.qty}× {i.nama}
                          {i.lessSugar && <span className="font-bold text-accent-2"> less sugar</span>}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="num whitespace-nowrap font-display font-bold">{rupiah(p.total)}</span>
                </Link>
                {buka && <PesanLagi item={p.item.map((i) => ({ menuId: i.menuId, nama: i.nama, lessSugar: i.lessSugar, qty: i.qty }))} menu={menu} />}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function KartuBerjalan({ p }: { p: PesananRiwayat }) {
  const belumBayar = p.status === "menunggu_bayar";
  return (
    <Link href={belumBayar ? `/pesan/${p.kode}/bayar` : `/pesan/${p.kode}`} className="card flex items-center gap-3.5 px-4 py-3.5">
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-extrabold ${belumBayar ? "bg-sun text-on-sun" : "bg-accent text-accent-fg"}`}
      >
        {belumBayar ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="6" width="18" height="13" rx="3" />
            <path d="M3 10h18M16 15h2" />
          </svg>
        ) : (
          `#${p.nomor}`
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold">{LABEL_STATUS[p.status]}</span>
        <span className="num mt-0.5 block text-[13px] text-muted">
          {p.waktuLabel} · {rupiah(p.total)}
          {belumBayar && ` · sisa ${Math.floor(p.sisaMs / 60000)}:${String(Math.floor((p.sisaMs % 60000) / 1000)).padStart(2, "0")}`}
        </span>
      </span>
      {panah}
    </Link>
  );
}
