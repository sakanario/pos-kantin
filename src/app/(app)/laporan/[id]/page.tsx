import Link from "next/link";
import { notFound } from "next/navigation";
import { HasilView } from "@/components/hasil-view";
import { PageHeader } from "@/components/page-header";
import { BelanjaList } from "@/components/belanja-list";
import { getDataPeriode, getRiwayatTutupBuku } from "@/lib/data";
import { tanggalJam } from "@/lib/format";

export default async function DetailLaporan(props: PageProps<"/laporan/[id]">) {
  const { id } = await props.params;
  const r = (await getRiwayatTutupBuku()).find((x) => x.id === Number(id));
  if (!r?.hasil) notFound();
  const { belanja } = await getDataPeriode(r.dari ?? 0, r.waktu);
  return (
    <main>
      <PageHeader title="Laporan periode" sub={`${r.dari ? tanggalJam(r.dari) : "?"} – ${tanggalJam(r.waktu)}`} />
      <div className="space-y-4 px-4">
        <HasilView h={r.hasil} />
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Belanja periode ini</h2>
          <BelanjaList items={belanja} />
        </section>
        <Link href="/laporan" className="btn-ghost w-full">
          ← Semua laporan
        </Link>
      </div>
    </main>
  );
}
