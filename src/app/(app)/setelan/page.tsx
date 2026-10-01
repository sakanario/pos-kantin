import { logoutAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { getHargaAktif, getSemuaHarga } from "@/lib/data";
import { rupiah, tanggal } from "@/lib/format";
import { getIsiPerDus } from "@/lib/settings";
import { GantiPinForm, HargaForm, HitungUlangForm, IsiDusForm } from "./forms";

const labelHarga = {
  "bb-jual": "Jual Beng Beng",
  "kopi-jual": "Jual Kopi",
  "kopi-hpp": "HPP Kopi Sendiri",
} as const;

export default async function SetelanPage() {
  const [aktif, semua, isiDus] = await Promise.all([getHargaAktif(), getSemuaHarga(), getIsiPerDus()]);
  const riwayat = [...semua].reverse();

  return (
    <main>
      <PageHeader title="Setelan" />
      <div className="space-y-4 px-4">
        <section className="card space-y-4">
          <div>
            <h2 className="font-medium">Harga</h2>
            <p className="text-xs text-muted">
              Harga baru berlaku mulai saat disimpan. Laporan lama tetap memakai harga lama. Ubah harga Beng Beng sebaiknya
              tepat saat tutup buku.
            </p>
          </div>
          <HargaForm hargaKey="jual_bb" label="Harga jual Beng Beng / pcs" nilai={aktif.jualBb} />
          <HargaForm hargaKey="jual_kopi" label="Harga jual Kopi / cup" nilai={aktif.jualKopi} />
          <HargaForm hargaKey="hpp_kopi" label="HPP estimasi Kopi / cup (untuk kopi sendiri)" nilai={aktif.hppKopi} />
          <details>
            <summary className="cursor-pointer text-sm text-muted">Riwayat harga</summary>
            <ul className="num mt-2 space-y-1 text-sm">
              {riwayat.map((h, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {labelHarga[`${h.produk}-${h.jenis}` as keyof typeof labelHarga]}
                    <span className="text-muted"> · {h.berlakuMulai === 0 ? "awal" : tanggal(h.berlakuMulai)}</span>
                  </span>
                  <span>{rupiah(h.nilai)}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="card space-y-3">
          <h2 className="font-medium">Beng Beng</h2>
          <IsiDusForm isiDus={isiDus} />
        </section>

        <section className="card space-y-3">
          <div>
            <h2 className="font-medium">Laporan</h2>
            <p className="text-xs text-muted">
              Hitung ulang semua tutup buku dengan rumus terbaru. Input tutup buku (saldo, sisa Beng Beng) tidak berubah.
            </p>
          </div>
          <HitungUlangForm />
        </section>

        <section className="card space-y-3">
          <h2 className="font-medium">Ganti PIN</h2>
          <GantiPinForm />
        </section>

        <form action={logoutAction}>
          <button className="btn-ghost w-full text-bad">Keluar</button>
        </form>
      </div>
    </main>
  );
}
