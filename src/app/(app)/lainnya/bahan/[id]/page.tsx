import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getDetailBahan, getInfoTutup } from "@/lib/data";
import { desimal, perSatuan, rupiah, tanggalPendek } from "@/lib/format";
import { BahanForm, HapusBahanButton, PakaiIniForm } from "../forms";
import { SisaKemasan } from "../sisa-kemasan";

export default async function DetailBahanPage(props: PageProps<"/lainnya/bahan/[id]">) {
  const { id } = await props.params;
  const [b, { setup, tutup }] = await Promise.all([getDetailBahan(Number(id)), getInfoTutup()]);
  if (!b) notFound();
  const { hariIni } = b;

  return (
    <main>
      <PageHeader
        title={b.nama}
        back="/lainnya/bahan"
        sub={`${b.satuan} · ${perSatuan(b.hargaSekarang, b.satuan)} sekarang`}
      />
      <div className="space-y-4 px-4">
        <section className="card text-sm">
          <span className="text-muted">Dipakai di: </span>
          {b.dipakaiDi.length === 0
            ? "belum ada resep"
            : b.dipakaiDi.map((m) => `${m.nama} (${desimal(m.takaran)} ${b.satuan} = ${rupiah(m.takaran * b.hargaSekarang)})`).join(", ")}
        </section>

        {b.kemasan && b.beliAktif && (
          <section className="card space-y-1 text-sm">
            <div className="text-muted">Kemasan yang dipakai: {b.beliAktif.nama}</div>
            <SisaKemasan k={b.kemasan} cadangan={b.cadangan} />
            <p className="text-xs text-muted">
              Perkiraan dari isi kemasan ÷ takaran resep, dikurangi cup terjual + diminum sendiri sejak kemasan ini dibuka.
              Bisa meleset kalau takaran kurang dari resep atau kemasan digabung.
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">3 pembelian terakhir</h2>
          {b.pembelian.length === 0 ? (
            <p className="card text-sm text-muted">Belum ada belanja bahan ini. Harga awal yang dipakai.</p>
          ) : (
            <ul className="card divide-y divide-line p-0">
              {b.pembelian.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <span className={p.aktif ? "text-accent" : "text-muted"}>{p.aktif ? "●" : "○"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.nama}</div>
                    <div className="num text-xs text-muted">
                      {p.hargaSatuan !== null ? perSatuan(p.hargaSatuan, b.satuan) : "isi belum diisi"} · beli {tanggalPendek(p.waktu)}
                      {p.aktif && p.aktifSejak !== null && ` · aktif ${p.aktifSejak === 0 ? "sejak awal" : `sejak ${tanggalPendek(p.aktifSejak)}`}`}
                    </div>
                  </div>
                  {p.hargaSatuan !== null && <PakaiIniForm belanjaId={p.id} aktif={p.aktif} hariIni={hariIni} info={{ setup, tutup }} />}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted">
            ● = kemasan yang sedang dipakai untuk HPP. Stok lama dihabiskan dulu; tekan &quot;Pakai ini&quot; saat mulai membuka kemasan
            baru.
          </p>
        </section>

        <BahanForm edit={b} />
        {b.pembelian.length === 0 && b.dipakaiDi.length === 0 && <HapusBahanButton id={b.id} />}
      </div>
    </main>
  );
}
