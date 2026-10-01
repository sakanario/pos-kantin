import { Bone, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingLainnya() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Lainnya" sub={false} />
      <div className="space-y-2 px-4">
        <Bone className="h-16 rounded-2xl" />
        <Bone className="h-16 rounded-2xl" />
        <Bone className="h-16 rounded-2xl" />
      </div>
    </main>
  );
}
