import { Bone, CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingLaporan() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Laporan" sub={false} />
      <div className="space-y-4 px-4">
        <div className="card">
          <Bone className="mb-3 h-5 w-1/2" />
          <Bone className="h-32 w-full" />
        </div>
        <CardSkeleton rows={4} />
      </div>
    </main>
  );
}
