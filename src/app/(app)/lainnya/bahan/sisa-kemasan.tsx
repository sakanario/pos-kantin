const SEGMEN = 10;

/**
 * Sisa kemasan yang sedang dipakai: progres bar 10 segmen (100% = isi satu kemasan saat dibuka) +
 * "±15 cup lagi dari 25". Kemasan yang belum dibuka hanya disebut, tidak masuk bar.
 */
export function SisaKemasan({
  k,
  cadangan,
}: {
  k: { perkiraan: number; sudah: number; sisa: number };
  cadangan: string[];
}) {
  const menipis = k.sisa <= Math.max(2, Math.ceil(k.perkiraan * 0.2));
  const persen = Math.min(100, Math.max(0, (k.sisa / k.perkiraan) * 100));
  // dibulatkan ke atas: kemasan yang masih ada isinya tidak tampak kosong
  const terisi = Math.ceil((persen / 100) * SEGMEN);
  return (
    <div className="space-y-1">
      <div
        className={`meter ${menipis ? "is-low" : ""}`}
        role="progressbar"
        aria-valuenow={Math.round(persen)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Sisa kemasan"
      >
        {Array.from({ length: SEGMEN }, (_, i) => (
          // warna & bentuk segmen per gaya: .meter di globals.css
          <span key={i} className={i < terisi ? "on" : undefined} />
        ))}
      </div>
      <div className={`num ${menipis ? "text-bad" : ""}`}>
        {k.sisa > 0 ? `${menipis ? "⚠️ " : ""}±${k.sisa} cup lagi` : "⚠️ kemungkinan sudah habis"}
        <span className="text-muted">
          {k.sisa > 0 ? ` dari ${k.perkiraan}` : ` (sudah ${k.sudah} dari perkiraan ${k.perkiraan})`}
        </span>
      </div>
      {cadangan.length > 0 && (
        <div className="text-muted">
          +{cadangan.length} kemasan belum dibuka ({cadangan.join(", ")})
        </div>
      )}
    </div>
  );
}
