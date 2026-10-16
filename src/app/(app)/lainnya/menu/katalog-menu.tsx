"use client";

import { useRef, useState, useTransition } from "react";
import { aturKatalogMenuAction, hapusFotoMenuAction, simpanFotoMenuAction, type FormState } from "@/app/actions";
import { FormMessage } from "@/components/form";
import { FotoMenu } from "@/components/foto-menu";
import { Sakelar } from "@/components/sakelar";
import { FOTO_MAKS_BYTE, FOTO_SISI_MAKS } from "@/lib/foto";

export type MenuKatalogAwal = {
  id: number;
  jenis: "racikan" | "barang_jadi";
  diKatalog: boolean;
  bisaLessSugar: boolean;
  fotoVersi: number | null;
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

  const pilih = (file: File) =>
    startTransition(async () => {
      setState(undefined);
      try {
        const blob = await kecilkan(file);
        const fd = new FormData();
        fd.set("foto", blob, "foto");
        setState(await simpanFotoMenuAction(m.id, fd));
      } catch {
        setState({ error: "Foto tidak bisa dibaca. Coba foto lain." });
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
      <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} size={72} />
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
            {pending ? "Mengunggah…" : m.fotoVersi === null ? "📷 Pasang foto" : "📷 Ganti foto"}
          </button>
          {m.fotoVersi !== null && (
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
          )}
        </div>
        <p className="text-xs text-muted">Dari kamera atau galeri. Otomatis dikecilkan sebelum diunggah.</p>
      </div>
      {state && (
        <div className="basis-full">
          <FormMessage state={state} />
        </div>
      )}
    </div>
  );
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
