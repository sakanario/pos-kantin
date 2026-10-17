import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { rupiah } from "@/lib/format";
import { NAMA_KANTIN } from "@/lib/katalog";
import { getPesananKode, LABEL_STATUS, sisaBayar } from "@/lib/pesanan";
import { ikonJam } from "@/components/ikon";
import { Pantau, SisaWaktu } from "../../hidup";
import { AksiBayar } from "./aksi-bayar";

export const metadata: Metadata = { title: `Bayar · ${NAMA_KANTIN}` };

/** QRIS pesanan + tombol simpan QR. Halaman pindah sendiri ke struk setelah gateway menandai lunas. */
export default async function BayarPage(props: PageProps<"/pesan/[kode]/bayar">) {
  await connection();
  const { kode } = await props.params;
  const p = await getPesananKode(kode);
  if (!p) notFound();
  if (p.dibayar !== null) redirect(`/pesan/${p.kode}`);

  if (p.status !== "menunggu_bayar") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md animate-masuk flex-col gap-4 px-4 pt-10 text-center">
        <h1 className="text-2xl font-bold">{p.status === "kedaluwarsa" ? "Pembayaran kedaluwarsa" : LABEL_STATUS[p.status]}</h1>
        <p className="text-muted">
          {p.status === "kedaluwarsa"
            ? "Pesanan ini tidak dibayar dalam 15 menit. Keranjangmu masih ada, silakan pesan lagi."
            : "Pesanan ini sudah dibatalkan."}
        </p>
        <Link href="/pesan/keranjang" className="btn-primary self-center">
          Pesan lagi
        </Link>
      </main>
    );
  }

  // Gateway palsu: isi QR hanya penanda (tidak bisa dibayar). Tahap 3b: QRIS dari Midtrans.
  const isiQr = `PALSU-${p.kode}`;
  const [svg, png] = await Promise.all([
    QRCode.toString(isiQr, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
    QRCode.toDataURL(isiQr, { margin: 2, width: 600 }),
  ]);
  const palsu = p.gateway === "palsu";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-[18px] px-4 pb-10 pt-7">
      <Pantau ms={3000} />
      <div className="animate-masuk text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-[.12em] text-muted">Bayar pesanan {p.nama}</p>
        <p className="num mt-1.5 font-display text-[40px] font-extrabold leading-[44px]">{rupiah(p.total)}</p>
      </div>

      <div className="card flex animate-muncul flex-col items-center gap-3.5 p-5" style={{ animationDelay: "80ms" }}>
        <div className="relative size-[232px] rounded-[var(--r-md)] bg-white p-2 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        {palsu && <p className="-mt-1 text-xs font-bold text-bad">QR CONTOH (gateway palsu) · tidak bisa dibayar</p>}
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sun px-3.5 py-1.5 font-display text-sm font-bold text-on-sun">
          {ikonJam}Berlaku <SisaWaktu sisaMs={sisaBayar(p)} />
        </p>
      </div>

      <AksiBayar kode={p.kode} png={png} palsu={palsu} />

      <p className="animate-masuk text-center text-sm text-muted" style={{ animationDelay: "240ms" }}>Halaman ini pindah sendiri setelah pembayaran masuk.</p>
    </main>
  );
}
