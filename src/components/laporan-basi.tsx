import Link from "next/link";

/** Snapshot laporan dari rumus lama (sebelum CR-002) belum dihitung ulang. */
export function LaporanBasi() {
  return (
    <Link href="/setelan" className="card block border-accent bg-accent-soft text-sm">
      🔄 Cara hitung untung sudah berubah. Laporan lama perlu dihitung ulang dulu:{" "}
      <span className="font-medium underline">Setelan → Hitung ulang semua laporan</span>
    </Link>
  );
}
