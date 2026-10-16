import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { hariTanggal, rupiah } from "@/lib/format";
import { getPesananAktif, getPesananSelesai, LABEL_STATUS, type PesananLengkap } from "@/lib/pesanan";
import { getTanggalPesanan } from "@/lib/data";
import { Pantau } from "@/app/pesan/hidup";
import { TombolMaju } from "./tombol-maju";

/** Pesanan online: yang aktif (perlu dikerjakan) dan yang selesai per hari. */
export default async function PesananPage(props: PageProps<"/pesanan">) {
  const { tgl } = await props.searchParams;
  const { hariIni, tanggal, kemarin, besok } = getTanggalPesanan(typeof tgl === "string" ? tgl : undefined);
  const [aktif, selesai] = await Promise.all([getPesananAktif(), getPesananSelesai(tanggal)]);

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
            <h2 className="text-sm font-bold text-muted">
              Selesai · {tanggal === hariIni ? "hari ini" : hariTanggal(tanggal)} ({selesai.length})
            </h2>
            <div className="flex gap-1 text-sm font-bold">
              <Link href={`/pesanan?tgl=${kemarin}`} className="chip px-3 py-1" aria-label="Hari sebelumnya">
                ‹
              </Link>
              {besok && (
                <Link href={besok === hariIni ? "/pesanan" : `/pesanan?tgl=${besok}`} className="chip px-3 py-1" aria-label="Hari berikutnya">
                  ›
                </Link>
              )}
            </div>
          </div>
          {selesai.length === 0 ? (
            <p className="card text-sm text-muted">Tidak ada.</p>
          ) : (
            <ul className="card divide-y divide-line p-0">
              {selesai.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="num w-9 font-display font-bold">#{p.nomor}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.nama}</span>
                    <span className="block truncate text-xs text-muted">{ringkas(p)}</span>
                  </span>
                  <span className="text-right">
                    <span className="num block">{rupiah(p.total)}</span>
                    <span className={`block text-xs ${p.status === "batal" ? "text-bad" : "text-muted"}`}>{LABEL_STATUS[p.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

const ringkas = (p: PesananLengkap) => p.item.map((i) => `${i.qty}× ${i.nama}${i.lessSugar ? " (less sugar)" : ""}`).join(", ");

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
    </div>
  );
}
