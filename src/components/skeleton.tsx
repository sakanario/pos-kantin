/** Kotak abu-abu berkedip pengganti konten yang masih dimuat (dipakai di loading.tsx). */
export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-card/70 ${className}`} />;
}

/** Kartu berisi beberapa baris placeholder. */
export function CardSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <Bone className="h-5 w-1/3" />
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className={`h-4 ${i % 2 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Judul halaman asli + subjudul placeholder, sama tata letaknya dengan PageHeader. */
export function HeaderSkeleton({ title, sub = true, back }: { title: string; sub?: boolean; back?: boolean }) {
  return (
    <header className="px-4 pb-3 pt-6">
      {back && <span className="-ml-1 mb-1 inline-block text-sm font-bold text-accent">‹ Kembali</span>}
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {sub && <Bone className="mt-1 h-4 w-48" />}
    </header>
  );
}
