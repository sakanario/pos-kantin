import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getGrafikHarian, getRiwayatTutupBuku, hariIniWib } from "@/lib/data";
import { AsetCard } from "@/components/aset-card";
import { LaporanBasi } from "@/components/laporan-basi";
import { bulanWib, isoTanggalWib, namaBulan, plus, rupiah, tanggal } from "@/lib/format";
import { GrafikBatang, NavGrafik, rentangGrafik } from "./grafik";

export default async function LaporanPage(props: PageProps<"/laporan">) {
  const [sp, riwayat] = await Promise.all([props.searchParams, getRiwayatTutupBuku()]);
  const setup = riwayat.at(-1);
  const r = rentangGrafik(sp, hariIniWib(), setup ? isoTanggalWib(setup.waktu) : null);
  const grafik = await getGrafikHarian(r.dari, r.sampai, riwayat);
  const periode = riwayat.filter((r) => r.hasil);
  const adaBasi = periode.some((r) => r.basi);

  // Rekap bulanan: gabungan periode yang tutup bukunya jatuh di bulan tersebut
  type Rekap = {
    untung: number;
    uangBersih: number;
    omzet: number;
    belanja: number;
    selisih: number;
    // untung = dari yang terjual saja; konsumsi sendiri dipisah (untung menu = untung − nilaiSendiri)
    menu: Map<string, { terjual: number; untung: number; sendiri: number; nilaiSendiri: number; satuan: string }>;
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
      const x = b.menu.get(m.nama) ?? {
        terjual: 0,
        untung: 0,
        sendiri: 0,
        nilaiSendiri: 0,
        satuan: m.jenis === "racikan" ? "cup" : "pcs",
      };
      x.terjual += m.terjual;
      x.untung += m.untung + m.nilaiSendiri;
      x.sendiri += m.sendiri;
      x.nilaiSendiri += m.nilaiSendiri;
      b.menu.set(m.nama, x);
    }
    bulanan.set(k, b);
  }

  return (
    <main>
      <PageHeader title="Laporan" />
      <div className="space-y-4 px-4">
        {adaBasi && <LaporanBasi />}
        <AsetCard />
        <section className="card space-y-4">
          <NavGrafik r={r} />
          <GrafikBatang judul="Racikan terjual" seri={grafik.racikan} satuan="cup" mode={r.mode} />
          {grafik.adaBarangJadi && (
            <div className="border-t border-line pt-4">
              <GrafikBatang
                judul="Barang jadi terjual · perkiraan"
                seri={grafik.barang}
                satuan="pcs"
                mode={r.mode}
                catatan="Dibagi rata ke hari buka di tiap tutup buku."
              />
            </div>
          )}
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
                  <RekapMenu
                    judul="Terjual"
                    baris={[...b.menu.entries()]
                      .filter(([, x]) => x.terjual !== 0 || x.untung !== 0)
                      .map(([nama, x]) => ({ nama, jumlah: `${x.terjual} ${x.satuan}`, nilai: x.untung }))}
                  />
                  <RekapMenu
                    judul="Dimakan / diminum sendiri"
                    baris={[...b.menu.entries()]
                      .filter(([, x]) => x.sendiri !== 0 || x.nilaiSendiri !== 0)
                      .map(([nama, x]) => ({ nama, jumlah: `${x.sendiri} ${x.satuan}`, nilai: -x.nilaiSendiri }))}
                  />
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

function RekapMenu({
  judul,
  baris,
}: {
  judul: string;
  baris: { nama: string; jumlah: string; nilai: number }[];
}) {
  if (baris.length === 0) return null;
  const jumlah = baris.reduce((a, x) => a + x.nilai, 0);
  return (
    <div className="mt-2 border-t border-line pt-2">
      <h4 className="mb-0.5 text-xs font-bold text-muted">{judul}</h4>
      <ul className="num space-y-0.5 text-sm">
        {baris.map((x) => (
          <li key={x.nama} className="flex justify-between gap-3">
            <span className="text-muted">
              {x.nama} · {x.jumlah}
            </span>
            <span className={x.nilai < 0 ? "text-bad" : ""}>{plus(x.nilai)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 font-semibold">
          <span>Total {judul.toLowerCase()}</span>
          <span className={jumlah < 0 ? "text-bad" : ""}>{plus(jumlah)}</span>
        </li>
      </ul>
    </div>
  );
}
