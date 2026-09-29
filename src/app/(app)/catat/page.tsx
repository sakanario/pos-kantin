import Link from "next/link";
import { BelanjaList } from "@/components/belanja-list";
import { PageHeader } from "@/components/page-header";
import { getInfoTutup, getPeriodeBerjalan, getSemuaKas } from "@/lib/data";
import { rupiah, tanggal, tanggalJam } from "@/lib/format";
import { getIsiPerDus } from "@/lib/settings";
import { BelanjaForm, KasForm } from "./forms";
import { KopiTab } from "./kopi-tab";
import { CatatTabs, type TabCatat } from "./tabs";

export default async function CatatPage(props: PageProps<"/catat">) {
  const { tab } = await props.searchParams;
  const aktif: TabCatat = tab === "kas" || tab === "kopi" ? tab : "belanja";
  const [p, isiDus, { setup, tutup }, semuaKas] = await Promise.all([
    getPeriodeBerjalan(),
    getIsiPerDus(),
    getInfoTutup(),
    getSemuaKas(),
  ]);
  if (!p) return null;
  const info = { setup, tutup };

  return (
    <main>
      <PageHeader title="Catat" sub={`Periode berjalan sejak ${tanggalJam(p.terakhir.waktu)}`} />

      <CatatTabs aktif={aktif}>
        <div className="space-y-4 px-4">
          {aktif === "belanja" ? (
            <>
              <BelanjaForm isiDus={isiDus} hariIni={p.hariIni} info={info} />
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-medium text-muted">Belanja periode ini</h2>
                  <Link href="/laporan/belanja" className="text-sm text-accent">
                    Riwayat semua →
                  </Link>
                </div>
                <BelanjaList items={p.data.belanja} />
              </section>
            </>
          ) : aktif === "kopi" ? (
            <KopiTab hariIni={p.hariIni} info={info} />
          ) : (
            <>
              <KasForm hariIni={p.hariIni} info={info} />
              <section>
                <h2 className="mb-2 text-sm font-medium text-muted">Semua setor / tarik</h2>
                {semuaKas.length === 0 ? (
                  <p className="card text-sm text-muted">Belum ada catatan.</p>
                ) : (
                  <ul className="card divide-y divide-line p-0">
                    {semuaKas.map((k) => (
                      <li key={k.id}>
                        <Link href={`/catat/kas/${k.id}`} className="flex items-center gap-3 px-4 py-3">
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
                          <span className="text-muted">›</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
          <p className="text-xs text-muted">
            Tap catatan untuk mengubah atau menghapus. Catatan lama juga bisa diubah; laporan periode yang terdampak dihitung
            ulang otomatis.
          </p>
        </div>
      </CatatTabs>
    </main>
  );
}
