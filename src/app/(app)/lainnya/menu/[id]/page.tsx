import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getDaftarBahan, getDaftarMenu, getSemuaHarga } from "@/lib/data";
import { rupiah, tanggal } from "@/lib/format";
import { MenuForm } from "../menu-form";

/** `/lainnya/menu/baru` untuk menu baru, `/lainnya/menu/[id]` untuk mengubah. */
export default async function MenuPage(props: PageProps<"/lainnya/menu/[id]">) {
  const { id } = await props.params;
  const { baru } = await props.searchParams;
  const [semua, bahan, harga] = await Promise.all([getDaftarMenu(), getDaftarBahan(), getSemuaHarga()]);
  const m = id === "baru" ? undefined : semua.find((x) => x.id === Number(id));
  if (id !== "baru" && !m) notFound();
  const riwayatHarga = m ? harga.filter((h) => h.menuId === m.id).reverse() : [];

  return (
    <main>
      <PageHeader title={m ? m.nama : "Menu baru"} back="/lainnya/menu" sub={m && !m.aktif ? "Nonaktif" : undefined} />
      <div className="space-y-4 px-4">
        {baru && <p className="rounded-2xl border-2 border-good bg-card-raised font-semibold px-3 py-2 text-sm text-good">Menu dibuat.</p>}
        <MenuForm
          key={m?.id ?? "baru"}
          bahan={bahan}
          edit={m}
          urutanBaru={Math.max(0, ...semua.map((x) => x.urutan)) + 1}
        />
        {riwayatHarga.length > 0 && (
          <details className="card">
            <summary className="cursor-pointer text-sm text-muted">Riwayat harga jual</summary>
            <ul className="num mt-2 space-y-1 text-sm">
              {riwayatHarga.map((h, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-muted">{h.berlakuMulai === 0 ? "awal" : tanggal(h.berlakuMulai)}</span>
                  <span>{rupiah(h.nilai)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </main>
  );
}
