import { getInputManualTerakhir, getMenu, getRingkasanHarian } from "@/lib/data";
import { awalHariWib, isoTanggalWib, tanggal } from "@/lib/format";
import { HapusManualButton, KopiForm, type InfoTutup, type MenuManual } from "./forms";

function hariPendek(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

export async function KopiTab({ hariIni, info, menu }: { hariIni: string; info: InfoTutup; menu: MenuManual[] }) {
  const [harian, manual, semuaMenu] = await Promise.all([getRingkasanHarian(14), getInputManualTerakhir(20), getMenu()]);
  const kemarin = isoTanggalWib(awalHariWib(hariIni) - 1);
  const namaMenu = (id: number) => semuaMenu.find((m) => m.id === id)?.nama ?? "?";

  return (
    <>
      <KopiForm hariIni={hariIni} kemarin={kemarin} info={info} menu={menu} />

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">14 hari terakhir (tap + manual, semua menu)</h2>
        <div className="card p-0">
          <table className="num w-full text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 text-left font-normal">Tanggal</th>
                <th className="px-2 py-2 text-right font-normal">☕ Terjual</th>
                <th className="px-4 py-2 text-right font-normal">🙋 Sendiri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {harian.map((d) => (
                <tr key={d.tgl} className={d.terjual === 0 && d.tgl !== hariIni ? "text-muted" : ""}>
                  <td className="px-4 py-2">
                    {d.tgl === hariIni ? "Hari ini" : hariPendek(d.tgl)}
                    {d.manual && <span className="ml-1 text-xs text-muted">✎</span>}
                  </td>
                  <td className="px-2 py-2 text-right font-medium">{d.terjual || "–"}</td>
                  <td className="px-4 py-2 text-right">{d.sendiri || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-muted">✎ = ada input manual. Hari dengan &quot;–&quot; berarti belum ada catatan.</p>
      </section>

      {manual.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Input manual terakhir</h2>
          <ul className="card divide-y divide-line p-0">
            {manual.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {namaMenu(m.menuId)} · {m.jenis === "terjual" ? "terjual" : "🙋 sendiri"}
                  </div>
                  <div className="text-xs text-muted">{tanggal(m.waktu)}</div>
                </div>
                <div className={`num text-right text-sm font-medium ${m.delta < 0 ? "text-bad" : ""}`}>
                  {m.delta > 0 ? "+" : "−"}
                  {Math.abs(m.delta)}
                </div>
                <HapusManualButton id={m.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
