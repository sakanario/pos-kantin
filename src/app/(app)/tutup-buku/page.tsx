import { PageHeader } from "@/components/page-header";
import { getPeriodeBerjalan } from "@/lib/data";
import { rupiah, tanggalJam } from "@/lib/format";
import { TutupBukuWizard } from "./wizard";

export default async function TutupBukuPage() {
  const p = await getPeriodeBerjalan();
  if (!p) return null;
  return (
    <main>
      <PageHeader title="Tutup Buku" sub={`Periode sejak ${tanggalJam(p.terakhir.waktu)}`} />
      <div className="px-4">
        <TutupBukuWizard
          barang={p.menu
            .filter((m) => m.jenis === "barang_jadi" && (m.aktif || m.stokTersedia !== 0 || m.stokAwal !== 0))
            .map((m) => ({ id: m.id, nama: m.nama, maks: m.stokTersedia }))}
          infoSaldoLalu={rupiah(p.terakhir.saldoKantong)}
        />
      </div>
    </main>
  );
}
