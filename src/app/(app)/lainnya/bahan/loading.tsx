import { CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingBahan() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Bahan" sub={false} back />
      <div className="space-y-4 px-4">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={3} />
      </div>
    </main>
  );
}
