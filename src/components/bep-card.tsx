import { getBep } from "@/lib/data";
import { rupiah, tanggal } from "@/lib/format";

/** Balik modal: uang nyata sampai tutup buku terakhir (spec §4.1). */
export async function BepCard() {
  const b = await getBep();
  if (!b) return null;
  const modalSejak = b.belanjaPribadiSejak + b.setorSejak;
  const catatanSejak =
    modalSejak > 0 &&
    `+ ${rupiah(modalSejak)} ${
      b.belanjaPribadiSejak > 0 && b.setorSejak > 0 ? "belanja pribadi & setor" : b.setorSejak > 0 ? "setor" : "belanja pribadi"
    } sejak itu, masuk di tutup buku berikutnya.`;

  if (b.belumTutupBuku) {
    return (
      <section className="card space-y-1">
        <h2 className="font-bold">Balik modal</h2>
        <div className="text-sm text-muted">Modal masuk</div>
        <div className="num font-display text-2xl font-extrabold">{rupiah(b.modalMasuk + modalSejak)}</div>
        <p className="text-xs text-muted">Progres balik modal muncul setelah tutup buku pertama.</p>
      </section>
    );
  }

  const sudah = b.posisi >= 0;
  const persen = b.modalMasuk > 0 ? Math.min(99, Math.max(0, Math.round((b.uangKembali / b.modalMasuk) * 100))) : 0;

  return (
    <section className="card space-y-2">
      <h2 className="font-bold">{sudah ? "🎉 Sudah balik modal" : "Balik modal"}</h2>
      <div>
        <div className="text-sm text-muted">{sudah ? "Untung bersih sejak mulai" : "Sisa modal belum kembali"}</div>
        <div className={`num font-display text-2xl font-extrabold ${sudah ? "text-good" : ""}`}>{rupiah(Math.abs(b.posisi))}</div>
        <p className="num text-xs text-muted">
          {sudah ? "" : `dari total modal ${rupiah(b.modalMasuk)} · `}per tutup buku {tanggal(b.waktu)}
        </p>
      </div>
      {!sudah && (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${persen}%` }} />
          </div>
          <span className="num text-xs text-muted">{persen}%</span>
        </div>
      )}
      {catatanSejak && <p className="text-xs text-muted">{catatanSejak}</p>}
      <p className="text-xs text-muted">Hanya uang nyata. Stok yang masih ada belum dihitung.</p>
    </section>
  );
}
