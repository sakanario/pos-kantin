import Link from "next/link";
import { getHargaAktif, getPeriodeBerjalan } from "@/lib/data";
import { rupiah, tanggalJam } from "@/lib/format";
import { TapPanel } from "./tap-panel";

export default async function Beranda() {
  const [p, harga] = await Promise.all([getPeriodeBerjalan(), getHargaAktif()]);
  if (!p) return null;
  const { hariSejakTutup } = p;

  return (
    <main className="space-y-4 px-4 pt-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Kantin</h1>
        <span className="text-sm text-muted">
          {new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long" })}
        </span>
      </header>

      <TapPanel
        counts={{
          kopi: p.kopiHariIni,
          kopi_sendiri: p.kopiSendiriHariIni,
          bb_sendiri: p.bbSendiriHariIni,
        }}
        periode={{
          kopi: p.kopiPeriode,
          kopi_sendiri: p.kopiSendiriPeriode,
          bb_sendiri: p.bbSendiriPeriode,
        }}
        hargaKopi={harga.jualKopi}
      />

      <section className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Periode berjalan</h2>
          <span className="text-xs text-muted">sejak {tanggalJam(p.terakhir.waktu)}</span>
        </div>
        <dl className="num grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted">Kopi terjual</dt>
          <dd className="text-right">{p.kopiPeriode} cup</dd>
          <dt className="text-muted">Belanja</dt>
          <dd className="text-right">{rupiah(p.belanjaPeriode)}</dd>
          <dt className="text-muted">Stok Beng Beng (sebelum terjual)</dt>
          <dd className="text-right">{p.stokBbTersedia} pcs</dd>
        </dl>
        <p className="text-xs text-muted">Sisa Beng Beng sebenarnya dihitung saat tutup buku.</p>
      </section>

      {hariSejakTutup >= 7 && (
        <Link href="/tutup-buku" className="card block border-accent bg-accent-soft text-sm">
          🔒 Sudah {hariSejakTutup} hari sejak tutup buku terakhir. <span className="font-medium underline">Tutup buku sekarang</span>
        </Link>
      )}
    </main>
  );
}
