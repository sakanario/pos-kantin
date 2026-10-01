import type { HasilMenu, HasilPeriode } from "@/lib/calc";
import { angka, plus, rupiah } from "@/lib/format";

function Row({
  label,
  value,
  sub,
  strong,
  tone,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: boolean;
  strong?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div className={`flex justify-between gap-3 py-1 ${sub ? "pl-4 text-sm text-muted" : ""} ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={`num text-right ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</span>
    </div>
  );
}

const icon = (m: HasilMenu) => (m.jenis === "racikan" ? "☕" : "🍫");

/** Rincian untung satu menu: terjual × (jual − modal), lalu dikonsumsi sendiri × modal. */
function UntungMenu({ m }: { m: HasilMenu }) {
  const satuan = m.jenis === "racikan" ? "cup" : "pcs";
  const jual = m.terjual !== 0 ? m.omzetSeharusnya / m.terjual : (m.hargaJual ?? 0);
  const modal = m.terjual !== 0 ? m.modalTerjual / m.terjual : m.sendiri !== 0 ? m.nilaiSendiri / m.sendiri : 0;
  return (
    <>
      <Row label={`${icon(m)} ${m.nama}`} value={plus(m.untung)} strong />
      <Row
        label={m.terjual !== 0 ? `${m.terjual} terjual × (${angka(jual)} − ${angka(modal)})` : `0 ${satuan} terjual`}
        value={m.terjual !== 0 ? plus(m.omzetSeharusnya - m.modalTerjual) : ""}
        sub
      />
      {m.sendiri !== 0 && (
        <Row
          label={`${m.sendiri} ${m.jenis === "racikan" ? "diminum" : "dimakan"} sendiri × ${angka(m.nilaiSendiri / m.sendiri)}`}
          value={rupiah(-m.nilaiSendiri)}
          sub
        />
      )}
    </>
  );
}

/** Tampilan hasil satu periode tutup buku (spec §5.5). */
export function HasilView({ h }: { h: HasilPeriode }) {
  const selisihTone = h.selisih < 0 ? "bad" : h.selisih > 0 ? "good" : undefined;
  const barang = h.menu.filter((m) => m.jenis === "barang_jadi");
  return (
    <div className="space-y-3">
      {h.peringatan.map((p) => (
        <p key={p} className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
          ⚠️ {p}
        </p>
      ))}

      <section className="card text-center">
        <div className="text-sm text-muted">Untung jualan periode ini</div>
        <div className={`num text-4xl font-semibold ${h.untungJualan < 0 ? "text-bad" : ""}`}>{plus(h.untungJualan)}</div>
        <div className="num mt-1 text-sm text-muted">Uang bersih {plus(h.uangBersih)}</div>
        <div className={`mt-1 text-sm ${selisihTone === "bad" ? "text-bad" : "text-muted"}`}>
          {h.selisih === 0
            ? "✅ Uang masuk sesuai hitungan"
            : h.selisih < 0
              ? `⚠️ Uang kurang ${rupiah(-h.selisih)} dari seharusnya`
              : `Uang lebih ${rupiah(h.selisih)} dari seharusnya`}
        </div>
      </section>

      <section className="card">
        <h3 className="mb-1 font-medium">Untung jualan (perkiraan per item)</h3>
        {h.menu.length === 0 && <p className="text-sm text-muted">Belum ada menu.</p>}
        {h.menu.map((m) => (
          <UntungMenu key={m.id} m={m} />
        ))}
        <div className="my-1 border-t border-line" />
        <Row label="Untung jualan" value={plus(h.untungJualan)} strong tone={h.untungJualan < 0 ? "bad" : undefined} />
        {h.belanjaLain > 0 && (
          <Row
            label={
              <>
                📦 Belanja lain-lain
                <span className="block text-xs text-muted">masuk balik modal, bukan untung jualan</span>
              </>
            }
            value={rupiah(-h.belanjaLain)}
          />
        )}
        <p className="mt-2 text-xs text-muted">
          Modal racikan dari resep × harga bahan yang sedang dipakai (takaran worst case). Untung sebenarnya bisa lebih
          besar.
        </p>
      </section>

      <section className="card">
        <h3 className="mb-1 font-medium">Uang bersih</h3>
        <Row label="Omzet nyata (dari saldo)" value={rupiah(h.omzetNyata)} />
        <Row label="Belanja" value={rupiah(-h.belanjaTotal)} />
        <Row label="Bahan" value={rupiah(h.belanjaBahan)} sub />
        <Row label="Barang jadi" value={rupiah(h.belanjaBarang)} sub />
        <Row label="Lain-lain" value={rupiah(h.belanjaLain)} sub />
        <div className="my-1 border-t border-line" />
        <Row label="Uang bersih" value={plus(h.uangBersih)} strong tone={h.uangBersih < 0 ? "bad" : undefined} />
      </section>

      <section className="card">
        <h3 className="mb-1 font-medium">Omzet: seharusnya vs nyata</h3>
        {h.menu.map((m) => (
          <Row
            key={m.id}
            label={m.jenis === "barang_jadi" ? `${m.nama} ${m.terjual} × ${angka(m.hargaJual ?? 0)}` : `${m.nama} ${m.terjual} cup`}
            value={rupiah(m.omzetSeharusnya)}
          />
        ))}
        <Row label="Omzet seharusnya" value={rupiah(h.omzetSeharusnya)} strong />
        <Row label="Omzet nyata (dari saldo)" value={rupiah(h.omzetNyata)} strong />
        <div className="my-1 border-t border-line" />
        <Row label="Selisih" value={rupiah(h.selisih)} strong tone={selisihTone} />
      </section>

      <details className="card">
        <summary className="cursor-pointer font-medium">Rincian</summary>
        <div className="mt-2">
          {barang.map((m) => (
            <div key={m.id}>
              <h4 className="mt-2 text-sm font-medium">🍫 {m.nama}</h4>
              <Row label="Stok awal" value={`${m.stokAwal} pcs`} sub />
              <Row label="Dibeli" value={`+${m.beli} pcs`} sub />
              <Row label="Dimakan sendiri" value={`−${m.sendiri} pcs`} sub />
              <Row label="Sisa" value={`−${m.sisa} pcs`} sub />
              <Row label="Terjual" value={`${m.terjual} pcs`} sub />
              <Row label="Modal rata-rata" value={rupiah(m.avgModal ?? 0)} sub />
              <Row label="Nilai stok awal → akhir" value={`${rupiah(m.nilaiStokAwal ?? 0)} → ${rupiah(m.nilaiStokAkhir ?? 0)}`} sub />
            </div>
          ))}

          {h.menu
            .filter((m) => m.jenis === "racikan")
            .map((m) => (
              <div key={m.id}>
                <h4 className="mt-3 text-sm font-medium">☕ {m.nama}</h4>
                <Row label="Terjual" value={`${m.terjual} cup`} sub />
                <Row label="Diminum sendiri" value={`${m.sendiri} cup (${rupiah(m.nilaiSendiri)})`} sub />
              </div>
            ))}

          <h4 className="mt-3 text-sm font-medium">Uang</h4>
          <Row label="Saldo kantong awal → akhir" value={`${rupiah(h.saldoAwal)} → ${rupiah(h.saldoAkhir)}`} sub />
          {(h.cashAwal > 0 || h.cashAkhir > 0) && (
            <Row label="Cash belum disetor awal → akhir" value={`${rupiah(h.cashAwal)} → ${rupiah(h.cashAkhir)}`} sub />
          )}
          <Row label="Setor modal" value={rupiah(h.setorModal)} sub />
          <Row label="Tarik" value={rupiah(h.tarik)} sub />
          <Row label="Belanja dari kantong" value={rupiah(h.belanjaKantong)} sub />
          <Row label="Belanja dari uang pribadi" value={rupiah(h.belanjaPribadi)} sub />
        </div>
      </details>
    </div>
  );
}
