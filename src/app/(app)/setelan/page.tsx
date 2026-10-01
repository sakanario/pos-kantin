import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { getTema } from "@/lib/tema-server";
import { GantiPinForm, HitungUlangForm, TemaPicker } from "./forms";

export default async function SetelanPage() {
  const tema = await getTema();
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

        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Tampilan</h2>
            <p className="text-xs text-muted">
              Terang = latar kuning, Gelap = latar navy. &ldquo;Ikut HP&rdquo; mengikuti mode gelap HP. Berlaku untuk
              perangkat ini saja.
            </p>
          </div>
          <TemaPicker tema={tema} />
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
