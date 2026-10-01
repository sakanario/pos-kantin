"use client";

import { useActionState, useState } from "react";
import {
  hapusBahanAction,
  pakaiKemasanAction,
  tambahBahanAction,
  tandaiBelanjaAction,
  ubahBahanAction,
} from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form";
import { KonfirmasiButton } from "@/components/konfirmasi";
import { TanggalField, type InfoTutup } from "@/app/(app)/catat/forms";
import { desimal } from "@/lib/format";

function SatuanPilih({ awal }: { awal: "gr" | "pcs" }) {
  const [satuan, setSatuan] = useState(awal);
  return (
    <div>
      {/* Hidden input, bukan radio: form.reset() setelah simpan tidak mengubah nilainya */}
      <input type="hidden" name="satuan" value={satuan} />
      <label className="label">Satuan</label>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(["gr", "pcs"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={satuan === s}
            onClick={() => setSatuan(s)}
            className={`rounded-xl border px-2 py-2 ${satuan === s ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {s === "gr" ? "gr (susu, kopi, gula…)" : "pcs (cup, sedotan…)"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BahanForm({ edit }: { edit?: { id: number; nama: string; satuan: "gr" | "pcs"; hargaAwal: number } }) {
  const [state, action] = useActionState(edit ? ubahBahanAction.bind(null, edit.id) : tambahBahanAction, undefined);
  return (
    <form action={action} className="card space-y-3">
      {!edit && <h2 className="font-bold">Bahan baru</h2>}
      <div>
        <label className="label">Nama (peran di resep, bukan merek)</label>
        <input name="nama" required defaultValue={edit?.nama} placeholder="misal: Susu, Kopi, Cup 12oz" className="input" />
      </div>
      <SatuanPilih awal={edit?.satuan ?? "gr"} />
      <div>
        <label className="label">Harga awal per satuan (dipakai sampai ada belanja)</label>
        <input
          name="harga_awal"
          inputMode="decimal"
          required
          defaultValue={edit ? desimal(edit.hargaAwal) : undefined}
          placeholder="misal 20,9"
          className="input num"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton className={edit ? "btn-ghost w-full" : "btn-primary w-full"}>{edit ? "Simpan bahan" : "Buat bahan"}</SubmitButton>
    </form>
  );
}

export function HapusBahanButton({ id }: { id: number }) {
  return (
    <KonfirmasiButton pesan="Hapus bahan ini?" ya="Ya, hapus" onConfirm={async () => (await hapusBahanAction(id))?.error}>
      Hapus bahan
    </KonfirmasiButton>
  );
}

export type BahanTanda = { id: number; nama: string; satuan: "gr" | "pcs"; adaPembelian: boolean };

/** Tandai satu belanja bahan lama: bahan apa, isi per kemasan, dan apakah ini kemasan yang dipakai. */
export function TandaiForm({ belanja, bahan }: { belanja: { id: number; nama: string; total: number }; bahan: BahanTanda[] }) {
  const [state, action] = useActionState(tandaiBelanjaAction.bind(null, belanja.id), undefined);
  const [bahanId, setBahanId] = useState<number | null>(null);
  const b = bahan.find((x) => x.id === bahanId);
  if (state?.ok) return <p className="rounded-2xl border-2 border-good bg-card-raised font-semibold px-3 py-2 text-sm text-good">{state.ok}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bahan_id" value={bahanId ?? ""} />
      <div className="flex flex-wrap gap-1.5 text-xs">
        {bahan.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={bahanId === x.id}
            onClick={() => setBahanId(x.id)}
            className={`rounded-lg border px-2 py-1 ${bahanId === x.id ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {x.nama}
          </button>
        ))}
      </div>
      {b && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Isi / kemasan ({b.satuan})</label>
              <input name="isi_kemasan" inputMode="decimal" required className="input num py-1.5" />
            </div>
            <div>
              <label className="label text-xs">Jumlah kemasan</label>
              <input name="jumlah_kemasan" inputMode="numeric" required defaultValue={1} className="input num py-1.5" />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm" key={b.id}>
            <input type="checkbox" name="aktif" value="1" defaultChecked={!b.adaPembelian} className="mt-1" />
            <span>
              Kemasan ini yang dipakai
              <span className="block text-xs text-muted">Berlaku sejak awal, menggantikan pilihan sebelumnya.</span>
            </span>
          </label>
          <FormMessage state={state} />
          <SubmitButton className="btn-ghost w-full py-1.5 text-sm">Simpan</SubmitButton>
        </>
      )}
    </form>
  );
}

/**
 * "Pakai ini": pilih tanggal mulai pakai kemasan dari belanja ini. Tetap dipasang setelah berhasil
 * (baris berubah jadi aktif) supaya info "habis setelah N cup" masih terlihat.
 */
export function PakaiIniForm({
  belanjaId,
  aktif,
  hariIni,
  info,
}: {
  belanjaId: number;
  aktif: boolean;
  hariIni: string;
  info: InfoTutup;
}) {
  const [buka, setBuka] = useState(false);
  const [state, action] = useActionState(pakaiKemasanAction.bind(null, belanjaId), undefined);
  if (state?.ok) return <p className="w-full rounded-2xl border-2 border-good bg-card-raised font-semibold px-3 py-2 text-sm text-good">{state.ok}</p>;
  if (aktif) return null;
  if (!buka)
    return (
      <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={() => setBuka(true)}>
        Pakai ini
      </button>
    );
  return (
    <form action={action} className="w-full space-y-2 rounded-xl border border-line p-3">
      <p className="text-sm">Mulai dipakai kapan?</p>
      <TanggalField hariIni={hariIni} info={info} awal={hariIni} />
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-ghost py-1.5 text-sm" onClick={() => setBuka(false)}>
          Batal
        </button>
        <SubmitButton className="btn-primary py-1.5 text-sm">Pakai</SubmitButton>
      </div>
    </form>
  );
}
