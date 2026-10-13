import { Bone, CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

// tinggi batang placeholder (px), meniru grafik mingguan (7 hari)
const RACIKAN = [56, 72, 40, 64, 88, 48, 30];
const BARANG = [44, 44, 32, 32, 60, 52, 52];

export default function LoadingLaporan() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Laporan" sub={false} />
      <div className="space-y-4 px-4">
        <section className="card space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Bone className="h-8 w-20 rounded-xl" />
              <Bone className="h-8 w-16 rounded-xl" />
            </div>
            <div className="flex h-10 items-center justify-center">
              <Bone className="h-4 w-24" />
            </div>
          </div>
          <Grafik judul="Racikan terjual" batang={RACIKAN} />
          <div className="border-t border-line pt-4">
            <Grafik judul="Barang jadi terjual · perkiraan" batang={BARANG} />
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

function Grafik({ judul, batang }: { judul: string; batang: number[] }) {
  return (
    <div>
      <h2 className="mb-2 font-bold">{judul}</h2>
      <div className="flex h-28 items-end gap-1.5 border-b border-line">
        {batang.map((h, i) => (
          <Bone key={i} className="flex-1 rounded-t-md" style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}
