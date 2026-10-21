import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SaldoCard } from "@/components/saldo-card";
import { getUangBarang } from "@/lib/data";
import { angka, plus, rupiah, tanggalJam } from "@/lib/format";

function Row({ label, value, sub, strong }: { label: React.ReactNode; value: React.ReactNode; sub?: boolean; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1 ${sub ? "pl-6 text-sm text-muted" : ""} ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="num whitespace-nowrap text-right">{value}</span>
    </div>
  );
}

type Bahan = NonNullable<Awaited<ReturnType<typeof getUangBarang>>>["bahan"][number];

function BarisBahan({ b }: { b: Bahan }) {
  const rincian = [
    b.aktif && b.aktif.isi > 0 && `sisa ±${angka(Math.round(b.aktif.sisa))} ${b.satuan}`,
    b.cadangan.length > 0 && `${b.cadangan.length} belum dibuka`,
  ].filter(Boolean);
  return (
    <Row
      label={
        <>
          <Link href={`/lainnya/bahan/${b.bahanId}`}>{b.nama}</Link>
          <span className="block text-sm text-muted">{rincian.join(" + ")}</span>
        </>
      }
      value={rupiah(b.nilai)}
    />
  );
}

/** Uang yang sekarang berbentuk saldo dan barang, per tutup buku terakhir. */
export default async function UangBarangPage() {
  const u = await getUangBarang();
  if (!u) return null;
  const barang = u.barang.map((b) => {
    const omzet = b.sisa * b.hargaJual;
    return { ...b, omzet, untung: omzet - b.modal };
  });
  const adaStok = barang.filter((b) => b.sisa > 0);
  const bergerak = barang.filter((b) => b.dibeliSejak !== 0 || b.sendiriSejak !== 0);
  const bahanResep = u.bahan.filter((b) => b.dipakaiResep);
  const bahanLepas = u.bahan.filter((b) => !b.dipakaiResep);

  return (
    <main>
      <PageHeader
        title="Uang & Barang"
        back="/lainnya"
        sub={`per ${u.dariSetup ? "setup awal" : "tutup buku"} ${tanggalJam(u.waktu)}`}
      />
      <div className="space-y-4 px-4">
        <section className="card">
          <Row label="Saldo Kantong Kantin" value={rupiah(u.saldo)} />
          <Row label="Barang jualan (modal)" value={rupiah(u.totalBarang)} />
          <Row label="Bahan (perkiraan)" value={`±${rupiah(u.totalBahan)}`} />
          <div className="my-1 border-t border-line" />
          <Row label="Total" value={rupiah(u.saldo + u.totalBarang + u.totalBahan)} strong />
        </section>

        <section className="card">
          <h2 className="mb-1 font-bold">📦 Barang</h2>
          {adaStok.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada stok barang.</p>
          ) : (
            adaStok.map((b) => (
              <div key={b.nama}>
                <Row
                  label={
                    <>
                      🍫 {b.nama}{" "}
                      <span className="text-sm text-muted">
                        {b.sisa} pcs × {angka(b.modalPerPcs)}
                      </span>
                    </>
                  }
                  value={rupiah(b.modal)}
                />
                <Row label={`Potensi omzet ${b.sisa} × ${angka(b.hargaJual)}`} value={rupiah(b.omzet)} sub />
                <Row label="Potensi untung" value={plus(b.untung)} sub />
              </div>
            ))
          )}
          {bergerak.length > 0 && (
            <div className="mt-2 border-t border-line pt-2 text-sm text-muted">
              {bergerak.map((b) => (
                <p key={b.nama}>
                  {b.nama} sejak tutup buku:{" "}
                  {[
                    b.dibeliSejak !== 0 && `+${b.dibeliSejak} pcs dibeli`,
                    b.sendiriSejak !== 0 && `${b.sendiriSejak} dimakan sendiri`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ))}
              <p className="text-xs">(yang terjual baru ketahuan saat tutup buku)</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="mb-1 font-bold">☕ Bahan · perkiraan</h2>
          {u.bahan.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada bahan tersisa.</p>
          ) : (
            <>
              {bahanResep.map((b) => (
                <BarisBahan key={b.bahanId} b={b} />
              ))}
              {bahanLepas.length > 0 && (
                <div className="mt-2 border-t border-line pt-2">
                  <h3 className="text-sm font-semibold">⚠️ Tidak ada di resep mana pun</h3>
                  {bahanLepas.map((b) => (
                    <BarisBahan key={b.bahanId} b={b} />
                  ))}
                  <p className="text-xs text-muted">
                    Tetap dihitung di total. Kalau sudah dipakai, masukkan ke resep menunya supaya modal per cup benar.
                  </p>
                </div>
              )}
            </>
          )}
          {u.bahanSejak.jumlah > 0 && (
            <p className="mt-2 border-t border-line pt-2 text-sm text-muted">
              Sejak tutup buku: {u.bahanSejak.jumlah} belanja bahan ({rupiah(u.bahanSejak.total)}), masuk di tutup buku
              berikutnya.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Sisa kemasan yang sedang dipakai (menurut resep) + kemasan yang belum dibuka, dengan harga belinya. Kemasan lama
            dianggap habis begitu kamu ganti ke kemasan baru. Alat dan belanja lain tidak dihitung.
          </p>
        </section>

        <SaldoCard />
      </div>
    </main>
  );
}
