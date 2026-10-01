"use client";

import Link from "next/link";
import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { tambahBelanjaAction, ubahBelanjaAction } from "@/app/actions";
import { FormMessage, RupiahInput, SubmitButton } from "@/components/form";
import { angka, desimal, parseDesimal, parseRupiah, perSatuan, rupiah } from "@/lib/format";
import { HapusDanKembali, TanggalField, useResetOnOk, type InfoTutup } from "./forms";

export type BahanPilihan = {
  id: number;
  nama: string;
  satuan: "gr" | "pcs";
  hargaSekarang: number;
  adaPembelian: boolean;
  terakhir: { nama: string; isiKemasan: number | null } | null;
  dipakaiDi: { id: number; nama: string; takaran: number; hpp: number }[];
};
export type BarangPilihan = { id: number; nama: string; isiKemasan: number | null; namaTerakhir: string | null };

export type BelanjaAwal = {
  id: number;
  kategori: "bahan" | "barang" | "lain";
  nama: string;
  bahanId: number | null;
  menuId: number | null;
  isiKemasan: number | null;
  jumlahKemasan: number | null;
  total: number;
  sumber: "kantong" | "pribadi";
  catatan: string | null;
  tanggal: string;
  posisi: "sebelum" | "sesudah";
};

const KATEGORI = [
  ["bahan", "🧂 Bahan"],
  ["barang", "🍫 Barang jadi"],
  ["lain", "📦 Lain-lain"],
] as const;

