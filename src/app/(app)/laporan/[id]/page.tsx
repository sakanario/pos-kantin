import Link from "next/link";
import { notFound } from "next/navigation";
import { HasilView } from "@/components/hasil-view";
import { LaporanBasi } from "@/components/laporan-basi";
import { PageHeader } from "@/components/page-header";
import { BelanjaList } from "@/components/belanja-list";
import { getDataPeriode, getRiwayatTutupBuku } from "@/lib/data";
import { tanggalJam } from "@/lib/format";
import { BatalkanTutupBukuButton } from "./batalkan-button";

export default async function DetailLaporan(props: PageProps<"/laporan/[id]">) {
  const { id } = await props.params;
  const riwayat = await getRiwayatTutupBuku();
  const r = riwayat.find((x) => x.id === Number(id));
  if (!r?.hasil) notFound();
  const terakhir = riwayat[0].id === r.id;
  const { belanja } = await getDataPeriode(r.dariData, r.waktu);
  return (
    <main>
      <PageHeader title="Laporan periode" sub={`${r.dari ? tanggalJam(r.dari) : "?"} – ${tanggalJam(r.waktu)}`} />
      <div className="space-y-4 px-4">
        {r.basi ? <LaporanBasi /> : <HasilView h={r.hasil} />}
        <section>
          <h2 className="mb-2 text-sm font-bold text-muted">Belanja periode ini</h2>
          <BelanjaList items={belanja} />
        </section>
        <Link href="/laporan" className="btn-ghost w-full">
          ← Semua laporan
        </Link>
        {terakhir && <BatalkanTutupBukuButton
            id={r.id}
            saldo={r.saldoKantong}
            sisa={(r.hasil.menu ?? []).filter((m) => m.jenis === "barang_jadi").map((m) => `${m.nama}: ${m.sisa} pcs`)}
          />}
      </div>
    </main>
  );
}
