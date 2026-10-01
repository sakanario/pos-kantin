import { PageHeader } from "@/components/page-header";
import { SaldoCard } from "@/components/saldo-card";
import { getUangBarang } from "@/lib/data";
import { angka, plus, rupiah, tanggalJam } from "@/lib/format";

function Row({ label, value, sub, strong }: { label: React.ReactNode; value: React.ReactNode; sub?: boolean; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1 ${sub ? "pl-6 text-sm text-muted" : ""} ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="num text-right">{value}</span>
    </div>
  );
}

/** Uang yang sekarang berbentuk saldo dan barang, per tutup buku terakhir. */
export default async function UangBarangPage() {
  const u = await getUangBarang();
  if (!u) return null;
  const barang = u.barang.map((b) => {
    const modal = Math.round(b.sisa * b.modalPerPcs);
    const omzet = b.sisa * b.hargaJual;
    return { ...b, modal, omzet, untung: omzet - modal };
  });
  const adaStok = barang.filter((b) => b.sisa > 0);
  const totalModal = barang.reduce((a, b) => a + b.modal, 0);
  const bergerak = barang.filter((b) => b.dibeliSejak !== 0 || b.sendiriSejak !== 0);

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
          <Row label="Barang (modal)" value={rupiah(totalModal)} />
          <div className="my-1 border-t border-line" />
          <Row label="Total" value={rupiah(u.saldo + totalModal)} strong />
        </section>

        <section className="card">
          <h2 className="mb-1 font-medium">📦 Barang</h2>
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
          <p className="mt-2 text-xs text-muted">Bahan kopi, alat, dan barang yang tidak dijual tidak dihitung.</p>
        </section>

        <SaldoCard />
      </div>
    </main>
  );
}
