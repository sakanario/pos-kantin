import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getKatalog } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { NAMA_KANTIN, TAGLINE_KATALOG } from "@/lib/katalog";
import { getKodePesananku, getPerangkat } from "@/lib/pembeli";
import { gatewayAktif, getPesananku, type PesananLengkap } from "@/lib/pesanan";
import { isSetupDone } from "@/lib/settings";
import { ikonJam, SisaWaktu } from "./hidup";
import { KatalogClient } from "./katalog-client";

export const metadata: Metadata = {
  title: `${NAMA_KANTIN} · Menu`,
  description: TAGLINE_KATALOG,
  appleWebApp: { capable: true, title: NAMA_KANTIN, statusBarStyle: "default" },
};

const ringkasItem = (p: PesananLengkap) => p.item.map((i) => `${i.qty}× ${i.nama}`).join(", ");

/** Katalog publik (tanpa login): lihat menu, isi keranjang, lanjut bayar. */
export default async function KatalogPage() {
  await connection();
  if (!(await isSetupDone())) notFound();
  const [{ buka, menu }, kode, perangkat] = await Promise.all([getKatalog(), getKodePesananku(), getPerangkat()]);
  const adaPesan = gatewayAktif() !== null;
  const { milikku, belumBayar, sisaBayarMs, kedaluwarsa, berjalan } = await getPesananku(kode, perangkat);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pb-32 pt-7">
      <header className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statis kecil */}
            <img
              src="/icons/logo.png"
              alt=""
              width={52}
              height={52}
              className="size-[52px] shrink-0 rounded-[var(--r-md)] bg-card-raised object-cover shadow-pop"
            />
            <div className="min-w-0">
              <h1 className="text-[26px] font-bold leading-[30px]">{NAMA_KANTIN}</h1>
              <StatusBuka buka={buka} />
            </div>
          </div>
          {adaPesan && milikku.length > 0 && (
            <Link
              href="/pesan/riwayat"
              aria-label={berjalan ? `Pesananku, ${berjalan} sedang berjalan` : "Pesananku"}
              className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-card-raised text-accent shadow-pop"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 9.5V3H5v18l2-1.5L9 21l2-1.5" />
                <path d="M8 7h4M8 11h3" />
                <circle cx="17" cy="17" r="4.5" />
                <path d="M17 15v2l1.3 1.3" />
              </svg>
              {berjalan > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sun px-1.5 font-display text-xs font-bold text-on-sun">
                  {berjalan}
                </span>
              )}
            </Link>
          )}
        </div>
        <p className="text-sm text-muted">{TAGLINE_KATALOG}</p>
      </header>

      {!buka && (
        <KartuGelap
          ikon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
          judul="Kantin sedang tutup"
          isi="Lihat-lihat menu dulu ya. Pesan bisa lagi saat kantin buka."
        />
      )}

      {belumBayar && (
        <div className="space-y-3 rounded-[var(--r-lg)] bg-accent p-4 text-accent-fg shadow-pop-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[17px] font-bold">Menunggu pembayaran</p>
              <p className="mt-1 text-sm opacity-80">{ringkasItem(belumBayar)}</p>
            </div>
            <span className="num shrink-0 font-display text-[17px] font-bold">{rupiah(belumBayar.total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 font-display text-sm font-bold text-on-sun">
              {ikonJam}Sisa <SisaWaktu sisaMs={sisaBayarMs} />
            </span>
            <Link
              href={`/pesan/${belumBayar.kode}/bayar`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent-fg px-[18px] font-display text-[15px] font-bold text-accent"
            >
              Lanjut bayar ›
            </Link>
          </div>
        </div>
      )}

      {kedaluwarsa && (
        <KartuGelap
          ikon={ikonJam}
          judul="Pembayaran kedaluwarsa"
          isi={
            <>
              {ringkasItem(kedaluwarsa)} belum dibayar dalam 15 menit.{" "}
              {buka && (
                <Link href="/pesan/keranjang" className="font-bold text-sun underline">
                  Pesan lagi
                </Link>
              )}
            </>
          }
        />
      )}

      {menu.length === 0 && <p className="card text-sm text-muted">Menu belum tersedia. Coba lagi nanti ya.</p>}

      <KatalogClient menu={menu} bisaPesan={buka && adaPesan} adaPesan={adaPesan} />
    </main>
  );
}

function KartuGelap({ ikon, judul, isi }: { ikon: React.ReactNode; judul: string; isi: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[var(--r-lg)] bg-accent px-[18px] py-4 text-accent-fg shadow-pop-lg">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sun text-on-sun">{ikon}</span>
      <div>
        <p className="font-display text-[17px] font-bold">{judul}</p>
        <p className="mt-0.5 text-sm opacity-80">{isi}</p>
      </div>
    </div>
  );
}

function StatusBuka({ buka }: { buka: boolean }) {
  return (
    <span
      className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-card-raised px-2.5 py-0.5 text-xs font-bold ${buka ? "text-good" : "text-muted"}`}
    >
      <span className={`size-[7px] rounded-full ${buka ? "bg-good" : "bg-outline"}`} />
      {buka ? "Buka" : "Tutup"}
    </span>
  );
}
