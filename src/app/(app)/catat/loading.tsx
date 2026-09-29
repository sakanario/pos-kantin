import { Bone, CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingCatat() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Catat" />
      <div className="mx-4 mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1">
        <Bone className="h-9" />
        <Bone className="h-9" />
        <Bone className="h-9" />
      </div>
      <div className="space-y-4 px-4">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={3} />
      </div>
    </main>
  );
}
