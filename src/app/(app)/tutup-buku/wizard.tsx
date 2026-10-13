"use client";

import { useState, useTransition } from "react";
import { previewTutupBukuAction, simpanTutupBukuAction, type TutupBukuInput } from "@/app/actions";
import { HasilView } from "@/components/hasil-view";
import { RupiahInput } from "@/components/form";
import type { HasilPeriode } from "@/lib/calc";
import { parseRupiah } from "@/lib/format";

export function TutupBukuWizard({
  barang,
  infoSaldoLalu,
  hari,
}: {
  barang: { id: number; nama: string; maks: number }[];
  infoSaldoLalu: string;
  hari: { iso: string; label: string; bawaan: boolean }[];
}) {
  // Tombol + hidden input, bukan checkbox: form reset React 19 tidak mengubah state ini
  const [buka, setBuka] = useState(() => new Set(hari.filter((h) => h.bawaan).map((h) => h.iso)));
  const tanpaHariBuka = barang.length > 0 && buka.size === 0;
  const [input, setInput] = useState<TutupBukuInput | null>(null);
  const [hasil, setHasil] = useState<HasilPeriode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function hitung(fd: FormData) {
    const i: TutupBukuInput = {
      saldo: parseRupiah(fd.get("saldo")),
      sisa: Object.fromEntries(barang.map((b) => [b.id, parseRupiah(fd.get(`sisa_${b.id}`))])),
      hariBuka: fd.getAll("hari_buka").map(String),
    };
    setError(null);
    startTransition(async () => {
      const r = await previewTutupBukuAction(i);
      if ("error" in r) return setError(r.error);
      setInput(i);
      setHasil(r.hasil);
    });
  }

  function simpan() {
    if (!input) return;
    startTransition(async () => {
      const r = await simpanTutupBukuAction(input);
      if (r?.error) setError(r.error);
    });
  }

  if (hasil && input) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-accent bg-accent-soft px-3 py-2 text-sm">
          👀 Ini baru <b>pratinjau</b>, belum tersimpan. Tekan <b>Simpan &amp; kunci</b> di bawah supaya masuk ke Laporan.
        </p>
        <HasilView h={hasil} />
        {error && <p className="rounded-2xl border-2 border-bad bg-bad-soft font-semibold px-3 py-2 text-sm text-bad">{error}</p>}
        <div className="sticky bottom-20 grid grid-cols-2 gap-3 bg-bg py-2">
          <button className="btn-ghost" disabled={pending} onClick={() => setHasil(null)}>
            ← Ubah isian
          </button>
          <button className="btn-primary" disabled={pending} onClick={simpan}>
            {pending ? "Menyimpan…" : "Simpan & kunci"}
          </button>
        </div>
        <p className="text-center text-xs text-muted">Setelah dikunci, catatan periode ini tidak bisa diubah.</p>
      </div>
    );
  }

  return (
    <form action={hitung} className="space-y-4">
      <section className="card space-y-2">
        <h2 className="font-bold">1. Saldo Kantong Kantin</h2>
        <p className="text-sm text-muted">
          Pastikan cash di kotak sudah ditransfer ke kantong sebelum melihat saldo.
        </p>
        <p className="text-sm text-muted">Buka Jago, lihat saldo Kantong Kantin sekarang. Tutup buku lalu: {infoSaldoLalu}.</p>
        <RupiahInput name="saldo" required defaultValue={input?.saldo} />
      </section>

      {barang.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-bold">2. Sisa stok</h2>
          <p className="text-sm text-muted">Hitung sisa biji tiap barang.</p>
          {barang.map((b) => (
            <div key={b.id}>
              <label className="label">
                🍫 {b.nama} <span className="text-xs">(maks. {b.maks} pcs kalau belum ada yang terjual)</span>
              </label>
              <div className="relative">
                <input
                  name={`sisa_${b.id}`}
                  inputMode="numeric"
                  required
                  defaultValue={input?.sisa[b.id]}
                  className="input num pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">pcs</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {barang.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-bold">3. Hari apa saja kantin buka?</h2>
          <p className="text-sm text-muted">
            Hapus centang hari libur. Barang yang terjual dibagi rata ke hari buka untuk grafik harian di Laporan.
          </p>
          {[...buka].map((iso) => (
            <input key={iso} type="hidden" name="hari_buka" value={iso} />
          ))}
          <div className="grid grid-cols-2 gap-2">
            {hari.map((h) => {
              const on = buka.has(h.iso);
              return (
                <button
                  key={h.iso}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setBuka((s) => {
                      const baru = new Set(s);
                      if (on) baru.delete(h.iso);
                      else baru.add(h.iso);
                      return baru;
                    })
                  }
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm ${on ? "border-accent bg-accent-soft font-medium" : "border-line text-muted"}`}
                >
                  <span aria-hidden className="w-4 text-center">{on ? "☑" : "☐"}</span>
                  {h.label}
                </button>
              );
            })}
          </div>
          {tanpaHariBuka && <p className="text-sm font-semibold text-bad">Centang minimal satu hari kantin buka.</p>}
        </section>
      )}

      {error && <p className="rounded-2xl border-2 border-bad bg-bad-soft font-semibold px-3 py-2 text-sm text-bad">{error}</p>}
      <button type="submit" disabled={pending || tanpaHariBuka} className="btn-primary w-full">
        {pending ? "Menghitung…" : "Hitung"}
      </button>
    </form>
  );
}
