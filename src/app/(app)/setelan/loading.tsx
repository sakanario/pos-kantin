import { CardSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function LoadingSetelan() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Setelan" sub={false} />
      <div className="space-y-4 px-4">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={3} />
      </div>
    </main>
  );
}
