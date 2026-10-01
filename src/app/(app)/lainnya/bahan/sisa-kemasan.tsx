/**
 * Sisa kemasan yang sedang dipakai: progres bar (100% = isi satu kemasan saat dibuka) +
 * "±15 cup lagi (10 dari 25)". Kemasan yang belum dibuka hanya disebut, tidak masuk bar.
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
  return (
    <div className="space-y-1">
      <div
        className="h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={Math.round(persen)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Sisa kemasan"
      >
        <div className={`h-full rounded-full ${menipis ? "bg-bad" : "bg-accent"}`} style={{ width: `${persen}%` }} />
      </div>
      <div className={`num ${menipis ? "text-bad" : ""}`}>
        {k.sisa > 0 ? `${menipis ? "⚠️ " : ""}±${k.sisa} cup lagi` : "⚠️ kemungkinan sudah habis"}
        <span className="text-muted">
          {" "}
          ({k.sudah} dari {k.perkiraan})
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
