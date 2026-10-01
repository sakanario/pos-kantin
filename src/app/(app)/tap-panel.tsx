"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { tapAction } from "@/app/actions";

type Jenis = "terjual" | "sendiri";
type Hitung = Record<Jenis, number>;
export type MenuTap = {
  id: number;
  nama: string;
  jenis: "racikan" | "barang_jadi";
  hargaJual: number;
  hariIni: Hitung;
  periode: Hitung;
};
type State = Record<number, { hariIni: Hitung; periode: Hitung }>;
type Tap = { id: number; jenis: Jenis; delta: 1 | -1 };

/**
 * Tap penjualan: satu baris per racikan dengan tombol +1 besar, lalu deretan tombol "Sendiri" untuk semua
 * menu (termasuk barang jadi). Salah tekan dibatalkan lewat notifikasi "Batalkan"; koreksi yang telat
 * lewat mode Koreksi (tombol berubah jadi −1 untuk satu kali tekan).
 */
export function TapPanel({ menu }: { menu: MenuTap[] }) {
  const [optimistic, apply] = useOptimistic(
    Object.fromEntries(menu.map((m) => [m.id, { hariIni: m.hariIni, periode: m.periode }])) as State,
    (s, { id, jenis, delta }: Tap) => ({
      ...s,
      [id]: {
        hariIni: { ...s[id].hariIni, [jenis]: s[id].hariIni[jenis] + delta },
        periode: { ...s[id].periode, [jenis]: s[id].periode[jenis] + delta },
      },
    }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [koreksi, setKoreksi] = useState(false);
  const [terakhir, setTerakhir] = useState<(Tap & { nama: string; batal?: boolean }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function kirim(t: Tap) {
    startTransition(async () => {
      apply(t);
      const r = await tapAction(t.id, t.jenis, t.delta);
      if (r?.error) setError(r.error);
    });
  }

  function tap(id: number, jenis: Jenis) {
    const delta = koreksi ? -1 : 1;
    if (delta === -1 && optimistic[id].periode[jenis] <= 0) return;
    setError(null);
    if (delta === 1) navigator.vibrate?.(15);
    setKoreksi(false);
    kirim({ id, jenis, delta });
    setTerakhir({ id, jenis, delta, nama: menu.find((m) => m.id === id)?.nama ?? "" });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTerakhir(null), 5000);
  }

  function batalkan() {
    if (!terakhir || terakhir.batal) return;
    kirim({ id: terakhir.id, jenis: terakhir.jenis, delta: terakhir.delta === 1 ? -1 : 1 });
    setTerakhir({ ...terakhir, batal: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTerakhir(null), 2000);
  }

  const racikan = menu.filter((m) => m.jenis === "racikan");
  const terjual = racikan.reduce((a, m) => a + optimistic[m.id].hariIni.terjual, 0);
  const omzet = racikan.reduce((a, m) => a + optimistic[m.id].hariIni.terjual * m.hargaJual, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="num text-3xl font-semibold">{terjual}</span>
          <span className="ml-1.5 text-sm text-muted">terjual hari ini</span>
          <div className="num text-sm text-muted">Rp {omzet.toLocaleString("id-ID")}</div>
        </div>
        <button
          type="button"
          aria-pressed={koreksi}
          onClick={() => setKoreksi((k) => !k)}
          className={`rounded-full border px-3 py-1.5 text-xs ${koreksi ? "border-bad bg-bad text-card" : "border-line text-muted"}`}
        >
          {koreksi ? "Batal koreksi" : "Koreksi −1"}
        </button>
      </div>

      {koreksi && (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">Mode koreksi: tombol berikutnya mengurangi 1.</p>
      )}

      {racikan.length > 0 && (
        <ul className={`card divide-y divide-line p-0 ${koreksi ? "border-bad" : ""}`}>
          {racikan.map((m) => {
            const s = optimistic[m.id];
            const bisa = !koreksi || s.periode.terjual > 0;
            return (
              <li key={m.id} className="flex items-center gap-3 py-2.5 pl-4 pr-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.nama}</div>
                  <div className="num text-sm text-muted">
                    <span className="font-semibold text-fg">{s.hariIni.terjual}</span> terjual
                    {s.hariIni.sendiri !== 0 && ` · 🙋 ${s.hariIni.sendiri}`}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!bisa}
                  onClick={() => tap(m.id, "terjual")}
                  className={`h-14 w-24 shrink-0 text-xl shadow-sm ${koreksi ? "btn border border-bad bg-card text-bad" : "btn-primary"}`}
                >
                  {koreksi ? "−1" : "+1"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <h2 className="mb-1.5 text-xs text-muted">Sendiri (diminum / dimakan, tester, terbuang)</h2>
        <div className="flex flex-wrap gap-2">
          {menu.map((m) => {
            const s = optimistic[m.id];
            const bisa = !koreksi || s.periode.sendiri > 0;
            return (
              <button
                key={m.id}
                type="button"
                disabled={!bisa}
                onClick={() => tap(m.id, "sendiri")}
                className={`flex items-center gap-2 rounded-full border bg-card py-1.5 pl-3 pr-1.5 text-sm disabled:opacity-40 ${koreksi ? "border-bad" : "border-line"}`}
              >
                <span>
                  {m.jenis === "racikan" ? "🙋" : "🍫"} {m.nama}
                </span>
                <span className="num text-muted">{s.hariIni.sendiri}</span>
                <span
                  className={`num rounded-full px-2 py-0.5 text-xs font-semibold ${koreksi ? "bg-bad text-card" : "bg-accent-soft text-accent"}`}
                >
                  {koreksi ? "−1" : "+1"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

      {terakhir && (
        <div className="fixed inset-x-0 bottom-20 z-20 mx-auto max-w-md px-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lg">
            <span className="min-w-0 truncate">
              {terakhir.batal
                ? "Dibatalkan"
                : `${terakhir.delta === 1 ? "+1" : "−1"} ${terakhir.nama}${terakhir.jenis === "sendiri" ? " (sendiri)" : ""}`}
            </span>
            {!terakhir.batal && (
              <button type="button" onClick={batalkan} className="shrink-0 font-semibold text-accent">
                Batalkan
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
