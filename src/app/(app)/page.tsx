import Link from "next/link";
import { BepCard } from "@/components/bep-card";
import { SaldoCard } from "@/components/saldo-card";
import { getHargaAktif, getPeriodeBerjalan } from "@/lib/data";
import { plus, rupiah, tanggalJam } from "@/lib/format";
import { TapPanel } from "./tap-panel";

export default async function Beranda() {
  const [p, harga] = await Promise.all([getPeriodeBerjalan(), getHargaAktif()]);
  if (!p) return null;
  const { hariSejakTutup } = p;
  const rincianHariIni = [
    `${p.kopiHariIni} terjual`,
    `${p.kopiSendiriHariIni} diminum`,
    ...(p.bbSendiriHariIni !== 0 ? [`${p.bbSendiriHariIni} Beng Beng dimakan`] : []),
  ].join(", ");

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
          <dt className="text-muted">
            Untung kopi hari ini
            <span className="block text-xs">({rincianHariIni})</span>
          </dt>
          <dd className={`text-right font-semibold ${p.untungHariIni < 0 ? "text-bad" : ""}`}>{plus(p.untungHariIni)}</dd>
          <dt className="text-muted">Untung kopi periode ini</dt>
          <dd className={`text-right font-semibold ${p.untungPeriode < 0 ? "text-bad" : ""}`}>{plus(p.untungPeriode)}</dd>
          <dt className="text-muted">Kopi terjual</dt>
          <dd className="text-right">{p.kopiPeriode} cup</dd>
          <dt className="text-muted">Belanja</dt>
          <dd className="text-right">{rupiah(p.belanjaPeriode)}</dd>
          <dt className="text-muted">Stok Beng Beng (sebelum terjual)</dt>
          <dd className="text-right">{p.stokBbTersedia} pcs</dd>
        </dl>
        <p className="text-xs text-muted">
          Untung Beng Beng dihitung saat tutup buku. Sisa Beng Beng sebenarnya juga dihitung saat tutup buku.
        </p>
      </section>

      <SaldoCard />
      <BepCard />

      {hariSejakTutup >= 7 && (
        <Link href="/tutup-buku" className="card block border-accent bg-accent-soft text-sm">
          🔒 Sudah {hariSejakTutup} hari sejak tutup buku terakhir. <span className="font-medium underline">Tutup buku sekarang</span>
        </Link>
      )}
    </main>
  );
}
