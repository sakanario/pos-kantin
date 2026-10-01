"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hapusBelanjaAction,
  hapusKasAction,
  hapusPenjualanManualAction,
  tambahPenjualanManualAction,
  tambahKasAction,
  ubahKasAction,
  type FormState,
} from "@/app/actions";
import { FormMessage, RupiahInput, SubmitButton } from "@/components/form";
import { KonfirmasiButton } from "@/components/konfirmasi";

/** Tanggal-tanggal tutup buku, untuk menentukan catatan masuk periode mana. */
export type InfoTutup = { setup: string; tutup: string[] };

export function useResetOnOk(state: FormState, aktif: boolean) {
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
export function TanggalField({
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
          <label className="label">Tanggal ini ada tutup buku. Terjadinya…</label>
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
          Sebelum setup awal ({namaTanggal(info.setup)}), jadi dihitung di periode pertama. Untuk barang jadi: jangan
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

export function HapusDanKembali({ id, jenis }: { id: number; jenis: "belanja" | "kas" }) {
  const router = useRouter();
  return (
    <KonfirmasiButton
      pesan="Hapus catatan ini?"
      ya="Ya, hapus"
      onConfirm={async () => {
        const r = jenis === "belanja" ? await hapusBelanjaAction(id) : await hapusKasAction(id);
        if (r?.error) return r.error;
        router.push(jenis === "belanja" ? "/catat" : "/catat?tab=kas");
      }}
    >
      Hapus catatan
    </KonfirmasiButton>
  );
}

export type MenuManual = { id: number; nama: string; jenis: "racikan" | "barang_jadi" };

export function KopiForm({
  hariIni,
  kemarin,
  info,
  menu,
}: {
  hariIni: string;
  kemarin: string;
  info: InfoTutup;
  menu: MenuManual[];
}) {
  const [state, action] = useActionState(tambahPenjualanManualAction, undefined);
  const [menuId, setMenuId] = useState(menu[0]?.id ?? 0);
  const [jenis, setJenis] = useState<"terjual" | "sendiri">("terjual");
  const ref = useResetOnOk(state, true);
  const dipilih = menu.find((m) => m.id === menuId);
  const jenisEfektif = dipilih?.jenis === "barang_jadi" ? "sendiri" : jenis;
  if (menu.length === 0) return <p className="card text-sm text-muted">Belum ada menu aktif.</p>;
  return (
    <form ref={ref} action={action} className="card space-y-3">
      {/* Hidden input, bukan radio: form.reset() setelah simpan tidak mengubah nilainya */}
      <input type="hidden" name="menu_id" value={menuId} />
      <input type="hidden" name="jenis" value={jenisEfektif} />
      <div className="flex flex-wrap gap-2 text-sm">
        {menu.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={menuId === m.id}
            onClick={() => setMenuId(m.id)}
            className={`rounded-xl border px-3 py-2 ${menuId === m.id ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {m.jenis === "racikan" ? "☕" : "🍫"} {m.nama}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ["terjual", "Terjual"],
            ["sendiri", "🙋 Sendiri"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={jenisEfektif === k}
            disabled={k === "terjual" && dipilih?.jenis === "barang_jadi"}
            onClick={() => setJenis(k)}
            className={`rounded-xl border px-2 py-2 text-center disabled:opacity-40 ${jenisEfektif === k ? "border-accent bg-accent-soft font-medium" : "border-line"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {dipilih?.jenis === "barang_jadi" && (
        <p className="text-xs text-muted">Barang jadi terjual dihitung saat tutup buku; di sini hanya yang dimakan sendiri.</p>
      )}
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
  return (
    <KonfirmasiButton
      ariaLabel="Hapus"
      className="rounded-lg px-2 py-1 text-muted hover:text-bad"
      pesan="Hapus input manual ini?"
      ya="Ya, hapus"
      onConfirm={async () => (await hapusPenjualanManualAction(id))?.error}
    >
      ✕
    </KonfirmasiButton>
  );
}
