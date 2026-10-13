import Link from "next/link";
import type { SeriGrafik } from "@/lib/data";
import { hariTanggal, namaBulan } from "@/lib/format";

// Grafik harian di Laporan (CR-006): Minggu (Senin–Minggu) atau Bulan, digeser dengan ‹ ›.
// Rentang disimpan di URL: /laporan?grafik=minggu&dari=2026-10-06

export type ModeGrafik = "minggu" | "bulan";

const HARI_MS = 86400000;
const geser = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * HARI_MS).toISOString().slice(0, 10);
const senin = (iso: string) => geser(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
const awalBulan = (iso: string) => `${iso.slice(0, 7)}-01`;
function geserBulan(iso: string, n: number) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}
const awalRentang = (mode: ModeGrafik, iso: string) => (mode === "minggu" ? senin(iso) : awalBulan(iso));

/** Rentang grafik dari parameter URL, dibatasi minggu/bulan setup awal sampai minggu/bulan berjalan. */
export function rentangGrafik(sp: { grafik?: string | string[]; dari?: string | string[] }, hariIni: string, setup: string | null) {
  const mode: ModeGrafik = sp.grafik === "bulan" ? "bulan" : "minggu";
  const paling = awalRentang(mode, hariIni);
  const pertama = awalRentang(mode, setup && setup < hariIni ? setup : hariIni);
  const diminta = typeof sp.dari === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dari) && !Number.isNaN(Date.parse(sp.dari)) ? sp.dari : hariIni;
  let dari = awalRentang(mode, diminta);
  if (dari > paling) dari = paling;
  if (dari < pertama) dari = pertama;
  const sampai = mode === "minggu" ? geser(dari, 6) : geser(geserBulan(dari, 1), -1);
  const sebelum = mode === "minggu" ? geser(dari, -7) : geserBulan(dari, -1);
  const sesudah = mode === "minggu" ? geser(dari, 7) : geserBulan(dari, 1);
  // Pindah Minggu ↔ Bulan: bulan dari hari terakhir yang sudah lewat; minggu berjalan atau minggu pertama bulan itu
  const keBulan = awalBulan(sampai < hariIni ? sampai : hariIni);
  const keMinggu = dari === awalBulan(hariIni) ? senin(hariIni) : senin(dari);
  return {
    mode,
    dari,
    sampai,
    sebelum: sebelum >= pertama ? sebelum : null,
    sesudah: sesudah <= paling ? sesudah : null,
    href: (m: ModeGrafik, d: string) => (m === "minggu" && d === senin(hariIni) ? "/laporan" : `/laporan?grafik=${m}&dari=${d}`),
    keBulan,
    keMinggu: keMinggu < senin(setup ?? hariIni) ? senin(setup ?? hariIni) : keMinggu,
  };
}

type Rentang = ReturnType<typeof rentangGrafik>;

function labelRentang(r: Rentang) {
  if (r.mode === "bulan") return namaBulan(r.dari.slice(0, 7));
  // hariTanggal: "Sen, 6 Okt"
  const [, tglAwal, blnAwal] = hariTanggal(r.dari).split(/,? /);
  const akhir = hariTanggal(r.sampai).split(", ")[1];
  return r.dari.slice(5, 7) === r.sampai.slice(5, 7) ? `${tglAwal} – ${akhir}` : `${tglAwal} ${blnAwal} – ${akhir}`;
}

