"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FotoMenu } from "@/components/foto-menu";
import type { MenuKatalog } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { ubahJumlah, useKeranjang, type Baris } from "./keranjang";

const ikonPlus = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ikonMinus = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);

/** Baris keranjang yang masih bisa dipesan (menu ada di katalog & tidak habis), dengan harga sekarang. */
export function barisValid(keranjang: Baris[], menu: MenuKatalog[]) {
  return keranjang.flatMap((b) => {
    const m = menu.find((x) => x.id === b.menuId);
    return m && !m.habis ? [{ ...b, menu: m, lessSugar: m.bisaLessSugar && b.lessSugar }] : [];
  });
}

/** Daftar menu katalog + keranjang. `bisaPesan` false (tutup / pembayaran belum aktif) = lihat saja. */
export function KatalogClient({ menu, bisaPesan, adaPesan }: { menu: MenuKatalog[]; bisaPesan: boolean; adaPesan: boolean }) {
  const keranjang = useKeranjang();
  const [pilihGula, setPilihGula] = useState<MenuKatalog | null>(null);
  const valid = barisValid(keranjang, menu);
  const jumlahItem = valid.reduce((a, b) => a + b.qty, 0);
  const total = valid.reduce((a, b) => a + b.qty * b.menu.harga, 0);
  const bagian = [
    ["KOPI", menu.filter((m) => m.jenis === "racikan")],
    ["CAMILAN", menu.filter((m) => m.jenis === "barang_jadi")],
  ] as const;

  return (
    <>
      {bagian.map(([judul, items]) =>
        items.length === 0 ? null : (
          <section key={judul} className="space-y-3">
            <h2 className="font-display text-xs font-semibold tracking-[.12em] text-muted">{judul}</h2>
            {items.map((m) => (
              <div key={m.id} className="card flex items-center gap-3.5 p-3">
                <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} className={m.habis ? "opacity-45" : ""} />
                <div className="min-w-0 flex-1">
                  <h3 className={`text-[17px] font-semibold leading-[22px] ${m.habis ? "text-muted" : ""}`}>{m.nama}</h3>
                  <p className={`num mt-1 font-display text-[15px] font-semibold text-muted ${m.habis ? "line-through" : ""}`}>
                    {rupiah(m.harga)}
                  </p>
                </div>
                {m.habis ? (
                  <span className="rounded-full bg-bad-soft px-3.5 py-2 font-display text-sm font-bold text-bad">Habis</span>
                ) : adaPesan ? (
                  <TombolTambah m={m} keranjang={keranjang} bisaPesan={bisaPesan} onPilihGula={() => setPilihGula(m)} />
                ) : null}
              </div>
            ))}
          </section>
        ),
      )}

      {bisaPesan && jumlahItem > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <Link
            href="/pesan/keranjang"
            className="flex min-h-[60px] items-center justify-between gap-3 rounded-full bg-accent py-1 pl-[22px] pr-2 text-accent-fg shadow-pop-lg"
          >
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold text-sun">{jumlahItem} item</span>
              <span className="num font-display text-lg font-bold">{rupiah(total)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-fg px-[18px] py-3 font-display font-bold text-accent">
              Lanjut
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        </div>
      )}

      {pilihGula && <PanelGula m={pilihGula} onTutup={() => setPilihGula(null)} />}
    </>
  );
}

