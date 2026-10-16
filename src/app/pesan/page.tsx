import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FotoMenu } from "@/components/foto-menu";
import { getKatalog, type MenuKatalog } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { NAMA_KANTIN, TAGLINE_KATALOG } from "@/lib/katalog";
import { isSetupDone } from "@/lib/settings";

export const metadata: Metadata = {
  title: `${NAMA_KANTIN} · Menu`,
  description: TAGLINE_KATALOG,
  appleWebApp: { capable: true, title: NAMA_KANTIN, statusBarStyle: "default" },
};

/** Katalog publik (tanpa login). Tahap 1: lihat saja, belum bisa pesan. */
export default async function KatalogPage() {
  await connection();
  if (!(await isSetupDone())) notFound();
  const { buka, menu } = await getKatalog();
  const bagian = [
    ["KOPI", menu.filter((m) => m.jenis === "racikan")],
    ["CAMILAN", menu.filter((m) => m.jenis === "barang_jadi")],
  ] as const;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pb-16 pt-7">
      <header className="space-y-2.5">
        <div className="flex items-center gap-3">
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
        <p className="text-sm text-muted">{TAGLINE_KATALOG}</p>
      </header>

      {!buka && (
        <div className="flex items-center gap-3.5 rounded-[var(--r-lg)] bg-accent px-[18px] py-4 text-accent-fg shadow-pop-lg">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sun text-on-sun">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div>
            <p className="font-display text-[17px] font-bold">Kantin sedang tutup</p>
            <p className="mt-0.5 text-sm opacity-80">Lihat-lihat menu dulu ya. Pesan bisa lagi saat kantin buka.</p>
          </div>
        </div>
      )}

      {menu.length === 0 && <p className="card text-sm text-muted">Menu belum tersedia. Coba lagi nanti ya.</p>}

      {bagian.map(([judul, items]) =>
        items.length === 0 ? null : (
          <section key={judul} className="space-y-3">
            <h2 className="font-display text-xs font-semibold tracking-[.12em] text-muted">{judul}</h2>
            {items.map((m) => (
              <KartuMenu key={m.id} m={m} />
            ))}
          </section>
        ),
      )}
    </main>
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

function KartuMenu({ m }: { m: MenuKatalog }) {
  return (
    <div className="card flex items-center gap-3.5 p-3">
      <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} className={m.habis ? "opacity-45" : ""} />
      <div className="min-w-0 flex-1">
        <h3 className={`text-[17px] font-semibold leading-[22px] ${m.habis ? "text-muted" : ""}`}>{m.nama}</h3>
        <p className={`num mt-1 font-display text-[15px] font-semibold text-muted ${m.habis ? "line-through" : ""}`}>{rupiah(m.harga)}</p>
      </div>
      {m.habis && <span className="rounded-full bg-bad-soft px-3.5 py-2 font-display text-sm font-bold text-bad">Habis</span>}
    </div>
  );
}
