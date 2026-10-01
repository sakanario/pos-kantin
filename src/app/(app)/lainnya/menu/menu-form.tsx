"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aturAktifMenuAction, simpanMenuAction } from "@/app/actions";
import { FormMessage, RupiahInput } from "@/components/form";
import { KonfirmasiButton } from "@/components/konfirmasi";
import { angka, desimal, parseDesimal, parseRupiah, rupiah } from "@/lib/format";

export type BahanResep = { id: number; nama: string; satuan: "gr" | "pcs"; hargaSekarang: number };
export type MenuAwal = {
  id: number;
  nama: string;
  jenis: "racikan" | "barang_jadi";
  aktif: boolean;
  urutan: number;
  hargaJual: number;
  modal: number;
  resep: { bahanId: number; takaran: number }[];
};

type Baris = { key: number; bahanId: number | ""; takaran: string };

/**
 * Form menu. Dikirim lewat onSubmit (bukan `<form action>`) supaya isian resep yang dikontrol
 * tidak ikut di-reset React setelah simpan.
 */
export function MenuForm({ bahan, edit, urutanBaru }: { bahan: BahanResep[]; edit?: MenuAwal; urutanBaru: number }) {
  const [state, action, pending] = useActionState(simpanMenuAction.bind(null, edit?.id ?? null), undefined);
  const [, startTransition] = useTransition();
  const [jenis, setJenis] = useState<MenuAwal["jenis"]>(edit?.jenis ?? "racikan");
  const [hargaJual, setHargaJual] = useState(edit?.hargaJual ?? 0);
  const [baris, setBaris] = useState<Baris[]>(
    edit?.resep.length ? edit.resep.map((r, i) => ({ key: i, bahanId: r.bahanId, takaran: desimal(r.takaran) })) : [{ key: 0, bahanId: "", takaran: "" }],
  );

  const biaya = (r: Baris) => {
    const b = bahan.find((x) => x.id === r.bahanId);
    const t = parseDesimal(r.takaran);
    return b && Number.isFinite(t) ? t * b.hargaSekarang : 0;
  };
  const hpp = baris.reduce((a, r) => a + biaya(r), 0);
  const untung = hargaJual - hpp;
  const ubah = (key: number, patch: Partial<Baris>) => setBaris((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div>
        <label className="label">Nama</label>
        <input name="nama" required defaultValue={edit?.nama} placeholder="misal: Kopi Susu Gula Aren" className="input" />
      </div>

      {edit ? (
        <p className="text-sm text-muted">Jenis: {edit.jenis === "racikan" ? "☕ Racikan" : "🍫 Barang jadi"}</p>
      ) : (
        <div>
          <input type="hidden" name="jenis" value={jenis} />
          <label className="label">Jenis</label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(
              [
                ["racikan", "☕ Racikan", "dibuat dari resep, tap terjual"],
                ["barang_jadi", "🍫 Barang jadi", "dibeli jadi, stok dihitung"],
              ] as const
            ).map(([k, l, sub]) => (
              <button
                key={k}
                type="button"
                aria-pressed={jenis === k}
                onClick={() => setJenis(k)}
                className={`rounded-xl border px-2 py-2 text-left ${jenis === k ? "border-accent bg-accent-soft" : "border-line"}`}
              >
                <span className="block font-medium">{l}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-2">
        <div onChange={(e) => setHargaJual(parseRupiah((e.target as HTMLInputElement).value) || 0)}>
          <label className="label">Harga jual</label>
          <RupiahInput name="harga_jual" required defaultValue={edit?.hargaJual} />
        </div>
        <div>
          <label className="label">Urutan</label>
          <input name="urutan" inputMode="numeric" defaultValue={edit?.urutan ?? urutanBaru} className="input num" />
        </div>
      </div>

      {jenis === "racikan" && (
        <div className="space-y-2">
          <label className="label">Resep (per cup)</label>
          {bahan.length === 0 && <p className="text-sm text-muted">Belum ada bahan. Buat dulu di Lainnya → Bahan.</p>}
          {baris.map((r) => {
            const b = bahan.find((x) => x.id === r.bahanId);
            return (
              <div key={r.key} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2">
                <select
                  name="bahan_id"
                  value={r.bahanId}
                  onChange={(e) => ubah(r.key, { bahanId: e.target.value ? Number(e.target.value) : "" })}
                  className="input py-2"
                >
                  <option value="">– bahan –</option>
                  {bahan.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nama}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <input
                    name="takaran"
                    inputMode="decimal"
                    value={r.takaran}
                    onChange={(e) => ubah(r.key, { takaran: e.target.value })}
                    className="input num py-2 pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">{b?.satuan ?? ""}</span>
                </div>
                <button
                  type="button"
                  aria-label="Hapus bahan"
                  onClick={() => setBaris((xs) => xs.filter((x) => x.key !== r.key))}
                  className="px-1 text-muted"
                >
                  ✕
                </button>
                {b && <span className="num col-span-3 -mt-1 text-right text-xs text-muted">{rupiah(biaya(r))}</span>}
              </div>
            );
          })}
          <button
            type="button"
            className="btn-ghost w-full py-1.5 text-sm"
            onClick={() => setBaris((xs) => [...xs, { key: Math.max(0, ...xs.map((x) => x.key)) + 1, bahanId: "", takaran: "" }])}
          >
            + bahan
          </button>
          <div className="num flex justify-between border-t border-line pt-2 text-sm font-medium">
            <span>HPP {rupiah(hpp)}</span>
            <span className={untung < 0 ? "text-bad" : ""}>
              untung {rupiah(untung)}/cup{hargaJual > 0 ? ` (${angka((untung / hargaJual) * 100)}%)` : ""}
            </span>
          </div>
          <p className="text-xs text-muted">
            Pakai harga bahan yang sedang dipakai. Ubah resep berlaku mulai sekarang (resep pertama berlaku untuk semua catatan
            lama).
          </p>
        </div>
      )}
      {jenis === "barang_jadi" && edit && (
        <p className="num text-sm text-muted">
          Modal rata-rata {rupiah(edit.modal)}/pcs · untung {rupiah(hargaJual - edit.modal)}/pcs
        </p>
      )}

      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
      {edit && <AktifButton id={edit.id} aktif={edit.aktif} />}
    </form>
  );
}

function AktifButton({ id, aktif }: { id: number; aktif: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ubah = async () => {
    await aturAktifMenuAction(id, !aktif);
    router.refresh();
  };
  if (aktif) {
    return (
      <KonfirmasiButton
        pesan="Nonaktifkan menu ini? Hilang dari Beranda & form; riwayat tetap ada di laporan."
        ya="Ya, nonaktifkan"
        onConfirm={ubah}
      >
        Nonaktifkan
      </KonfirmasiButton>
    );
  }
  return (
    <button type="button" disabled={pending} className="btn-ghost w-full" onClick={() => startTransition(ubah)}>
      {pending ? "Menyimpan…" : "Aktifkan lagi"}
    </button>
  );
}
