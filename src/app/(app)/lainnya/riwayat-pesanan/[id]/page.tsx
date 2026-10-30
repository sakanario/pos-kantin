import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { bulanSekarang } from "@/lib/data";
import { bulanWib, hariTanggal, isoTanggalWib, jam, rupiah, tanggalJam } from "@/lib/format";
import { getPesananId, LABEL_STATUS, pesananUji } from "@/lib/pesanan";

/** Detail satu pesanan online untuk pemilik: isi, uang (potongan gateway, refund), dan waktu-waktunya. */
export default async function DetailPesanan(props: PageProps<"/lainnya/riwayat-pesanan/[id]">) {
  const { id } = await props.params;
  const p = await getPesananId(Number(id));
  if (!p) notFound();
  const dibayar = p.dibayar!;
  const batal = p.status === "batal";
  const bulan = bulanWib(dibayar);
  const kembali = `/lainnya/riwayat-pesanan${bulan === bulanSekarang() ? "" : `?bulan=${bulan}`}`;

  const baris = (label: string, nilai: React.ReactNode, kelas = "") => (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${kelas}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right">{nilai}</span>
    </div>
  );

  return (
    <main>
      <PageHeader title={`Pesanan #${p.nomor}`} sub={`${hariTanggal(isoTanggalWib(dibayar))} · ${jam(dibayar)}`} back={kembali} />
      <div className="space-y-4 px-4">
        <section className="card">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-bold">
              {p.nama} {pesananUji(p) && <span className="badge ml-1 bg-accent-soft">UJI</span>}
            </span>
            <span className={`badge ${batal ? "bg-bad-soft text-bad" : "bg-card-raised"}`}>{LABEL_STATUS[p.status]}</span>
          </div>
          {baris("Cara ambil", p.cara === "delivery" ? "🛵 Delivery" : "🙋 Pickup")}
          {p.catatan && baris("Catatan", <span className="text-sm">{p.catatan}</span>)}
          {baris("Kode pesanan", <span className="num font-display font-bold tracking-wider">{p.kode.toUpperCase()}</span>)}
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-bold text-muted">Isi pesanan</h2>
          <ul className="divide-y divide-line">
            {p.item.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-1.5">
                <span>
                  {i.qty}× {i.nama} {i.lessSugar && <span className="font-bold text-accent-2">less sugar</span>}
                  {i.qty > 1 && <span className="block text-xs text-muted">@ {rupiah(i.harga)}</span>}
                </span>
                <span className="num whitespace-nowrap">{rupiah(i.qty * i.harga)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-bold text-muted">Uang</h2>
          {baris(`Dibayar${p.metode ? ` · ${p.metode.toUpperCase()}` : ""}`, <span className="num font-bold">{rupiah(p.total)}</span>)}
          {baris("Potongan gateway", <span className="num">−{rupiah(p.potongan)}</span>)}
          {baris(
            "Masuk ke saldo gateway",
            <span className="num font-bold">{rupiah(p.total - p.potongan)}</span>,
            "border-t border-dashed border-outline mt-1 pt-2",
          )}
          {batal && (
            <p className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
              Dibatalkan, uang {rupiah(p.total)} dikembalikan ke pembeli dari{" "}
              <b>{p.refundDari === "pribadi" ? "uang pribadi" : "Kantong Kantin"}</b>. Pesanan ini tidak dihitung terjual;
              potongan gateway tetap jadi biaya.
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-bold text-muted">Waktu</h2>
          {baris("Dipesan", <span className="num text-sm">{tanggalJam(p.dibuat)}</span>)}
          {baris("Dibayar", <span className="num text-sm">{tanggalJam(dibayar)}</span>)}
          {baris(
            batal ? "Dibatalkan" : `Terakhir (${LABEL_STATUS[p.status]})`,
            <span className="num text-sm">{tanggalJam(p.diperbarui)}</span>,
          )}
        </section>

        <Link href={kembali} className="btn-ghost w-full">
          ← Riwayat Pesanan
        </Link>
      </div>
    </main>
  );
}
