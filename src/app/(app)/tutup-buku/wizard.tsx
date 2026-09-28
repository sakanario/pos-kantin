"use client";

import { useState, useTransition } from "react";
import { previewTutupBukuAction, simpanTutupBukuAction, type TutupBukuInput } from "@/app/actions";
import { HasilView } from "@/components/hasil-view";
import { RupiahInput } from "@/components/form";
import type { HasilPeriode } from "@/lib/calc";
import { parseRupiah } from "@/lib/format";

export function TutupBukuWizard({
  stokBbTersedia,
  infoSaldoLalu,
}: {
  stokBbTersedia: number;
  infoSaldoLalu: string;
}) {
  const [input, setInput] = useState<TutupBukuInput | null>(null);
  const [hasil, setHasil] = useState<HasilPeriode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cashSudahDisetor, setCashSudahDisetor] = useState(false);
  const [pending, startTransition] = useTransition();

  function hitung(fd: FormData) {
    const i: TutupBukuInput = {
      saldo: parseRupiah(fd.get("saldo")),
      sisaBb: parseRupiah(fd.get("sisa_bb")),
      cash: parseRupiah(fd.get("cash")) || 0,
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
        <HasilView h={hasil} />
        {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
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
        <h2 className="font-medium">1. Setor cash dulu</h2>
        <p className="text-sm text-muted">
          Hitung uang cash di kotak, ambil untuk pegangan pribadi, lalu transfer nominal yang sama dari rekening utama ke
          Kantong Kantin.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cashSudahDisetor} onChange={(e) => setCashSudahDisetor(e.target.checked)} />
          Sudah ditransfer ke kantong
        </label>
        {!cashSudahDisetor && (
          <div>
            <label className="label">Belum sempat? Isi jumlah cash yang belum disetor</label>
            <RupiahInput name="cash" defaultValue={input?.cash || undefined} />
          </div>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">2. Saldo Kantong Kantin</h2>
        <p className="text-sm text-muted">Buka Jago, lihat saldo Kantong Kantin sekarang. Tutup buku lalu: {infoSaldoLalu}.</p>
        <RupiahInput name="saldo" required defaultValue={input?.saldo} />
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">3. Sisa Beng Beng</h2>
        <p className="text-sm text-muted">Hitung sisa biji. Maksimal {stokBbTersedia} pcs (kalau belum ada yang terjual).</p>
        <div className="relative">
          <input name="sisa_bb" inputMode="numeric" required defaultValue={input?.sisaBb} className="input num pr-12" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">pcs</span>
        </div>
      </section>

      {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Menghitung…" : "Hitung"}
      </button>
    </form>
  );
}
