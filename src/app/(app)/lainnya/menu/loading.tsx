import { HeaderSkeleton, ListSkeleton } from "@/components/skeleton";

export default function LoadingMenu() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Menu" sub={false} back />
      <div className="px-4">
        <ListSkeleton rows={4} />
      </div>
    </main>
  );
}
