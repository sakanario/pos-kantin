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
          stokBbTersedia={p.stokBbTersedia}
          infoSaldoLalu={rupiah(p.terakhir.saldoKantong)}
        />
      </div>
    </main>
  );
}
