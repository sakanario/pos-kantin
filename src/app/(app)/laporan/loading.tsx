import { Bone, CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

// tinggi batang placeholder (px), meniru grafik 14 hari
const BATANG = [40, 64, 52, 80, 36, 72, 88, 48, 60, 76, 44, 68, 56, 84];

export default function LoadingLaporan() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Laporan" sub={false} />
      <div className="space-y-4 px-4">
        <section className="card">
          <h2 className="mb-3 font-bold">Racikan terjual, 14 hari terakhir</h2>
          <div className="flex h-32 items-end gap-1 border-b border-line">
            {BATANG.map((h, i) => (
              <Bone key={i} className="flex-1 rounded-t-md" style={{ height: h }} />
            ))}
          </div>
        </section>
        <div>
          <h2 className="mb-2 text-sm font-bold text-muted">Per bulan · untung jualan</h2>
          <div className="space-y-2">
            <CardSkeleton rows={3} />
            <CardSkeleton rows={2} />
          </div>
        </div>
      </div>
    </main>
  );
}
