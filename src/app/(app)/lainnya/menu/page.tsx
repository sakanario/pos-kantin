import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getDaftarMenu } from "@/lib/data";
import { rupiah } from "@/lib/format";

export default async function DaftarMenuPage() {
  const menu = await getDaftarMenu();
  const grup = [
    ["Aktif", menu.filter((m) => m.aktif)],
    ["Nonaktif", menu.filter((m) => !m.aktif)],
  ] as const;

  return (
    <main>
      <PageHeader title="Menu" back="/lainnya" />
      <div className="space-y-4 px-4">
        {menu.length === 0 && (
          <p className="card text-sm text-muted">
            Belum ada menu. Racikan (kopi) butuh bahan untuk resepnya: buat bahan dulu di{" "}
            <Link href="/lainnya/bahan" className="text-accent underline">
              Lainnya → Bahan
            </Link>
            .
          </p>
        )}
        {grup.map(([judul, items]) =>
          items.length === 0 ? null : (
            <section key={judul}>
              <h2 className="mb-2 text-sm font-bold text-muted">{judul}</h2>
              <ul className="card divide-y divide-line p-0">
                {items.map((m) => (
                  <li key={m.id}>
                    <Link href={`/lainnya/menu/${m.id}`} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {m.jenis === "racikan" ? "☕" : "🍫"} {m.nama}
                        </div>
                        <div className="num text-xs text-muted">
                          {m.jenis === "racikan" ? "HPP" : "modal"} {rupiah(m.modal)} · untung {rupiah(m.hargaJual - m.modal)}
                          {m.jenis === "racikan" && m.resep.length === 0 && " · ⚠️ resep kosong"}
                        </div>
                      </div>
                      <span className="num text-sm">{rupiah(m.hargaJual)}</span>
                      <span className="text-muted">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
        <Link href="/lainnya/menu/baru" className="btn-primary w-full">
          + Menu baru
        </Link>
      </div>
    </main>
  );
}
