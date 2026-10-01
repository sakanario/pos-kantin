import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getBelanjaBelumDitandai, getDaftarBahan } from "@/lib/data";
import { perSatuan, rupiah, tanggal, tanggalPendek } from "@/lib/format";
import { BahanForm, TandaiForm } from "./forms";

export default async function DaftarBahanPage() {
  const [bahan, belum] = await Promise.all([getDaftarBahan(), getBelanjaBelumDitandai()]);

  return (
    <main>
      <PageHeader title="Bahan" back="/lainnya" />
      <div className="space-y-4 px-4">
        {bahan.length > 0 && (
          <ul className="card divide-y divide-line p-0">
            {bahan.map((b) => (
              <li key={b.id}>
                <Link href={`/lainnya/bahan/${b.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{b.nama}</div>
                    <div className="truncate text-xs text-muted">
                      {b.beliAktif ? `${b.beliAktif.nama} · ${tanggalPendek(b.beliAktif.waktu)}` : "harga awal (belum ada belanja)"}
                    </div>
                  </div>
                  <span className="num text-sm">{perSatuan(b.hargaSekarang, b.satuan)}</span>
                  <span className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {belum.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted">Belanja bahan belum ditandai ({belum.length})</h2>
            <p className="text-xs text-muted">
              Belanja dari sebelum ada fitur bahan. Tandai bahannya supaya harganya dipakai untuk HPP.
              {bahan.length === 0 && " Buat bahannya dulu di bawah."}
            </p>
            {bahan.length > 0 && (
              <ul className="space-y-2">
                {belum.map((x) => (
                  <li key={x.id} className="card space-y-2 p-3">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-medium">{x.nama}</span>
                      <span className="num text-muted">
                        {rupiah(x.total)} · {tanggal(x.waktu)}
                      </span>
                    </div>
                    <TandaiForm belanja={x} bahan={bahan} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <BahanForm />
        <p className="text-xs text-muted">
          Satu bahan = satu peran dalam resep. Merek beda dengan takaran sama tetap satu bahan (Nescafe & Indocafe → Kopi).
          Bahan yang tidak dipakai resep (es batu, plastik) boleh dibuat juga: tetap jadi biaya, tidak memengaruhi HPP.
        </p>
      </div>
    </main>
  );
}
