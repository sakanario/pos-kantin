import { Bone, FieldSkeleton, HeaderSkeleton } from "@/components/skeleton";

/** Tab asli (tanpa sorotan: tab mana yang dibuka belum diketahui) + form belanja. */
export default function LoadingCatat() {
  return (
    <main aria-busy="true">
      <HeaderSkeleton title="Catat" />
      <div className="mx-4 mb-4 grid grid-cols-3 gap-1 rounded-full border-[3px] border-outline bg-card-raised p-1 text-sm shadow-pop">
        {["Belanja", "Penjualan", "Setor / Tarik"].map((t) => (
          <span key={t} className="py-2 text-center font-bold text-muted">
            {t}
          </span>
        ))}
      </div>
      <div className="px-4">
        <div className="card space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Bone className="h-10 rounded-xl" />
            <Bone className="h-10 rounded-xl" />
            <Bone className="h-10 rounded-xl" />
          </div>
          <FieldSkeleton />
          <div className="grid grid-cols-2 gap-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
          <Bone className="h-12 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
