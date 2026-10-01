import { Bone, CardSkeleton } from "@/components/skeleton";

export default function LoadingBeranda() {
  return (
    <main className="space-y-4 px-4 pt-6" aria-busy="true">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Kantin</h1>
        <Bone className="h-4 w-32" />
      </header>
      <Bone className="mx-auto h-4 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-52 rounded-2xl" />
        <Bone className="h-52 rounded-2xl" />
        <Bone className="h-32 rounded-2xl" />
        <Bone className="h-32 rounded-2xl" />
      </div>
      <CardSkeleton rows={4} />
      <CardSkeleton rows={2} />
    </main>
  );
}
