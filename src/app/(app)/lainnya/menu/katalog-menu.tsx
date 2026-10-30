"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { aturFotoMenuAction, aturKatalogMenuAction, hapusFotoMenuAction, simpanFotoMenuAction, type FormState } from "@/app/actions";
import { FormMessage } from "@/components/form";
import { FotoMenu } from "@/components/foto-menu";
import { Sakelar } from "@/components/sakelar";
import {
  ATUR_BAWAAN,
  bacaAtur,
  FOTO_MAKS_BYTE,
  FOTO_SISI_MAKS,
  gayaFoto,
  geserAtur,
  rapikanAtur,
  ruangGeser,
  urlFoto,
  ZOOM_MAKS,
  type AturFoto,
} from "@/lib/foto";

export type MenuKatalogAwal = {
  id: number;
  jenis: "racikan" | "barang_jadi";
  diKatalog: boolean;
  bisaLessSugar: boolean;
  fotoVersi: number | null;
  fotoAtur: string | null;
};

/** Pengaturan katalog pembeli (/pesan) untuk satu menu; tiap sakelar langsung tersimpan. */
export function KatalogMenu({ m }: { m: MenuKatalogAwal }) {
  return (
    <section className="card space-y-2">
      <h2 className="font-bold">Katalog pembeli</h2>
      <Sakelar
        label="Tampil di katalog"
        sub="Muncul di halaman /pesan yang dibuka pembeli dari QR"
        nilai={m.diKatalog}
        simpan={(v) => aturKatalogMenuAction(m.id, { diKatalog: v })}
      />
      {m.jenis === "racikan" && (
        <Sakelar
          label="Bisa less sugar"
          sub="Pembeli bisa pilih gula Normal / Less sugar saat pesan"
          nilai={m.bisaLessSugar}
          simpan={(v) => aturKatalogMenuAction(m.id, { bisaLessSugar: v })}
        />
      )}
      <FotoInput m={m} />
    </section>
  );
}

