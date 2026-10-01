import { Bone, CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingSetelan() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Setelan" sub={false} back />
      <div className="space-y-4 px-4">
        <CardSkeleton rows={2} />
        <div className="card space-y-3">
          <h2 className="font-bold">Tampilan</h2>
          <Bone className="h-3.5 w-1/2" />
          <Bone className="h-12 rounded-[var(--r-ctl)]" />
          <Bone className="h-12 rounded-[var(--r-ctl)]" />
        </div>
        <CardSkeleton title="Laporan" rows={2} />
        <CardSkeleton title="Ganti PIN" rows={2} />
      </div>
    </main>
  );
}
