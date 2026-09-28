export const TZ = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function rupiah(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}Rp ${Math.abs(Math.round(n)).toLocaleString("id-ID")}`;
}

export function angka(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

export function tanggal(ms: number): string {
  return new Date(ms).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

export function tanggalJam(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "YYYY-MM-DD" untuk waktu `ms` di zona WIB. */
export function isoTanggalWib(ms: number): string {
  return new Date(ms + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Awal hari (00:00 WIB) dari "YYYY-MM-DD", dalam epoch ms. */
export function awalHariWib(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`) - WIB_OFFSET_MS;
}

/** "YYYY-MM" di zona WIB. */
export function bulanWib(ms: number): string {
  return isoTanggalWib(ms).slice(0, 7);
}

export function namaBulan(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** Parse input nominal: "36.500", "36500", "Rp 36.500" → 36500. */
export function parseRupiah(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
