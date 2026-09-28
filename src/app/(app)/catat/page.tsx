import Link from "next/link";
import { getPeriodeBerjalan } from "@/lib/data";
import { isoTanggalWib, rupiah, tanggal, tanggalJam } from "@/lib/format";
import { getIsiPerDus } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { BelanjaForm, KasForm } from "./forms";
import { BelanjaList } from "@/components/belanja-list";
import { HapusButton } from "@/components/hapus-button";

export default async function CatatPage(props: PageProps<"/catat">) {
  const { tab } = await props.searchParams;
  const aktif = tab === "kas" ? "kas" : "belanja";
  const [p, isiDus] = await Promise.all([getPeriodeBerjalan(), getIsiPerDus()]);
  if (!p) return null;

  const { hariIni } = p;
  const minTanggal = isoTanggalWib(p.terakhir.waktu);

  return (
    <main>
      <PageHeader title="Catat" sub={`Periode berjalan sejak ${tanggalJam(p.terakhir.waktu)}`} />

      <div className="mx-4 mb-4 grid grid-cols-2 rounded-xl border border-line bg-card p-1 text-sm">
        {(["belanja", "kas"] as const).map((t) => (
          <Link
            key={t}
            href={t === "belanja" ? "/catat" : "/catat?tab=kas"}
            className={`rounded-lg py-2 text-center ${aktif === t ? "bg-accent font-medium text-accent-fg" : "text-muted"}`}
          >
            {t === "belanja" ? "Belanja" : "Setor Modal / Tarik"}
          </Link>
        ))}
      </div>

      <div className="space-y-4 px-4">
        {aktif === "belanja" ? (
          <>
            <BelanjaForm isiDus={isiDus} hariIni={hariIni} minTanggal={minTanggal} />
            <section>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-medium text-muted">Belanja periode ini</h2>
                <Link href="/laporan/belanja" className="text-sm text-accent">
                  Riwayat semua →
                </Link>
              </div>
              <BelanjaList items={p.data.belanja} bisaHapus />
            </section>
          </>
        ) : (
          <>
            <KasForm hariIni={hariIni} minTanggal={minTanggal} />
            <section>
              <h2 className="mb-2 text-sm font-medium text-muted">Setor / Tarik periode ini</h2>
              {p.data.kas.length === 0 ? (
                <p className="card text-sm text-muted">Belum ada catatan.</p>
              ) : (
                <ul className="card divide-y divide-line p-0">
                  {p.data.kas.map((k) => (
                    <li key={k.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{k.jenis === "setor" ? "⬇️ Setor Modal" : "⬆️ Tarik"}</div>
                        <div className="truncate text-xs text-muted">
                          {tanggal(k.waktu)}
                          {k.catatan ? ` · ${k.catatan}` : ""}
                        </div>
                      </div>
                      <div className={`num text-right text-sm ${k.jenis === "setor" ? "text-good" : "text-bad"}`}>
                        {k.jenis === "setor" ? "+" : "−"}
                        {rupiah(k.nominal)}
                      </div>
                      <HapusButton id={k.id} jenis="kas" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        <p className="text-xs text-muted">Catatan dari periode yang sudah ditutup tidak bisa diubah.</p>
      </div>
    </main>
  );
}
