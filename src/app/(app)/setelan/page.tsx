import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { getGaya, getTema } from "@/lib/tema-server";
import { GantiPinForm, GayaPicker, HitungUlangForm, TemaPicker } from "./forms";

export default async function SetelanPage() {
  const [gaya, tema] = await Promise.all([getGaya(), getTema()]);
  return (
    <main>
      <PageHeader title="Setelan" back="/lainnya" />
      <div className="space-y-4 px-4">
        <p className="card text-sm text-muted">
          Harga jual dan resep diatur per menu di{" "}
          <Link href="/lainnya/menu" className="text-accent underline">
            Lainnya → Menu
          </Link>
          . Harga bahan mengikuti belanja di{" "}
          <Link href="/lainnya/bahan" className="text-accent underline">
            Lainnya → Bahan
          </Link>
          .
        </p>

        <section className="card space-y-4">
          <div>
            <h2 className="font-bold">Tampilan</h2>
            <p className="text-xs text-muted">Berlaku untuk perangkat ini saja.</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Gaya</p>
            <GayaPicker gaya={gaya} />
            <p className="text-xs text-muted">Pop = kuning-biru, tepi tebal. Poster = kuning mustard, label arang, huruf sempit.</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Tema</p>
            <TemaPicker tema={tema} />
            <p className="text-xs text-muted">&ldquo;Ikut HP&rdquo; mengikuti mode gelap HP.</p>
          </div>
        </section>

        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Laporan</h2>
            <p className="text-xs text-muted">
              Hitung ulang semua tutup buku dengan rumus terbaru. Input tutup buku (saldo, sisa stok) tidak berubah.
            </p>
          </div>
          <HitungUlangForm />
        </section>

        <section className="card space-y-3">
          <h2 className="font-bold">Ganti PIN</h2>
          <GantiPinForm />
        </section>

        <form action={logoutAction}>
          <button className="btn-ghost w-full text-bad">Keluar</button>
        </form>
      </div>
    </main>
  );
}
