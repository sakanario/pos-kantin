import { PageHeader } from "@/components/page-header";
import { getPeriodeBerjalan } from "@/lib/data";
import { hariTanggal, rupiah, tanggalJam } from "@/lib/format";
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
          // Input saldo gateway hanya bila pesan online sudah dipakai (CR-005).
          // Tahap 3: juga bila sudah ada pesanan lunas.
          infoGatewayLalu={p.terakhir.saldoGateway !== 0 ? rupiah(p.terakhir.saldoGateway) : null}
          hari={p.hariBuka.map((h) => ({ ...h, label: hariTanggal(h.iso) }))}
        />
      </div>
    </main>
  );
}
