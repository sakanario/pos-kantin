import Link from "next/link";
import { PageHeader } from "@/components/page-header";

const menu = [
  { href: "/lainnya/uang-barang", icon: "💰", label: "Uang & Barang", sub: "Saldo, stok barang, potensi" },
  { href: "/lainnya/pengeluaran", icon: "🧾", label: "Riwayat Pengeluaran", sub: "Semua belanja per bulan" },
  { href: "/setelan", icon: "⚙️", label: "Setelan", sub: "Harga, PIN, hitung ulang" },
];

export default function LainnyaPage() {
  return (
    <main>
      <PageHeader title="Lainnya" />
      <div className="space-y-2 px-4">
        {menu.map((m) => (
          <Link key={m.href} href={m.href} className="card flex items-center justify-between">
            <span>
              <span className="font-medium">
                {m.icon} {m.label}
              </span>
              <span className="block text-sm text-muted">{m.sub}</span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
