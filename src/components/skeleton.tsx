/**
 * Placeholder saat halaman dimuat (dipakai di loading.tsx). Warna bone = `fg` transparan, jadi terlihat
 * di latar kuning/navy maupun di dalam kartu krem, dengan kilau bergerak (kelas `skeleton` di globals.css).
 * Teks yang sudah pasti (judul, label) ditulis asli supaya tata letak tidak meloncat saat data datang.
 */
export function Bone({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  // sudut bawaan hanya bila className tidak memberi sendiri (rounded-lg bisa mengalahkan rounded-full)
  const sudut = /\brounded/.test(className) ? "" : "rounded-lg ";
  return <div aria-hidden="true" className={`skeleton ${sudut}${className}`} style={style} />;
}

/** Kartu dengan judul (asli bila diberikan) dan beberapa baris teks placeholder. */
export function CardSkeleton({ rows = 3, title, className = "" }: { rows?: number; title?: string; className?: string }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      {title ? <h2 className="font-bold">{title}</h2> : <Bone className="h-5 w-1/3" />}
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className={`h-4 ${i % 2 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Kartu berisi daftar: nama + keterangan di kiri, nilai di kanan (menu, bahan, riwayat). */
export function ListSkeleton({ rows = 4, meter = false }: { rows?: number; meter?: boolean }) {
  return (
    <div className="card divide-y divide-line py-1">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className={`h-5 ${i % 2 ? "w-1/3" : "w-1/2"}`} />
            <Bone className="h-3.5 w-2/3" />
            {meter && <Bone className="h-6 w-full rounded-[var(--r-ctl)]" />}
          </div>
          <Bone className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Label + kotak input kosong, ukurannya sama dengan `input`. */
export function FieldSkeleton({ label }: { label?: string }) {
  return (
    <div>
      {label ? <span className="label">{label}</span> : <Bone className="mb-2 h-3.5 w-28" />}
      <div className="h-12 rounded-[var(--r-md)] border-[length:var(--stroke-input)] border-outline bg-card-raised p-3">
        <Bone className="h-full w-1/3" />
      </div>
    </div>
  );
}

/** Judul halaman asli + subjudul placeholder, sama tata letaknya dengan PageHeader. */
export function HeaderSkeleton({ title, sub = true, back }: { title: string; sub?: boolean; back?: boolean }) {
  return (
    <header className="px-4 pb-3 pt-6">
      {back && <span className="-ml-1 mb-1 inline-block text-sm font-bold text-accent">‹ Kembali</span>}
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {sub && <Bone className="mt-1.5 h-4 w-48" />}
    </header>
  );
}
