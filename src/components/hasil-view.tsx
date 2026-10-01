import type { HasilPeriode } from "@/lib/calc";
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

/** Tampilan hasil satu periode tutup buku (spec §5.5). */
export function HasilView({ h }: { h: HasilPeriode }) {
  const selisihTone = h.selisih < 0 ? "bad" : h.selisih > 0 ? "good" : undefined;
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
        <h3 className="mb-1 font-medium">Untung jualan (perkiraan per cup)</h3>
        <Row label="☕ Kopi" value={plus(h.untungKopi)} strong />
        <Row
          label={
            h.kopiTerjual > 0
              ? `${h.kopiTerjual} terjual × (${angka(h.omzetKopiSeharusnya / h.kopiTerjual)} − ${angka(h.hppKopiTerjual / h.kopiTerjual)})`
              : "0 terjual"
          }
          value={h.kopiTerjual !== 0 ? plus(h.omzetKopiSeharusnya - h.hppKopiTerjual) : ""}
          sub
        />
        <Row
          label={h.kopiSendiri > 0 ? `${h.kopiSendiri} diminum sendiri × ${angka(h.nilaiPribadiKopi / h.kopiSendiri)}` : "0 diminum sendiri"}
          value={h.kopiSendiri !== 0 ? rupiah(-h.nilaiPribadiKopi) : ""}
          sub
        />
        <Row label="🍫 Beng Beng" value={plus(h.untungBb)} strong />
        <Row
          label={`${h.bbTerjual} terjual × (${angka(h.hargaJualBb)} − ${angka(h.avgModalBb)})`}
          value={h.bbTerjual !== 0 ? plus(h.omzetBbSeharusnya - h.bbTerjual * h.avgModalBb) : ""}
          sub
        />
        <Row
          label={h.bbSendiri > 0 ? `${h.bbSendiri} dimakan sendiri × ${angka(h.avgModalBb)}` : "0 dimakan sendiri"}
          value={h.bbSendiri !== 0 ? rupiah(-h.nilaiPribadiBb) : ""}
          sub
        />
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
        <p className="mt-2 text-xs text-muted">Pakai HPP worst case dari Setelan. Untung sebenarnya bisa lebih besar.</p>
      </section>

      <section className="card">
        <h3 className="mb-1 font-medium">Uang bersih</h3>
        <Row label="Omzet nyata (dari saldo)" value={rupiah(h.omzetNyata)} />
        <Row label="Belanja" value={rupiah(-h.belanjaTotal)} />
        <Row label="Beng Beng" value={rupiah(h.belanjaBb)} sub />
        <Row label="Bahan kopi" value={rupiah(h.belanjaKopi)} sub />
        <Row label="Lain-lain" value={rupiah(h.belanjaLain)} sub />
        <div className="my-1 border-t border-line" />
        <Row label="Uang bersih" value={plus(h.uangBersih)} strong tone={h.uangBersih < 0 ? "bad" : undefined} />
      </section>

      <section className="card">
        <h3 className="mb-1 font-medium">Omzet: seharusnya vs nyata</h3>
        <Row label={`Beng Beng ${h.bbTerjual} × ${angka(h.hargaJualBb)}`} value={rupiah(h.omzetBbSeharusnya)} />
        <Row label={`Kopi ${h.kopiTerjual} cup`} value={rupiah(h.omzetKopiSeharusnya)} />
        <Row label="Omzet seharusnya" value={rupiah(h.omzetSeharusnya)} strong />
        <Row label="Omzet nyata (dari saldo)" value={rupiah(h.omzetNyata)} strong />
        <div className="my-1 border-t border-line" />
        <Row label="Selisih" value={rupiah(h.selisih)} strong tone={selisihTone} />
      </section>

      <details className="card">
        <summary className="cursor-pointer font-medium">Rincian</summary>
        <div className="mt-2">
          <h4 className="mt-2 text-sm font-medium">Beng Beng</h4>
          <Row label="Stok awal" value={`${h.stokAwalBb} pcs`} sub />
          <Row label="Dibeli" value={`+${h.beliBb} pcs`} sub />
          <Row label="Dimakan sendiri" value={`−${h.bbSendiri} pcs`} sub />
          <Row label="Sisa" value={`−${h.sisaBb} pcs`} sub />
          <Row label="Terjual" value={`${h.bbTerjual} pcs`} sub />
          <Row label="Modal rata-rata" value={rupiah(h.avgModalBb)} sub />
          <Row label="Nilai stok awal → akhir" value={`${rupiah(h.nilaiStokAwal)} → ${rupiah(h.nilaiStokAkhir)}`} sub />

          <h4 className="mt-3 text-sm font-medium">Kopi</h4>
          <Row label="Terjual" value={`${h.kopiTerjual} cup`} sub />
          <Row label="Diminum sendiri" value={`${h.kopiSendiri} cup (${rupiah(h.nilaiPribadiKopi)})`} sub />

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