function FotoInput({ m }: { m: MenuKatalogAwal }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(undefined);
  // Editor terbuka untuk versi foto ini (langsung setelah unggah, sebelum props ikut diperbarui)
  const [editVersi, setEditVersi] = useState<number | null>(null);
  const atur = bacaAtur(m.fotoAtur);

  const pilih = (file: File) =>
    startTransition(async () => {
      setState(undefined);
      try {
        const blob = await kecilkan(file);
        const fd = new FormData();
        fd.set("foto", blob, "foto");
        const r = await simpanFotoMenuAction(m.id, fd);
        if (r?.fotoVersi) setEditVersi(r.fotoVersi);
        else setState(r);
      } catch {
        setState({ error: "Foto tidak bisa dibaca. Coba foto lain." });
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
      <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} atur={atur} size={72} />
      <div className="min-w-0 flex-1 space-y-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) pilih(f);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} className="btn-ghost min-h-10 px-3 py-1.5 text-sm" onClick={() => ref.current?.click()}>
            {pending ? "Mengunggah…" : m.fotoVersi === null ? "📷 Pasang foto" : "📷 Ganti"}
          </button>
          {m.fotoVersi !== null && (
            <>
              <button
                type="button"
                disabled={pending}
                className="btn-ghost min-h-10 px-3 py-1.5 text-sm"
                onClick={() => {
                  setState(undefined);
                  setEditVersi(m.fotoVersi);
                }}
              >
                ✂️ Atur
              </button>
              <button
                type="button"
                disabled={pending}
                className="btn-danger min-h-10 px-3 py-1.5 text-sm"
                onClick={() =>
                  startTransition(async () => {
                    await hapusFotoMenuAction(m.id);
                    setState({ ok: "Foto dihapus." });
                  })
                }
              >
                Hapus
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-muted">Dari kamera atau galeri. Otomatis dikecilkan; geser &amp; zoom lewat Atur.</p>
      </div>
      {state && (
        <div className="basis-full">
          <FormMessage state={state} />
        </div>
      )}
      {editVersi !== null && (
        <EditorFoto
          key={editVersi}
          m={m}
          fotoVersi={editVersi}
          // Foto baru: mulai dari tengah
          awal={editVersi === m.fotoVersi ? atur : ATUR_BAWAAN}
          onTutup={(pesan) => {
            setEditVersi(null);
            if (pesan) setState(pesan);
          }}
        />
      )}
    </div>
  );
}

/**
 * Atur bingkai thumbnail: seret foto untuk menggeser, slider untuk zoom. Pratinjau memakai gaya yang sama dengan
 * katalog (gayaFoto di lib/foto.ts), jadi yang terlihat di sini = yang dilihat pembeli.
 */
function EditorFoto({
  m,
  fotoVersi,
  awal,
  onTutup,
}: {
  m: MenuKatalogAwal;
  fotoVersi: number;
  awal: AturFoto;
  onTutup: (pesan?: FormState) => void;
}) {
  const SISI = 280;
  const [atur, setAtur] = useState<AturFoto>(awal);
  const [pending, startTransition] = useTransition();
  const seret = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  // Ukuran asli foto (dari <img> setelah dimuat), untuk menghitung ruang geser
  const [ukuran, setUkuran] = useState<{ w: number; h: number } | null>(null);
  const ruang = ruangGeser(ukuran, SISI, atur.z);

  const simpan = () =>
    startTransition(async () => {
      onTutup(await aturFotoMenuAction(m.id, atur));
    });

  // Portal ke <body>: kartu kaca (backdrop-filter) menjadi "containing block" untuk position: fixed,
  // jadi dialog di dalam kartu tidak bisa menutupi layar
  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-[rgb(43_16_12/.55)]" onClick={() => onTutup()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Atur foto"
        className="relative w-full max-w-md space-y-4 rounded-t-[28px] bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5 shadow-pop-lg sm:rounded-[28px]"
      >
        <div>
          <h2 className="text-lg font-bold">Atur foto</h2>
          <p className="text-sm text-muted">{petunjukGeser(ruang)}</p>
        </div>

        <div
          className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-[var(--r-lg)] bg-card-raised active:cursor-grabbing"
          style={{ width: SISI, height: SISI }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seret.current = { px: e.clientX, py: e.clientY, x: atur.x, y: atur.y };
          }}
          onPointerMove={(e) => {
            const s = seret.current;
            if (!s) return;
            // Foto mengikuti jari 1:1 (lihat geserAtur)
            const { x, y } = geserAtur(s, ruang, e.clientX - s.px, e.clientY - s.py);
            setAtur((a) => rapikanAtur({ ...a, x, y }));
          }}
          onPointerUp={() => {
            seret.current = null;
          }}
          onPointerCancel={() => {
            seret.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- foto dari route sendiri */}
          <img
            src={urlFoto(m.id, fotoVersi)}
            alt=""
            draggable={false}
            className="pointer-events-none size-full select-none"
            style={gayaFoto(atur)}
            onLoad={(e) => setUkuran({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
          <span className="pointer-events-none absolute inset-0 rounded-[var(--r-lg)] shadow-[inset_0_0_0_2px_rgb(255_255_255/.6)]" />
        </div>

        <label className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={ZOOM_MAKS}
            step={0.05}
            value={atur.z}
            onChange={(e) => {
              const z = Number(e.target.value);
              setAtur((a) => rapikanAtur({ ...a, z }));
            }}
            className="flex-1 accent-[var(--accent)]"
          />
          <span className="num w-10 text-right text-sm">{atur.z.toFixed(1)}×</span>
        </label>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Pratinjau</span>
          <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={fotoVersi} atur={atur} size={84} />
          <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={fotoVersi} atur={atur} size={40} />
          <button type="button" className="ml-auto text-sm font-bold text-accent" onClick={() => setAtur(ATUR_BAWAAN)}>
            Atur ulang
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={pending} className="btn-ghost" onClick={() => onTutup()}>
            Batal
          </button>
          <button type="button" disabled={pending} className="btn-primary" onClick={simpan}>
            {pending ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function petunjukGeser(r: { x: number; y: number }) {
  const bisaX = r.x > 1;
  const bisaY = r.y > 1;
  if (bisaX && bisaY) return "Seret foto ke mana saja untuk menggeser. Geser slider untuk zoom.";
  if (bisaX) return "Seret ke kiri / kanan untuk menggeser. Zoom dulu supaya bisa digeser ke atas / bawah.";
  if (bisaY) return "Seret ke atas / bawah untuk menggeser. Zoom dulu supaya bisa digeser ke samping.";
  return "Zoom dulu supaya foto bisa digeser.";
}

/** Kecilkan foto di browser: sisi terpanjang 800 px, WebP (JPEG bila browser tidak bisa WebP), ±50 KB. */
async function kecilkan(file: File): Promise<Blob> {
  const img = await createImageBitmap(file, { imageOrientation: "from-image" });
  const skala = Math.min(1, FOTO_SISI_MAKS / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * skala);
  canvas.height = Math.round(img.height * skala);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  const jadi = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  for (const q of [0.8, 0.65, 0.5]) {
    let b = await jadi("image/webp", q);
    if (!b || b.type !== "image/webp") b = await jadi("image/jpeg", q + 0.05);
    if (b && (b.size <= 120 * 1024 || q === 0.5)) {
      if (b.size > FOTO_MAKS_BYTE) throw new Error("terlalu besar");
      return b;
    }
  }
  throw new Error("gagal");
}
