import Link from "next/link";
import { getSaldoTerakhir } from "@/lib/data";
import { rupiah, tanggal, tanggalJam, tanggalPendek } from "@/lib/format";

/** Saldo Kantong Kantin terakhir yang tercatat + setor/tarik sesudahnya (tidak dijumlahkan). */
export async function SaldoCard() {
  const s = await getSaldoTerakhir();
  if (!s) return null;

  return (
    <section className="card space-y-2">
      <h2 className="font-bold">Saldo Kantong Kantin</h2>
      <div>
        <div className="num font-display text-2xl font-extrabold">{rupiah(s.saldo)}</div>
        <p className="text-xs text-muted">
          {s.dariSetup ? `tercatat saat setup awal ${tanggal(s.waktu)}` : `tercatat saat tutup buku ${tanggalJam(s.waktu)}`}
        </p>
      </div>
      {s.kasSejak.length > 0 && (
        <div className="border-t border-line pt-2">
          <p className="text-sm text-muted">Sejak itu:</p>
          <ul className="divide-y divide-line">
            {s.kasSejak.map((k) => (
              <li key={k.id}>
                <Link href={`/catat/kas/${k.id}`} className="flex items-center gap-3 py-2 text-sm">
                  <span className="flex-1">{k.jenis === "setor" ? "⬇️ Setor" : "⬆️ Tarik"}</span>
                  <span className="text-muted">{tanggalPendek(k.waktu)}</span>
                  <span className={`num w-28 text-right ${k.jenis === "setor" ? "text-good" : "text-bad"}`}>
                    {k.jenis === "setor" ? "+" : "−"}
                    {rupiah(k.nominal)}
                  </span>
                  <span className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">(belum termasuk uang jualan; dicek di tutup buku berikutnya)</p>
        </div>
      )}
    </section>
  );
}
