import { HeaderSkeleton, ListSkeleton } from "@/components/skeleton";

export default function LoadingBahan() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Bahan" sub={false} back />
      <div className="px-4">
        <ListSkeleton rows={4} meter />
      </div>
    </main>
  );
}