function TombolTambah({
  m,
  keranjang,
  bisaPesan,
  onPilihGula,
}: {
  m: MenuKatalog;
  keranjang: Baris[];
  bisaPesan: boolean;
  onPilihGula: () => void;
}) {
  const diKeranjang = keranjang.filter((b) => b.menuId === m.id).reduce((a, b) => a + b.qty, 0);
  const tombolBulat = "relative flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-pop disabled:opacity-30 disabled:shadow-none";

  // Kopi dengan pilihan gula: + membuka panel; badge = jumlah di keranjang (semua pilihan gula)
  if (m.bisaLessSugar || !bisaPesan || diKeranjang === 0) {
    return (
      <button
        type="button"
        disabled={!bisaPesan}
        aria-label={`Tambah ${m.nama}${diKeranjang ? ` (${diKeranjang} di keranjang)` : ""}`}
        onClick={() => (m.bisaLessSugar ? onPilihGula() : ubahJumlah(m.id, false, 1))}
        className={tombolBulat}
      >
        {ikonPlus}
        {bisaPesan && diKeranjang > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-sun px-1.5 font-display text-xs font-bold text-on-sun">
            {diKeranjang}
          </span>
        )}
      </button>
    );
  }
  // Tanpa pilihan: setelah ditambah jadi stepper − n +
  return (
    <div className="flex items-center gap-1 rounded-full bg-accent p-1 shadow-pop">
      <button
        type="button"
        aria-label={`Kurangi ${m.nama}`}
        onClick={() => ubahJumlah(m.id, false, -1)}
        className="flex size-9 items-center justify-center rounded-full text-accent-fg"
      >
        {ikonMinus}
      </button>
      <span className="num min-w-4 text-center font-display font-bold text-accent-fg">{diKeranjang}</span>
      <button
        type="button"
        aria-label={`Tambah ${m.nama}`}
        onClick={() => ubahJumlah(m.id, false, 1)}
        className="flex size-9 items-center justify-center rounded-full bg-accent-fg text-accent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

/** Panel bawah: pilih gula + jumlah, lalu "Tambah · Rp X". */
function PanelGula({ m, onTutup }: { m: MenuKatalog; onTutup: () => void }) {
  const [less, setLess] = useState(false);
  const [qty, setQty] = useState(1);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onTutup]);

  return (
    <div className="fixed inset-0 z-20">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-[rgb(43_16_12/.45)]" onClick={onTutup} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Tambah ${m.nama}`}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-[18px] rounded-t-[28px] bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-3 shadow-pop-lg"
      >
        <span className="h-[5px] w-11 self-center rounded-full bg-outline" />
        <div className="flex items-center gap-3.5">
          <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} size={72} />
          <div>
            <h2 className="text-xl font-bold">{m.nama}</h2>
            <p className="num mt-1 font-display text-[15px] font-semibold text-muted">{rupiah(m.harga)}</p>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 font-display text-xs font-semibold tracking-[.12em] text-muted">GULA</legend>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-card-raised p-1 shadow-[inset_0_0_0_1.5px_var(--outline)]">
            {(
              [
                [false, "Normal"],
                [true, "Less sugar"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={less === v}
                onClick={() => setLess(v)}
                className={`min-h-11 rounded-full font-display text-[15px] font-bold ${less === v ? "bg-accent text-accent-fg" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <Stepper qty={qty} onKurang={() => setQty((q) => Math.max(1, q - 1))} onTambah={() => setQty((q) => Math.min(20, q + 1))} nama={m.nama} />
          <button
            type="button"
            className="btn-primary min-h-[52px] flex-1 font-display"
            onClick={() => {
              ubahJumlah(m.id, less, qty);
              onTutup();
            }}
          >
            Tambah · {rupiah(qty * m.harga)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Stepper pil terang (keranjang & panel gula). */
export function Stepper({ qty, onKurang, onTambah, nama }: { qty: number; onKurang: () => void; onTambah: () => void; nama: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-card-raised p-[3px] shadow-[inset_0_0_0_1.5px_var(--outline)]">
      <button type="button" aria-label={`Kurangi ${nama}`} onClick={onKurang} className="flex size-10 items-center justify-center rounded-full">
        {ikonMinus}
      </button>
      <span className="num min-w-5 text-center font-display text-[17px] font-bold">{qty}</span>
      <button type="button" aria-label={`Tambah ${nama}`} onClick={onTambah} className="flex size-10 items-center justify-center rounded-full">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
