import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { rupiah } from "@/lib/format";
import { getPesananAktif, getPesananSelesai, LABEL_STATUS, type PesananLengkap } from "@/lib/pesanan";
import { hariIniWib } from "@/lib/data";
import { Pantau } from "@/app/pesan/hidup";
import { TombolBatal } from "./tombol-batal";
import { TombolMaju } from "./tombol-maju";
import { BarisPesanan } from "./baris-pesanan";

/** Pesanan online: yang aktif (perlu dikerjakan) dan yang selesai hari ini. Hari lain: Riwayat Pesanan. */
export default async function PesananPage() {
  const [aktif, selesai] = await Promise.all([getPesananAktif(), getPesananSelesai(hariIniWib())]);

  return (
    <main>
      <Pantau ms={10000} />
      <PageHeader title="Pesanan" back="/" sub="Diperbarui otomatis tiap 10 detik" />
      <div className="space-y-4 px-4">
        <section>
          <h2 className="mb-2 text-sm font-bold text-muted">Aktif ({aktif.length})</h2>
          {aktif.length === 0 ? (
            <p className="card text-sm text-muted">Belum ada pesanan yang perlu dibuat.</p>
          ) : (
            <ul className="space-y-3">
              {aktif.map((p) => (
                <li key={p.id}>
                  <KartuPesanan p={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted">Selesai · hari ini ({selesai.length})</h2>
            <Link href="/lainnya/riwayat-pesanan" className="text-sm font-bold text-accent">
              Riwayat ›
            </Link>
          </div>
          {selesai.length === 0 ? (
            <p className="card text-sm text-muted">Tidak ada.</p>
          ) : (
            <ul className="card divide-y divide-line p-0">
              {selesai.map((p) => (
                <BarisPesanan key={p.id} p={p} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function KartuPesanan({ p }: { p: PesananLengkap }) {
  return (
    <div className="card space-y-2">
      <div className="flex items-start gap-3">
        <span className="num font-display text-3xl font-extrabold leading-none">#{p.nomor}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {p.nama} <span className="badge ml-1 bg-card-raised">{p.cara === "delivery" ? "🛵 Delivery" : "🙋 Pickup"}</span>
          </p>
          <p className="text-xs text-muted">
            {LABEL_STATUS[p.status]} · {rupiah(p.total)}
          </p>
        </div>
      </div>
      <ul className="text-[15px]">
        {p.item.map((i) => (
          <li key={i.id}>
            <b>{i.qty}×</b> {i.nama} {i.lessSugar && <span className="font-bold text-accent-2">less sugar</span>}
          </li>
        ))}
      </ul>
      {p.catatan && <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">📝 {p.catatan}</p>}
      <TombolMaju id={p.id} status={p.status} cara={p.cara} />
      <TombolBatal id={p.id} nomor={p.nomor} total={p.total} tolak={p.status === "lunas"} />
    </div>
  );
}
