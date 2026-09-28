import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SaldoCard } from "@/components/saldo-card";
import { getKopiPerHari, getRiwayatTutupBuku } from "@/lib/data";
import { bulanWib, namaBulan, rupiah, tanggal } from "@/lib/format";

export default async function LaporanPage() {
  const [riwayat, kopiHarian] = await Promise.all([getRiwayatTutupBuku(), getKopiPerHari(14)]);
  const periode = riwayat.filter((r) => r.hasil);

  // Rekap bulanan: gabungan periode yang tutup bukunya jatuh di bulan tersebut
  const bulanan = new Map<string, { profit: number; omzet: number; belanja: number; selisih: number; kopi: number; bb: number }>();
  for (const r of periode) {
    const h = r.hasil!;
    const k = bulanWib(r.waktu);
    const b = bulanan.get(k) ?? { profit: 0, omzet: 0, belanja: 0, selisih: 0, kopi: 0, bb: 0 };
    b.profit += h.profit;
    b.omzet += h.omzetNyata;
    b.belanja += h.belanjaTotal;
    b.selisih += h.selisih;
    b.kopi += h.kopiTerjual;
    b.bb += h.bbTerjual;
    bulanan.set(k, b);
  }

  const maxKopi = Math.max(1, ...kopiHarian.map((d) => d.jumlah));

  return (
    <main>
      <PageHeader title="Laporan" />
      <div className="space-y-4 px-4">
        <SaldoCard />
        <Link href="/laporan/belanja" className="card flex items-center justify-between">
          <span>
            <span className="font-medium">🧾 Riwayat Pengeluaran</span>
            <span className="block text-sm text-muted">Semua belanja per bulan</span>
          </span>
          <span className="text-muted">›</span>
        </Link>
        <section className="card">
          <h2 className="mb-3 font-medium">Kopi terjual, 14 hari terakhir</h2>
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
            <h2 className="mb-2 text-sm font-medium text-muted">Per bulan</h2>
            <div className="space-y-2">
              {[...bulanan.entries()].map(([k, b]) => (
                <div key={k} className="card">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium">{namaBulan(k)}</h3>
                    <span className={`num text-lg font-semibold ${b.profit < 0 ? "text-bad" : ""}`}>{rupiah(b.profit)}</span>
                  </div>
                  <div className="num mt-1 grid grid-cols-2 gap-x-4 text-sm text-muted">
                    <span>Omzet {rupiah(b.omzet)}</span>
                    <span className="text-right">Belanja {rupiah(b.belanja)}</span>
                    <span>
                      {b.kopi} kopi · {b.bb} Beng Beng
                    </span>
                    <span className={`text-right ${b.selisih < 0 ? "text-bad" : ""}`}>Selisih {rupiah(b.selisih)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Per periode tutup buku</h2>
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
                        {r.hasil!.kopiTerjual} kopi · {r.hasil!.bbTerjual} Beng Beng
                        {r.hasil!.selisih !== 0 && ` · selisih ${rupiah(r.hasil!.selisih)}`}
                      </div>
                    </div>
                    <span className={`num font-semibold ${r.hasil!.profit < 0 ? "text-bad" : ""}`}>
                      {rupiah(r.hasil!.profit)} ›
                    </span>
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
