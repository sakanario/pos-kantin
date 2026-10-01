import Link from "next/link";
import { BepCard } from "@/components/bep-card";
import { SaldoCard } from "@/components/saldo-card";
import { getPengingatKemasan, getPeriodeBerjalan } from "@/lib/data";
import { plus, rupiah, tanggalJam } from "@/lib/format";
import { PengingatKemasan } from "./pengingat-kemasan";
import { TapPanel } from "./tap-panel";

export default async function Beranda() {
  const [p, pengingat] = await Promise.all([getPeriodeBerjalan(), getPengingatKemasan()]);
  if (!p) return null;
  const { hariSejakTutup } = p;
  const aktif = p.menu.filter((m) => m.aktif);
  const racikan = p.menu.filter((m) => m.jenis === "racikan" && (m.aktif || m.periode.terjual !== 0));
  const barang = p.menu.filter((m) => m.jenis === "barang_jadi" && (m.aktif || m.stokTersedia !== 0));
  const terjualHariIni = racikan.reduce((a, m) => a + m.hariIni.terjual, 0);
  const sendiriHariIni = racikan.reduce((a, m) => a + m.hariIni.sendiri, 0);
  const barangSendiriHariIni = barang.reduce((a, m) => a + m.hariIni.sendiri, 0);
  const rincianHariIni = [
    `${terjualHariIni} terjual`,
    `${sendiriHariIni} diminum`,
    ...(barangSendiriHariIni !== 0 ? [`${barangSendiriHariIni} barang dimakan`] : []),
  ].join(", ");

  return (
    <main className="space-y-4 px-4 pt-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Kantin</h1>
        <span className="text-sm text-muted">
          {new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long" })}
        </span>
      </header>

      <PengingatKemasan items={pengingat} />

      {aktif.length === 0 ? (
        <Link href="/lainnya/menu" className="card block border-accent bg-accent-soft text-sm">
          🍽️ Belum ada menu aktif. <span className="font-medium underline">Buat menu</span> dulu supaya bisa tap penjualan.
        </Link>
      ) : (
        <TapPanel menu={aktif} />
      )}

      <section className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Periode berjalan</h2>
          <span className="text-xs text-muted">sejak {tanggalJam(p.terakhir.waktu)}</span>
        </div>
        <dl className="num grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted">
            Untung hari ini
            <span className="block text-xs">({rincianHariIni})</span>
          </dt>
          <dd className={`text-right font-semibold ${p.untungHariIni < 0 ? "text-bad" : ""}`}>{plus(p.untungHariIni)}</dd>
          <dt className="text-muted">Untung periode ini</dt>
          <dd className={`text-right font-semibold ${p.untungPeriode < 0 ? "text-bad" : ""}`}>{plus(p.untungPeriode)}</dd>
          {racikan.map((m) => (
            <div key={m.id} className="contents">
              <dt className="text-muted">{m.nama} terjual</dt>
              <dd className="text-right">{m.periode.terjual} cup</dd>
            </div>
          ))}
          <dt className="text-muted">Belanja</dt>
          <dd className="text-right">{rupiah(p.belanjaPeriode)}</dd>
          {barang.map((m) => (
            <div key={m.id} className="contents">
              <dt className="text-muted">Stok {m.nama} (sebelum terjual)</dt>
              <dd className="text-right">{m.stokTersedia} pcs</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted">
          Untung dari racikan (resep × harga bahan). Untung & sisa barang jadi dihitung saat tutup buku.
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
