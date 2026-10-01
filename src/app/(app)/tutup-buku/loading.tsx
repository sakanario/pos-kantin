import { Bone, FieldSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingTutupBuku() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Tutup Buku" />
      <div className="px-4">
        <div className="card space-y-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <Bone className="h-12 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
