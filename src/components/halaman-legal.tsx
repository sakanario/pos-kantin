import Link from "next/link";
import { LEGAL_DIPERBARUI } from "@/lib/katalog";
import { FooterPembeli } from "./footer-pembeli";

/** Kerangka halaman legal publik (Syarat & Ketentuan, Kebijakan Pengembalian Dana). */
export function HalamanLegal({ judul, pembuka, children }: { judul: string; pembuka: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-10 pt-5">
      <Link href="/" className="inline-flex min-h-11 animate-masuk items-center gap-1 self-start text-[15px] font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Menu
      </Link>
      <div className="animate-masuk">
        <h1 className="text-[28px] font-bold leading-tight">{judul}</h1>
        <p className="mt-1 text-sm text-muted">Terakhir diperbarui: {LEGAL_DIPERBARUI}</p>
      </div>
      <article className="card animate-masuk space-y-5 text-[15px] leading-relaxed">
        <p>{pembuka}</p>
        {children}
      </article>
      <FooterPembeli />
    </main>
  );
}

export function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-[17px] font-bold">{judul}</h2>
      {children}
    </section>
  );
}

export function Daftar({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-accent-2">{children}</ul>;
}