function Pilihan<T extends { id: number; nama: string }>({
  items,
  value,
  onChange,
}: {
  items: T[];
  value: number | null;
  onChange: (x: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {items.map((x) => (
        <button
          key={x.id}
          type="button"
          aria-pressed={value === x.id}
          onClick={() => onChange(x)}
          className={`rounded-xl border px-3 py-1.5 ${value === x.id ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
        >
          {x.nama}
        </button>
      ))}
    </div>
  );
}

export function BelanjaForm({
  hariIni,
  info,
  bahan,
  barang,
  edit,
}: {
  hariIni: string;
  info: InfoTutup;
  bahan: BahanPilihan[];
  barang: BarangPilihan[];
  edit?: BelanjaAwal;
}) {
  const [state, action] = useActionState(edit ? ubahBelanjaAction.bind(null, edit.id) : tambahBelanjaAction, undefined);
  const [kategori, setKategori] = useState<BelanjaAwal["kategori"]>(edit?.kategori ?? "bahan");
  const [bahanId, setBahanId] = useState<number | null>(edit?.bahanId ?? null);
  const [menuId, setMenuId] = useState<number | null>(edit?.menuId ?? (barang.length === 1 ? barang[0].id : null));
  // Isian yang terisi otomatis dari belanja terakhir: dikontrol supaya bisa diganti saat memilih bahan/barang
  const [nama, setNama] = useState(edit?.nama ?? "");
  const [isi, setIsi] = useState(edit?.isiKemasan != null ? desimal(edit.isiKemasan) : "");
  const [jumlah, setJumlah] = useState(String(edit?.jumlahKemasan ?? 1));
  const [total, setTotal] = useState(edit?.total ?? 0);
  const [pakai, setPakai] = useState(false);
  const ref = useResetOnOk(state, !edit);

  const b = bahan.find((x) => x.id === bahanId);
  const brg = barang.find((x) => x.id === menuId);

  function pilihBahan(x: BahanPilihan) {
    setBahanId(x.id);
    if (edit) return;
    setNama(x.terakhir?.nama ?? "");
    setIsi(x.terakhir?.isiKemasan != null ? desimal(x.terakhir.isiKemasan) : "");
  }
  function pilihBarang(x: BarangPilihan) {
    setMenuId(x.id);
    if (edit) return;
    setIsi(x.isiKemasan != null ? String(x.isiKemasan) : "");
  }

  // form.reset() setelah simpan: isi ulang otomatis dari belanja terakhir. Pilihan terbaru disimpan di
  // ref lewat layout effect, supaya reset (dari effect biasa) sudah memakai data belanja yang baru disimpan.
  const pilihan = useRef({ kategori, b, brg });
  useLayoutEffect(() => {
    pilihan.current = { kategori, b, brg };
  });
  useEffect(() => {
    const form = ref.current;
    const onReset = () => {
      const { kategori, b, brg } = pilihan.current;
      setJumlah("1");
      setTotal(0);
      setPakai(false);
      if (kategori === "bahan" && b) {
        setNama(b.terakhir?.nama ?? "");
        setIsi(b.terakhir?.isiKemasan != null ? desimal(b.terakhir.isiKemasan) : "");
      } else if (kategori === "barang" && brg) {
        setNama("");
        setIsi(brg.isiKemasan != null ? String(brg.isiKemasan) : "");
      } else setNama("");
    };
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [ref]);

  const isiAngka = parseDesimal(isi);
  const jumlahAngka = Number(jumlah);
  const totalIsi = isiAngka * jumlahAngka;
  const hargaBaru = total > 0 && totalIsi > 0 ? total / totalIsi : null;
  const akanDipakai = !edit && b && (!b.adaPembelian || pakai);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      {/* Hidden input, bukan radio: form.reset() setelah simpan tidak mengubah nilainya */}
      <input type="hidden" name="kategori" value={kategori} />
      <div className="grid grid-cols-3 gap-2 text-sm">
        {KATEGORI.map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kategori === k}
            onClick={() => {
              setKategori(k);
              if (!edit) setNama("");
            }}
            className={`rounded-xl border px-2 py-2 text-center ${kategori === k ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {kategori === "bahan" && (
        <>
          <input type="hidden" name="bahan_id" value={bahanId ?? ""} />
          <div>
            <label className="label">Bahan</label>
            {bahan.length === 0 ? (
              <p className="text-sm text-muted">
                Belum ada bahan. Buat dulu di{" "}
                <Link href="/lainnya/bahan" className="text-accent underline">
                  Lainnya → Bahan
                </Link>
                .
              </p>
            ) : (
              <Pilihan items={bahan} value={bahanId} onChange={pilihBahan} />
            )}
          </div>
          <div>
            <label className="label">Nama barang</label>
            <input
              name="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="misal: Susu Ultra 1L"
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Isi / kemasan ({b?.satuan ?? "gr"})</label>
              <input
                name="isi_kemasan"
                inputMode="decimal"
                required
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                className="input num"
              />
            </div>
            <div>
              <label className="label">Jumlah kemasan</label>
              <input
                name="jumlah_kemasan"
                inputMode="numeric"
                required
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="input num"
              />
            </div>
          </div>
        </>
      )}

      {kategori === "barang" && (
        <>
          <input type="hidden" name="menu_id" value={menuId ?? ""} />
          <div>
            <label className="label">Barang</label>
            {barang.length === 0 ? (
              <p className="text-sm text-muted">Belum ada menu barang jadi. Buat dulu di Lainnya → Menu.</p>
            ) : (
              <Pilihan items={barang} value={menuId} onChange={pilihBarang} />
            )}
          </div>
          <div>
            <label className="label">Jumlah</label>
            <div className="flex items-center gap-2">
              <input
                name="jumlah_kemasan"
                inputMode="numeric"
                required
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="input num w-20"
              />
              <span className="text-sm text-muted">dus × isi</span>
              <input
                name="isi_kemasan"
                inputMode="numeric"
                required
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                className="input num w-20"
              />
              <span className="num text-sm text-muted">= {Number.isFinite(totalIsi) ? angka(totalIsi) : "–"} pcs</span>
            </div>
            <p className="mt-1 text-xs text-muted">Beli satuan: isi 1 per &quot;dus&quot;.</p>
          </div>
        </>
      )}

      {kategori === "lain" && (
        <div>
          <label className="label">Nama barang</label>
          <input
            name="nama"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="misal: Plastik, Gas, alat"
            className="input"
          />
        </div>
      )}

      <div onChange={(e) => setTotal(parseRupiah((e.target as HTMLInputElement).value) || 0)}>
        <label className="label">Total harga</label>
        <RupiahInput name="total" required defaultValue={edit?.total} />
      </div>

      {kategori === "bahan" && b && hargaBaru !== null && (
        <div className="rounded-lg bg-accent-soft px-3 py-2 text-xs">
          ℹ {perSatuan(hargaBaru, b.satuan)}
          {b.dipakaiDi.map((m) => (
            <span key={m.id} className="block">
              {m.nama}: {b.nama} {desimal(m.takaran)} {b.satuan} = {rupiah(m.takaran * hargaBaru)} per cup
              {akanDipakai && ` · HPP ${angka(m.hpp)} → ${angka(m.hpp - m.takaran * b.hargaSekarang + m.takaran * hargaBaru)}`}
            </span>
          ))}
        </div>
      )}
      {kategori === "barang" && hargaBaru !== null && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs">ℹ {rupiah(hargaBaru)}/pcs</p>
      )}

      {kategori === "bahan" && b && !edit && (
        b.adaPembelian ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="pakai_sekarang" value="1" checked={pakai} onChange={(e) => setPakai(e.target.checked)} className="mt-1" />
            <span>
              Langsung dipakai sekarang
              <span className="block text-xs text-muted">Kosongkan kalau stok lama masih ada. Nanti ganti lewat Lainnya → Bahan.</span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-muted">Pembelian pertama {b.nama}: langsung jadi harga yang dipakai.</p>
        )
      )}

      <div>
        <label className="label">Dibayar dari</label>
        <select name="sumber" defaultValue={edit?.sumber ?? "kantong"} className="input">
          <option value="kantong">Kantong Kantin</option>
          <option value="pribadi">Uang pribadi</option>
        </select>
      </div>

      <TanggalField hariIni={hariIni} info={info} awal={edit?.tanggal ?? hariIni} posisiAwal={edit?.posisi} />

      <input name="catatan" placeholder="Catatan (opsional)" defaultValue={edit?.catatan ?? undefined} className="input" />
      <FormMessage state={state} />
      <SubmitButton>{edit ? "Simpan perubahan" : "Simpan belanja"}</SubmitButton>
      {edit && <HapusDanKembali id={edit.id} jenis="belanja" />}
    </form>
  );
}
