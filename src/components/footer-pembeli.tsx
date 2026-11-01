import Link from "next/link";
import { INSTAGRAM, NAMA_KANTIN } from "@/lib/katalog";

/** Footer halaman pembeli: link S&K, kebijakan pengembalian dana, dan Instagram. */
export function FooterPembeli() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-3 border-t border-line pt-5 text-center text-[13px] text-muted md:flex-row md:flex-wrap md:justify-between md:text-left">
      <nav aria-label="Informasi" className="flex flex-wrap justify-center gap-x-4 font-semibold">
        <Link href="/syarat-ketentuan" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          Syarat &amp; Ketentuan
        </Link>
        <Link href="/kebijakan-pengembalian" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          Kebijakan Pengembalian Dana
        </Link>
      </nav>
      <div className="flex items-center gap-3 md:order-first">
        <TombolInstagram />
        <p>© {NAMA_KANTIN}</p>
      </div>
    </footer>
  );
}

/** Tombol bulat logo Instagram (link ke akun, tab baru). */
export function TombolInstagram() {
  return (
    <a
      href={INSTAGRAM}
      target="_blank"
      rel="noreferrer"
      aria-label={`Instagram ${NAMA_KANTIN}`}
      title="Instagram"
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card-raised text-accent shadow-pop transition-transform duration-150 hover:scale-105 active:scale-90"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    </a>
  );
}
