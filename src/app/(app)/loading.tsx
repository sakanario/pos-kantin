import { Bone, CardSkeleton } from "@/components/skeleton";

export default function LoadingBeranda() {
  return (
    <main className="space-y-4 px-4 pt-6" aria-busy="true">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Kantin</h1>
        <Bone className="h-4 w-32" />
      </header>
      <div className="card flex flex-col items-center gap-3 py-6">
        <Bone className="h-14 w-20" />
        <Bone className="h-4 w-40" />
        <Bone className="h-24 w-full rounded-xl" />
        <Bone className="h-10 w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-24 rounded-2xl" />
        <Bone className="h-24 rounded-2xl" />
      </div>
      <CardSkeleton rows={3} />
      <CardSkeleton rows={2} />
    </main>
  );
}
