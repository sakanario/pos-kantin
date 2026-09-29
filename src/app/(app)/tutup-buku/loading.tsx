import { CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingTutupBuku() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Tutup Buku" />
      <div className="px-4">
        <CardSkeleton rows={5} />
      </div>
    </main>
  );
}
