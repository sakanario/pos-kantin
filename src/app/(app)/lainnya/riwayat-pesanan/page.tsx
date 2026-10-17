import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { bulanSekarang, hariIniWib } from "@/lib/data";
import { bulanWib, hariTanggal, isoTanggalWib, jam, namaBulan, rupiah } from "@/lib/format";
import { getPesananBulan, getPesananPertama, type PesananLengkap } from "@/lib/pesanan";
import { BarisPesanan } from "../../pesanan/baris-pesanan";
import { PilihTanggal } from "./pilih-tanggal";

type Filter = "selesai" | "batal";
const SELESAI = ["siap", "diantar"];

function geserBulan(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const cocok = (p: PesananLengkap, f: Filter | null) =>
  !f || (f === "batal" ? p.status === "batal" : SELESAI.includes(p.status));

/** Menu paling banyak dipesan (pesanan batal tidak dihitung), 3 teratas. */
function terlaris(daftar: PesananLengkap[]) {
  const n = new Map<number, { nama: string; qty: number }>();
  for (const p of daftar)
    for (const i of p.item) {
      const x = n.get(i.menuId) ?? { nama: i.nama, qty: 0 };
      x.qty += i.qty;
      n.set(i.menuId, x);
    }
  return [...n.values()].sort((a, b) => b.qty - a.qty).slice(0, 3);
}

/** Riwayat pesanan online per bulan (menurut waktu bayar), dikelompokkan per hari. `?tgl=` = satu hari saja. */
export default async function RiwayatPesananPage(props: PageProps<"/lainnya/riwayat-pesanan">) {
  const sp = await props.searchParams;
  const sekarang = bulanSekarang();
  const hariIni = hariIniWib();
  const tgl = typeof sp.tgl === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.tgl) && sp.tgl <= hariIni ? sp.tgl : null;
  const bulan = tgl ? tgl.slice(0, 7) : typeof sp.bulan === "string" && /^\d{4}-\d{2}$/.test(sp.bulan) && sp.bulan <= sekarang ? sp.bulan : sekarang;
  const filter: Filter | null = sp.status === "selesai" || sp.status === "batal" ? sp.status : null;

  const [semua, pertama] = await Promise.all([getPesananBulan(bulan), getPesananPertama()]);
  const sah = semua.filter((p) => p.status !== "batal");
  const jumlahBatal = semua.length - sah.length;
  const laris = terlaris(sah);

  const tampil = semua.filter((p) => cocok(p, filter) && (!tgl || isoTanggalWib(p.dibayar!) === tgl));
  const perHari = new Map<string, PesananLengkap[]>();
  for (const p of tampil) {
    const h = isoTanggalWib(p.dibayar!);
    perHari.set(h, [...(perHari.get(h) ?? []), p]);
  }

  const sebelum = geserBulan(bulan, -1);
  const sesudah = geserBulan(bulan, 1);
  const adaSebelum = pertama !== null && sebelum >= bulanWib(pertama);
  const adaSesudah = sesudah <= sekarang;

  const href = (o: { bulan?: string; status?: Filter | null; tgl?: string | null }) => {
    const q = new URLSearchParams();
    const b = o.bulan ?? bulan;
    const t = o.tgl === undefined ? tgl : o.tgl;
    const f = o.status === undefined ? filter : o.status;
    if (t) q.set("tgl", t);
    else if (b !== sekarang) q.set("bulan", b);
    if (f) q.set("status", f);
    const s = q.toString();
    return `/lainnya/riwayat-pesanan${s ? `?${s}` : ""}`;
  };

  const chip = (f: Filter | null, label: string, n: number) => (
    <Link
      href={href({ status: f })}
      className={`rounded-xl border px-1 py-2 text-center ${filter === f ? "border-accent bg-accent-soft" : "border-line"}`}
    >
      <div className="text-xs text-muted">{label}</div>
      <div className="num text-sm font-medium">{n}</div>
    </Link>
  );

  return (
    <main>
      <PageHeader title="Riwayat Pesanan" back="/lainnya" />
      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between">
          {adaSebelum ? (
            <Link href={href({ bulan: sebelum, tgl: null })} className="btn-ghost px-3 py-1.5" aria-label="Bulan sebelumnya">
              ‹
            </Link>
          ) : (
            <span className="w-10" />
          )}
          <span className="font-medium">{namaBulan(bulan)}</span>
          {adaSesudah ? (
            <Link href={href({ bulan: sesudah, tgl: null })} className="btn-ghost px-3 py-1.5" aria-label="Bulan berikutnya">
              ›
            </Link>
          ) : (
            <span className="w-10" />
          )}
        </div>

        <section className="card">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">{sah.length} pesanan bulan ini</span>
            <span className="num font-display text-2xl font-extrabold">{rupiah(sah.reduce((a, p) => a + p.total, 0))}</span>
          </div>
          {laris.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="text-muted">Terlaris: </span>
              {laris.map((l) => `${l.nama} ${l.qty}`).join(" · ")}
            </p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {chip(null, "Semua", semua.length)}
            {chip("selesai", "Selesai", semua.filter((p) => cocok(p, "selesai")).length)}
            {chip("batal", "Batal", jumlahBatal)}
          </div>
          <p className="mt-2 text-xs text-muted">Total tidak menghitung pesanan yang dibatalkan.</p>
        </section>

        <PilihTanggal
          nilai={tgl}
          min={pertama === null ? hariIni : isoTanggalWib(pertama)}
          max={hariIni}
          hrefTanggal={href({ tgl: "TGL" })}
          hrefHapus={href({ tgl: null })}
        />

        {perHari.size === 0 ? (
          <p className="card text-sm text-muted">Tidak ada pesanan{tgl ? " di tanggal ini" : ""}.</p>
        ) : (
          [...perHari].map(([h, daftar]) => {
            const masuk = daftar.filter((p) => p.status !== "batal");
            return (
              <section key={h}>
                <h2 className="mb-2 flex justify-between text-sm font-bold text-muted">
                  <span>{h === hariIni ? "Hari ini" : hariTanggal(h)}</span>
                  <span className="num font-medium">
                    {daftar.length} pesanan · {rupiah(masuk.reduce((a, p) => a + p.total, 0))}
                  </span>
                </h2>
                <ul className="card divide-y divide-line p-0">
                  {daftar.map((p) => (
                    <BarisPesanan key={p.id} p={p} jam={jam(p.dibayar!)} />
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
