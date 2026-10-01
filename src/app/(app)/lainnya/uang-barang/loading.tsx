import { CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingUangBarang() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Uang & Barang" back />
      <div className="space-y-4 px-4">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={4} />
        <CardSkeleton rows={2} />
      </div>
    </main>
  );
}
