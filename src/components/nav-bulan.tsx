import Link from "next/link";
import { namaBulan } from "@/lib/format";

/** ‹ Bulan Tahun › — panah hilang bila tidak ada bulan sebelum/sesudahnya (null). */
export function NavBulan({
  bulan,
  sebelum,
  sesudah,
  scroll,
}: {
  bulan: string;
  sebelum: string | null;
  sesudah: string | null;
  scroll?: boolean;
}) {
  const panah = (href: string | null, label: string, aria: string) =>
    href ? (
      <Link href={href} scroll={scroll} className="btn-ghost px-3 py-1.5" aria-label={aria}>
        {label}
      </Link>
    ) : (
      <span className="w-10" />
    );
  return (
    <div className="flex items-center justify-between">
      {panah(sebelum, "‹", "Bulan sebelumnya")}
      <span className="font-medium">{namaBulan(bulan)}</span>
      {panah(sesudah, "›", "Bulan berikutnya")}
    </div>
  );
}
