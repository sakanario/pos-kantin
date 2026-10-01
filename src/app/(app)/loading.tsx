import { Bone, CardSkeleton } from "@/components/skeleton";

export default function LoadingBeranda() {
  return (
    <main className="space-y-4 px-4 pt-6" aria-busy="true">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Kantin</h1>
        <Bone className="h-4 w-32" />
      </header>
      <div className="space-y-1">
        <Bone className="h-8 w-40" />
        <Bone className="h-4 w-24" />
      </div>
      <Bone className="h-40 rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        <Bone className="h-9 w-40 rounded-full" />
        <Bone className="h-9 w-32 rounded-full" />
      </div>
      <CardSkeleton rows={4} />
      <CardSkeleton rows={2} />
    </main>
  );
}
