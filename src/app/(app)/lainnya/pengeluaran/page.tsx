import Link from "next/link";
import { BelanjaList, labelKategori } from "@/components/belanja-list";
import { NavBulan } from "@/components/nav-bulan";
import { PageHeader } from "@/components/page-header";
import { bulanSekarang, getBelanjaBulan, getBelanjaPertama } from "@/lib/data";
import { bulanDariParam, bulanWib, geserBulan, rupiah } from "@/lib/format";

type Kategori = keyof typeof labelKategori;

export default async function RiwayatBelanjaPage(props: PageProps<"/lainnya/pengeluaran">) {
  const sp = await props.searchParams;
  const sekarang = bulanSekarang();
  const bulan = bulanDariParam(sp.bulan, sekarang);
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
    return `/lainnya/pengeluaran${s ? `?${s}` : ""}`;
  };

  return (
    <main>
      <PageHeader title="Riwayat Pengeluaran" back="/lainnya" />
      <div className="space-y-4 px-4">
        <NavBulan
          bulan={bulan}
          sebelum={adaSebelum ? href(sebelum, kategori) : null}
          sesudah={adaSesudah ? href(sesudah, kategori) : null}
        />

        <section className="card">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Total bulan ini</span>
            <span className="num font-display text-2xl font-extrabold">{rupiah(total())}</span>
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
          <h2 className="mb-2 text-sm font-bold text-muted">
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
