"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { tambahBelanjaAction, tambahKasAction } from "@/app/actions";
import { FormMessage, RupiahInput, SubmitButton } from "@/components/form";

function useResetOnOk(state: { ok?: string } | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function BelanjaForm({ isiDus, hariIni, minTanggal }: { isiDus: number; hariIni: string; minTanggal: string }) {
  const [state, action] = useActionState(tambahBelanjaAction, undefined);
  const [kategori, setKategori] = useState<"bb" | "kopi" | "lain">("bb");
  const [satuan, setSatuan] = useState<"dus" | "pcs">("dus");
  const ref = useResetOnOk(state);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <div className="grid grid-cols-3 gap-2 text-sm">
        {(
          [
            ["bb", "🍫 Beng Beng"],
            ["kopi", "☕ Bahan Kopi"],
            ["lain", "📦 Lain-lain"],
          ] as const
        ).map(([k, l]) => (
          <label
            key={k}
            className={`cursor-pointer rounded-xl border px-2 py-2 text-center ${kategori === k ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            <input
              type="radio"
              name="kategori"
              value={k}
              checked={kategori === k}
              onChange={() => setKategori(k)}
              className="sr-only"
            />
            {l}
          </label>
        ))}
      </div>

      {kategori === "bb" ? (
        <div>
          <label className="label">Jumlah</label>
          <div className="flex gap-2">
            <input name="jumlah" inputMode="numeric" required defaultValue={1} className="input num flex-1" />
            <select
              name="satuan"
              value={satuan}
              onChange={(e) => setSatuan(e.target.value as "dus" | "pcs")}
              className="input w-28"
            >
              <option value="dus">dus ({isiDus})</option>
              <option value="pcs">pcs</option>
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className="label">Nama barang</label>
          <input
            name="nama"
            required
            placeholder={kategori === "kopi" ? "misal: Susu 1L, Cup 16oz 50pcs" : "misal: Plastik, Gas"}
            className="input"
          />
        </div>
      )}

      <div>
        <label className="label">Total harga</label>
        <RupiahInput name="total" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tanggal</label>
          <input type="date" name="tanggal" defaultValue={hariIni} min={minTanggal} max={hariIni} className="input" />
        </div>
        <div>
          <label className="label">Dibayar dari</label>
          <select name="sumber" defaultValue="kantong" className="input">
            <option value="kantong">Kantong Kantin</option>
            <option value="pribadi">Uang pribadi</option>
          </select>
        </div>
      </div>

      <input name="catatan" placeholder="Catatan (opsional)" className="input" />
      <FormMessage state={state} />
      <SubmitButton>Simpan belanja</SubmitButton>
    </form>
  );
}

export function KasForm({ hariIni, minTanggal }: { hariIni: string; minTanggal: string }) {
  const [state, action] = useActionState(tambahKasAction, undefined);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="card space-y-3">
      <div>
        <label className="label">Jenis</label>
        <select name="jenis" className="input">
          <option value="setor">⬇️ Setor Modal (uang pribadi masuk ke kantong)</option>
          <option value="tarik">⬆️ Tarik (ambil uang dari kantong)</option>
        </select>
      </div>
      <div>
        <label className="label">Nominal</label>
        <RupiahInput name="nominal" required />
      </div>
      <div>
        <label className="label">Tanggal</label>
        <input type="date" name="tanggal" defaultValue={hariIni} min={minTanggal} max={hariIni} className="input" />
      </div>
      <input name="catatan" placeholder="Catatan (opsional)" className="input" />
      <FormMessage state={state} />
      <SubmitButton>Simpan</SubmitButton>
      <p className="text-xs text-muted">
        Tidak perlu mencatat transfer pengganti cash (cash → kantong). Itu bagian dari omzet, bukan setor modal.
      </p>
    </form>
  );
}
