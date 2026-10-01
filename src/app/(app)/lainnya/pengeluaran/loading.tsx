import { Bone, CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingPengeluaran() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Riwayat Pengeluaran" sub={false} back />
      <div className="space-y-4 px-4">
        <Bone className="h-9 w-full" />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={4} />
      </div>
    </main>
  );
}
