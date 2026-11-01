import Link from "next/link";
import { KONTAK, NAMA_KANTIN, PENGELOLA } from "@/lib/katalog";

/** Footer halaman pembeli: link S&K, kebijakan pengembalian dana, dan kontak penjual. */
export function FooterPembeli() {
  return (
    <footer className="mt-auto space-y-3 border-t border-line pt-5 text-center text-[13px] text-muted">
      <nav aria-label="Informasi" className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-semibold">
        <Link href="/syarat-ketentuan" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          Syarat &amp; Ketentuan
        </Link>
        <Link href="/kebijakan-pengembalian" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          Kebijakan Pengembalian Dana
        </Link>
      </nav>
      <KontakPenjual />
      <p>
        © {NAMA_KANTIN} · dikelola {PENGELOLA}
      </p>
    </footer>
  );
}

/** Daftar kontak (Instagram, email, WhatsApp) yang bisa diklik. */
export function KontakPenjual({ className = "" }: { className?: string }) {
  const baris = [
    { jenis: "Instagram", ...KONTAK.instagram },
    { jenis: "Email", ...KONTAK.email },
    { jenis: "WhatsApp", ...KONTAK.whatsapp },
  ];
  return (
    <ul className={`space-y-1 ${className}`}>
      {baris.map((k) => (
        <li key={k.jenis}>
          {k.jenis}:{" "}
          <a href={k.href} target={k.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="font-semibold text-fg underline underline-offset-4">
            {k.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
