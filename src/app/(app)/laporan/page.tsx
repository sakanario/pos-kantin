import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getRiwayatTutupBuku, getTerjualPerHari } from "@/lib/data";
import { LaporanBasi } from "@/components/laporan-basi";
import { bulanWib, namaBulan, plus, rupiah, tanggal } from "@/lib/format";

export default async function LaporanPage() {
  const [riwayat, kopiHarian] = await Promise.all([getRiwayatTutupBuku(), getTerjualPerHari(14)]);
  const periode = riwayat.filter((r) => r.hasil);
  const adaBasi = periode.some((r) => r.basi);

  // Rekap bulanan: gabungan periode yang tutup bukunya jatuh di bulan tersebut
  type Rekap = {
    untung: number;
    uangBersih: number;
    omzet: number;
    belanja: number;
    selisih: number;
    menu: Map<string, { terjual: number; untung: number; satuan: string }>;
  };
  const bulanan = new Map<string, Rekap>();
  for (const r of periode) {
    if (r.basi) continue;
    const h = r.hasil!;
    const k = bulanWib(r.waktu);
    const b = bulanan.get(k) ?? { untung: 0, uangBersih: 0, omzet: 0, belanja: 0, selisih: 0, menu: new Map() };
    b.untung += h.untungJualan;
    b.uangBersih += h.uangBersih;
    b.omzet += h.omzetNyata;
    b.belanja += h.belanjaTotal;
    b.selisih += h.selisih;
    for (const m of h.menu) {
      const x = b.menu.get(m.nama) ?? { terjual: 0, untung: 0, satuan: m.jenis === "racikan" ? "cup" : "pcs" };
      x.terjual += m.terjual;
      x.untung += m.untung;
      b.menu.set(m.nama, x);
    }
    bulanan.set(k, b);
  }

  const maxKopi = Math.max(1, ...kopiHarian.map((d) => d.jumlah));

  return (
    <main>
      <PageHeader title="Laporan" />
      <div className="space-y-4 px-4">
        {adaBasi && <LaporanBasi />}
        <section className="card">
          <h2 className="mb-3 font-bold">Racikan terjual, 14 hari terakhir</h2>
          <div className="flex h-32 items-end gap-1">
            {kopiHarian.map((d) => (
              <div key={d.tgl} className="flex flex-1 flex-col items-center gap-1" title={`${d.tgl}: ${d.jumlah} cup`}>
                <span className="num text-[10px] text-muted">{d.jumlah || ""}</span>
                <div
                  className="w-full rounded-t bg-accent"
                  style={{ height: `${(Math.max(0, d.jumlah) / maxKopi) * 88}px`, minHeight: d.jumlah > 0 ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 border-t border-line pt-1">
            {kopiHarian.map((d) => (
              <span key={d.tgl} className="num flex-1 text-center text-[10px] text-muted">
                {Number(d.tgl.slice(8))}
              </span>
            ))}
          </div>
        </section>

        {bulanan.size > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-muted">Per bulan · untung jualan</h2>
            <div className="space-y-2">
              {[...bulanan.entries()].map(([k, b]) => (
                <div key={k} className="card">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-bold">{namaBulan(k)}</h3>
                    <span className="text-right">
                      <span className={`num block text-lg font-semibold ${b.untung < 0 ? "text-bad" : ""}`}>
                        {plus(b.untung)}
                      </span>
                      <span className="num block text-xs text-muted">uang bersih {plus(b.uangBersih)}</span>
                    </span>
                  </div>
                  <div className="num mt-1 grid grid-cols-2 gap-x-4 text-sm text-muted">
                    <span>Omzet {rupiah(b.omzet)}</span>
                    <span className="text-right">Belanja {rupiah(b.belanja)}</span>
                    <span />
                    <span className={`text-right ${b.selisih < 0 ? "text-bad" : ""}`}>Selisih {rupiah(b.selisih)}</span>
                  </div>
                  {b.menu.size > 0 && (
                    <ul className="num mt-2 space-y-0.5 border-t border-line pt-2 text-sm">
                      {[...b.menu.entries()].map(([nama, x]) => (
                        <li key={nama} className="flex justify-between gap-3">
                          <span className="text-muted">
                            {nama} · {x.terjual} {x.satuan}
                          </span>
                          <span className={x.untung < 0 ? "text-bad" : ""}>{plus(x.untung)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold text-muted">Per periode tutup buku · untung jualan</h2>
          {periode.length === 0 ? (
            <p className="card text-sm text-muted">
              Belum ada tutup buku. Laporan muncul setelah kamu melakukan{" "}
              <Link href="/tutup-buku" className="text-accent underline">
                tutup buku
              </Link>{" "}
              pertama.
            </p>
          ) : (
            <ul className="card divide-y divide-line p-0">
              {periode.map((r) => (
                <li key={r.id}>
                  <Link href={`/laporan/${r.id}`} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="font-medium">
                        {r.dari ? tanggal(r.dari) : "?"} – {tanggal(r.waktu)}
                      </div>
                      <div className={`text-xs ${r.hasil!.selisih < 0 ? "text-bad" : "text-muted"}`}>
                        {r.basi
                          ? "dihitung dengan rumus lama"
                          : r.hasil!.menu
                              .filter((m) => m.terjual !== 0)
                              .map((m) => `${m.terjual} ${m.nama}`)
                              .join(" · ") || "belum ada yang terjual"}
                        {r.hasil!.selisih !== 0 && ` · selisih ${rupiah(r.hasil!.selisih)}`}
                      </div>
                    </div>
                    {r.basi ? (
                      <span className="text-sm text-muted">perlu hitung ulang ›</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="text-right">
                          <span className={`num block font-semibold ${r.hasil!.untungJualan < 0 ? "text-bad" : ""}`}>
                            {plus(r.hasil!.untungJualan)}
                          </span>
                          <span className="num block text-xs text-muted">uang {plus(r.hasil!.uangBersih)}</span>
                        </span>
                        <span className="text-muted">›</span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
