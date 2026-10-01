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
}: {
  barang: { id: number; nama: string; maks: number }[];
  infoSaldoLalu: string;
}) {
  const [input, setInput] = useState<TutupBukuInput | null>(null);
  const [hasil, setHasil] = useState<HasilPeriode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function hitung(fd: FormData) {
    const i: TutupBukuInput = {
      saldo: parseRupiah(fd.get("saldo")),
      sisa: Object.fromEntries(barang.map((b) => [b.id, parseRupiah(fd.get(`sisa_${b.id}`))])),
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

      {error && <p className="rounded-2xl border-2 border-bad bg-bad-soft font-semibold px-3 py-2 text-sm text-bad">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Menghitung…" : "Hitung"}
      </button>
    </form>
  );
}
