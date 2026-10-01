import { Bone, CardSkeleton } from "@/components/skeleton";

/** Meniru Beranda: angka tap hari ini, daftar racikan dengan tombol +1, chip "Sendiri", ringkasan periode. */
export default function LoadingBeranda() {
  return (
    <main className="space-y-4 px-4 pt-6" aria-busy="true">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Kantin</h1>
        <Bone className="h-4 w-28" />
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <Bone className="h-9 w-10" />
              <span className="text-sm text-muted">terjual hari ini</span>
            </div>
            <Bone className="h-4 w-20" />
          </div>
          <Bone className="h-8 w-24 rounded-[var(--r-ctl)]" />
        </div>
        <div className="card divide-y divide-line p-0">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 pl-4 pr-2.5">
              <div className="flex-1 space-y-2">
                <Bone className={`h-5 ${i ? "w-1/2" : "w-2/3"}`} />
                <Bone className="h-3.5 w-1/4" />
              </div>
              <Bone className="h-14 w-24 rounded-[var(--r-ctl)] poster:w-16" />
            </div>
          ))}
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold text-muted">Sendiri (diminum / dimakan, tester, terbuang)</h2>
          <div className="flex flex-wrap gap-2">
            <Bone className="h-10 w-44 rounded-[var(--r-ctl)]" />
            <Bone className="h-10 w-36 rounded-[var(--r-ctl)]" />
            <Bone className="h-10 w-32 rounded-[var(--r-ctl)]" />
          </div>
        </div>
      </section>

      <CardSkeleton title="Periode berjalan" rows={5} />
      <CardSkeleton title="Saldo Kantong Kantin" rows={2} />
    </main>
  );
}