export function NavGrafik({ r }: { r: Rentang }) {
  const pilihan = (m: ModeGrafik, label: string, d: string) => (
    <Link
      href={r.href(m, d)}
      scroll={false}
      aria-current={r.mode === m ? "true" : undefined}
      className={`rounded-xl border px-3 py-1.5 text-sm ${r.mode === m ? "border-accent bg-accent-soft font-medium" : "border-line text-muted"}`}
    >
      {label}
    </Link>
  );
  const panah = (d: string | null, label: string, aria: string) =>
    d ? (
      <Link href={r.href(r.mode, d)} scroll={false} aria-label={aria} className="btn-ghost min-h-10 px-3 py-1">
        {label}
      </Link>
    ) : (
      <span className="w-11" />
    );
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {pilihan("minggu", "Minggu", r.keMinggu)}
        {pilihan("bulan", "Bulan", r.keBulan)}
      </div>
      <div className="flex items-center justify-between">
        {panah(r.sebelum, "‹", r.mode === "minggu" ? "Minggu sebelumnya" : "Bulan sebelumnya")}
        <span className="num font-medium">{labelRentang(r)}</span>
        {panah(r.sesudah, "›", r.mode === "minggu" ? "Minggu berikutnya" : "Bulan berikutnya")}
      </div>
    </div>
  );
}

const HURUF_HARI = ["S", "S", "R", "K", "J", "S", "M"]; // Senin–Minggu
const LABEL_BULAN = new Set([1, 5, 10, 15, 20, 25, 30]);
const TINGGI = 96; // px, batang tertinggi

export const warnaGrafik = (i: number) => `var(--grafik-${(i % 6) + 1})`;

/** Batang bertumpuk per menu (urut menu.urutan, menu pertama paling bawah), angka di atas = total hari itu. */
export function GrafikBatang({
  judul,
  seri,
  satuan,
  mode,
  catatan,
}: {
  judul: string;
  seri: SeriGrafik;
  satuan: string;
  mode: ModeGrafik;
  catatan?: string;
}) {
  const total = seri.hari.map((h) => (h.perMenu ? Object.values(h.perMenu).reduce((a, n) => a + n, 0) : null));
  const max = Math.max(1, ...total.map((t) => t ?? 0));
  const bulan = mode === "bulan";
  return (
    <div>
      <h2 className="mb-2 font-bold">{judul}</h2>
      <div className={`flex items-end ${bulan ? "gap-px" : "gap-1.5"}`} style={{ height: TINGGI + 16 }}>
        {seri.hari.map((h, i) => {
          const t = total[i];
          const rincian = h.perMenu
            ? [`${hariTanggal(h.tgl)}: ${t} ${satuan}`, ...seri.menu.filter((m) => h.perMenu![m.id]).map((m) => `${m.nama} ${h.perMenu![m.id]}`)].join("\n")
            : undefined;
          return (
            <div key={h.tgl} title={rincian} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
              {!!t && <span className={`num leading-none text-muted ${bulan ? "text-[8px]" : "text-[10px]"}`}>{t}</span>}
              {!!t && (
                <div
                  className={`flex w-full flex-col-reverse overflow-hidden ${bulan ? "rounded-t-sm" : "rounded-t"}`}
                  style={{ height: Math.max(2, (t / max) * TINGGI) }}
                >
                  {seri.menu.map((m) =>
                    h.perMenu![m.id] ? (
                      <div key={m.id} style={{ flex: `${h.perMenu![m.id]} 1 0`, background: warnaGrafik(m.warna) }} />
                    ) : null,
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={`mt-1 flex border-t border-line pt-1 ${bulan ? "gap-px" : "gap-1.5"}`}>
        {seri.hari.map((h, i) => {
          const tgl = Number(h.tgl.slice(8));
          return (
            <span key={h.tgl} className="num min-w-0 flex-1 text-center text-[10px] leading-tight text-muted">
              {bulan ? (
                LABEL_BULAN.has(tgl) ? <span className="block overflow-visible whitespace-nowrap">{tgl}</span> : null
              ) : (
                <>
                  <span className="block font-semibold">{HURUF_HARI[i]}</span>
                  <span className="block">{tgl}</span>
                </>
              )}
            </span>
          );
        })}
      </div>
      {seri.menu.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {seri.menu.map((m) => (
            <li key={m.id} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-3 rounded-sm" style={{ background: warnaGrafik(m.warna) }} />
              {m.nama}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">Belum ada yang terjual.</p>
      )}
      {catatan && <p className="mt-1 text-xs text-muted">{catatan}</p>}
    </div>
  );
}
