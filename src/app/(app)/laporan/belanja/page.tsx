import Link from "next/link";
import { BelanjaList, labelKategori } from "@/components/belanja-list";
import { PageHeader } from "@/components/page-header";
import { bulanSekarang, getBelanjaBulan, getBelanjaPertama } from "@/lib/data";
import { bulanWib, namaBulan, rupiah } from "@/lib/format";

type Kategori = keyof typeof labelKategori;

function geserBulan(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function RiwayatBelanjaPage(props: PageProps<"/laporan/belanja">) {
  const sp = await props.searchParams;
  const sekarang = bulanSekarang();
  const bulan = typeof sp.bulan === "string" && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : sekarang;
  const kategori = typeof sp.kategori === "string" && sp.kategori in labelKategori ? (sp.kategori as Kategori) : null;

  const [semua, pertama] = await Promise.all([getBelanjaBulan(bulan), getBelanjaPertama()]);
  const items = kategori ? semua.filter((b) => b.kategori === kategori) : semua;

  const total = (k?: Kategori) => semua.filter((b) => !k || b.kategori === k).reduce((a, b) => a + b.total, 0);
  const pribadi = items.filter((b) => b.sumber === "pribadi").reduce((a, b) => a + b.total, 0);

  const sebelum = geserBulan(bulan, -1);
  const sesudah = geserBulan(bulan, 1);
  const adaSebelum = pertama !== null && sebelum >= bulanWib(pertama);
  const adaSesudah = sesudah <= sekarang;

  const href = (b: string, k: Kategori | null) => {
    const q = new URLSearchParams();
    if (b !== sekarang) q.set("bulan", b);
    if (k) q.set("kategori", k);
    const s = q.toString();
    return `/laporan/belanja${s ? `?${s}` : ""}`;
  };

  return (
    <main>
      <PageHeader title="Riwayat Pengeluaran" />
      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between">
          {adaSebelum ? (
            <Link href={href(sebelum, kategori)} className="btn-ghost px-3 py-1.5">
              ‹
            </Link>
          ) : (
            <span className="w-10" />
          )}
          <span className="font-medium">{namaBulan(bulan)}</span>
          {adaSesudah ? (
            <Link href={href(sesudah, kategori)} className="btn-ghost px-3 py-1.5">
              ›
            </Link>
          ) : (
            <span className="w-10" />
          )}
        </div>

        <section className="card">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Total bulan ini</span>
            <span className="num text-2xl font-semibold">{rupiah(total())}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(Object.keys(labelKategori) as Kategori[]).map((k) => (
              <Link
                key={k}
                href={href(bulan, kategori === k ? null : k)}
                className={`rounded-xl border px-1 py-2 ${kategori === k ? "border-accent bg-accent-soft" : "border-line"}`}
              >
                <div className="text-xs text-muted">{labelKategori[k]}</div>
                <div className="num text-sm font-medium">{rupiah(total(k))}</div>
              </Link>
            ))}
          </div>
          {kategori && (
            <p className="mt-2 text-xs text-muted">
              Filter: {labelKategori[kategori]}.{" "}
              <Link href={href(bulan, null)} className="text-accent underline">
                Tampilkan semua
              </Link>
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">
            {items.length} catatan{pribadi > 0 && ` · ${rupiah(pribadi)} dibayar pribadi`}
          </h2>
          <BelanjaList items={items} kosong="Tidak ada belanja di bulan ini." />
        </section>

        <p className="text-xs text-muted">
          Tap catatan untuk mengubah atau menghapus.
        </p>
      </div>
    </main>
  );
}
