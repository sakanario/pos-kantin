"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hapusBelanjaAction,
  hapusKasAction,
  hapusPenjualanManualAction,
  tambahPenjualanManualAction,
  tambahBelanjaAction,
  tambahKasAction,
  ubahBelanjaAction,
  ubahKasAction,
  type FormState,
} from "@/app/actions";
import { FormMessage, RupiahInput, SubmitButton } from "@/components/form";

/** Tanggal-tanggal tutup buku, untuk menentukan catatan masuk periode mana. */
export type InfoTutup = { setup: string; tutup: string[] };

function useResetOnOk(state: FormState, aktif: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (aktif && state?.ok) ref.current?.reset();
  }, [state, aktif]);
  return ref;
}

function namaTanggal(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Input tanggal + pilihan sebelum/sesudah tutup buku jika tanggalnya jatuh di hari tutup buku. */
function TanggalField({
  hariIni,
  info,
  awal,
  posisiAwal = "sesudah",
}: {
  hariIni: string;
  info: InfoTutup;
  awal: string;
  posisiAwal?: "sebelum" | "sesudah";
}) {
  const [tanggal, setTanggal] = useState(awal);
  const [posisi, setPosisi] = useState(posisiAwal);
  const ref = useRef<HTMLInputElement>(null);

  // form.reset() (otomatis setelah simpan) mengembalikan input ke default; samakan state-nya
  useEffect(() => {
    const form = ref.current?.form;
    const onReset = () => {
      setTanggal(awal);
      setPosisi(posisiAwal);
    };
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [awal, posisiAwal]);

  const hariTutup = info.tutup.includes(tanggal);
  const tutupTerakhir = info.tutup.at(-1);
  const diPeriodeTutup =
    tutupTerakhir !== undefined && (tanggal < tutupTerakhir || (tanggal === tutupTerakhir && posisi === "sebelum"));

  return (
    <div className="space-y-2">
      <div>
        <label className="label">Tanggal</label>
        <input
          ref={ref}
          type="date"
          name="tanggal"
          defaultValue={awal}
          max={hariIni}
          required
          onChange={(e) => setTanggal(e.target.value)}
          className="input"
        />
      </div>
      {hariTutup && (
        <div>
          <label className="label">Tanggal ini ada tutup buku. Belanjanya terjadi…</label>
          <select
            name="posisi"
            defaultValue={posisiAwal}
            onChange={(e) => setPosisi(e.target.value as "sebelum" | "sesudah")}
            className="input"
          >
            <option value="sebelum">Sebelum tutup buku</option>
            <option value="sesudah">Sesudah tutup buku</option>
          </select>
        </div>
      )}
      {tanggal < info.setup && (
        <p className="text-xs text-muted">
          Sebelum setup awal ({namaTanggal(info.setup)}), jadi dihitung di periode pertama. Untuk Beng Beng: jangan
          dicatat kalau sudah termasuk stok awal waktu setup.
        </p>
      )}
      {diPeriodeTutup && tanggal >= info.setup && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs">
          Tanggal ini ada di periode yang sudah ditutup. Laporan periode itu akan dihitung ulang otomatis.
        </p>
      )}
    </div>
  );
}

export type BelanjaAwal = {
  id: number;
  kategori: "bb" | "kopi" | "lain";
  nama: string;
  qtyPcs: number | null;
  total: number;
  sumber: "kantong" | "pribadi";
  catatan: string | null;
  tanggal: string;
  posisi: "sebelum" | "sesudah";
};

export function BelanjaForm({
  isiDus,
  hariIni,
  info,
  edit,
}: {
  isiDus: number;
  hariIni: string;
  info: InfoTutup;
  edit?: BelanjaAwal;
}) {
  const [state, action] = useActionState(
    edit ? ubahBelanjaAction.bind(null, edit.id) : tambahBelanjaAction,
    undefined,
  );
  const [kategori, setKategori] = useState<"bb" | "kopi" | "lain">(edit?.kategori ?? "bb");
  const ref = useResetOnOk(state, !edit);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      {/* Hidden input, bukan radio: form.reset() setelah simpan tidak mengubah nilainya */}
      <input type="hidden" name="kategori" value={kategori} />
      <div className="grid grid-cols-3 gap-2 text-sm">
        {(
          [
            ["bb", "🍫 Beng Beng"],
            ["kopi", "☕ Bahan Kopi"],
            ["lain", "📦 Lain-lain"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kategori === k}
            onClick={() => setKategori(k)}
            className={`rounded-xl border px-2 py-2 text-center ${kategori === k ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {kategori === "bb" ? (
        <div>
          <label className="label">Jumlah</label>
          <div className="flex gap-2">
            <input
              name="jumlah"
              inputMode="numeric"
              required
              defaultValue={edit?.qtyPcs ?? 1}
              className="input num flex-1"
            />
            <select name="satuan" defaultValue={edit ? "pcs" : "dus"} className="input w-28">
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
            defaultValue={edit && edit.kategori !== "bb" ? edit.nama : undefined}
            placeholder={kategori === "kopi" ? "misal: Susu 1L, Cup 16oz 50pcs" : "misal: Plastik, Gas"}
            className="input"
          />
        </div>
      )}

      <div>
        <label className="label">Total harga</label>
        <RupiahInput name="total" required defaultValue={edit?.total} />
      </div>

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

export type KasAwal = {
  id: number;
  jenis: "setor" | "tarik";
  nominal: number;
  catatan: string | null;
  tanggal: string;
  posisi: "sebelum" | "sesudah";
};

export function KasForm({ hariIni, info, edit }: { hariIni: string; info: InfoTutup; edit?: KasAwal }) {
  const [state, action] = useActionState(edit ? ubahKasAction.bind(null, edit.id) : tambahKasAction, undefined);
  const ref = useResetOnOk(state, !edit);
  return (
    <form ref={ref} action={action} className="card space-y-3">
      <div>
        <label className="label">Jenis</label>
        <select name="jenis" defaultValue={edit?.jenis ?? "setor"} className="input">
          <option value="setor">⬇️ Setor Modal (uang pribadi masuk ke kantong)</option>
          <option value="tarik">⬆️ Tarik (ambil uang dari kantong)</option>
        </select>
      </div>
      <div>
        <label className="label">Nominal</label>
        <RupiahInput name="nominal" required defaultValue={edit?.nominal} />
      </div>
      <TanggalField hariIni={hariIni} info={info} awal={edit?.tanggal ?? hariIni} posisiAwal={edit?.posisi} />
      <input name="catatan" placeholder="Catatan (opsional)" defaultValue={edit?.catatan ?? undefined} className="input" />
      <FormMessage state={state} />
      <SubmitButton>{edit ? "Simpan perubahan" : "Simpan"}</SubmitButton>
      {edit ? (
        <HapusDanKembali id={edit.id} jenis="kas" />
      ) : (
        <p className="text-xs text-muted">
          Tidak perlu mencatat transfer pengganti cash (cash → kantong). Itu bagian dari omzet, bukan setor modal.
        </p>
      )}
    </form>
  );
}

function HapusDanKembali({ id, jenis }: { id: number; jenis: "belanja" | "kas" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost w-full text-bad"
      onClick={async () => {
        if (!confirm("Hapus catatan ini?")) return;
        setPending(true);
        const r = jenis === "belanja" ? await hapusBelanjaAction(id) : await hapusKasAction(id);
        if (r?.error) {
          alert(r.error);
          setPending(false);
          return;
        }
        router.push(jenis === "belanja" ? "/catat" : "/catat?tab=kas");
      }}
    >
      {pending ? "Menghapus…" : "Hapus catatan"}
    </button>
  );
}

const jenisTap = [
  ["kopi", "☕ Kopi terjual"],
  ["kopi_sendiri", "🙋 Kopi sendiri"],
  ["bb_sendiri", "🍫 Beng Beng sendiri"],
] as const;

export function KopiForm({ hariIni, kemarin, info }: { hariIni: string; kemarin: string; info: InfoTutup }) {
  const [state, action] = useActionState(tambahPenjualanManualAction, undefined);
  const [jenis, setJenis] = useState<(typeof jenisTap)[number][0]>("kopi");
  const ref = useResetOnOk(state, true);
  return (
    <form ref={ref} action={action} className="card space-y-3">
      <input type="hidden" name="jenis" value={jenis} />
      <div className="grid grid-cols-3 gap-2 text-sm">
        {jenisTap.map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={jenis === k}
            onClick={() => setJenis(k)}
            className={`rounded-xl border px-2 py-2 text-center ${jenis === k ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div>
        <label className="label">Jumlah (cup / pcs)</label>
        <input name="jumlah" inputMode="numeric" required placeholder="misal 12" className="input num" />
        <p className="mt-1 text-xs text-muted">Ditambahkan ke hitungan tanggal itu (tap + input manual).</p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="kurangi" value="1" />
          Kurangi (koreksi kalau kelebihan)
        </label>
      </div>
      <TanggalField hariIni={hariIni} info={info} awal={kemarin} />
      <FormMessage state={state} />
      <SubmitButton>Simpan</SubmitButton>
      <p className="text-xs text-muted">Untuk hari ini, lebih praktis pakai tombol +1 di Beranda.</p>
    </form>
  );
}

export function HapusManualButton({ id }: { id: number }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      aria-label="Hapus"
      disabled={pending}
      className="rounded-lg px-2 py-1 text-muted hover:text-bad disabled:opacity-40"
      onClick={async () => {
        if (!confirm("Hapus input manual ini?")) return;
        setPending(true);
        const r = await hapusPenjualanManualAction(id);
        if (r?.error) alert(r.error);
        setPending(false);
      }}
    >
      ✕
    </button>
  );
}
