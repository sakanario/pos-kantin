"use client";

import Link from "next/link";
import { useState } from "react";
import { FotoMenu } from "@/components/foto-menu";
import type { MenuKatalog } from "@/lib/data";
import { urlFoto } from "@/lib/foto";
import { rupiah } from "@/lib/format";
import { jeda } from "@/lib/gerak";
import { Lapisan, Segmen } from "./gerak";
import { lessSugarTerakhir, ubahJumlah, useKeranjang, type Baris } from "./keranjang";

const ikonPlus = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ikonPlusKecil = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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
  const [lihatFoto, setLihatFoto] = useState<MenuKatalog | null>(null);
  const valid = barisValid(keranjang, menu);
  const jumlahItem = valid.reduce((a, b) => a + b.qty, 0);
  const total = valid.reduce((a, b) => a + b.qty * b.menu.harga, 0);
  const bagian = [
    ["KOPI", menu.filter((m) => m.jenis === "racikan")],
    ["CAMILAN", menu.filter((m) => m.jenis === "barang_jadi")],
  ] as const;
  // Jeda animasi berurutan lintas bagian: judul bagian + kartu-kartunya
  const urutan: (string | number)[] = bagian.flatMap(([judul, items]) => (items.length ? [judul, ...items.map((m) => m.id)] : []));
  const ke = (k: string | number) => jeda(urutan.indexOf(k));

  return (
    <>
      {bagian.map(([judul, items]) =>
        items.length === 0 ? null : (
          <section key={judul} className="space-y-3">
            <h2 className="animate-masuk font-display text-xs font-semibold tracking-[.12em] text-muted" style={ke(judul)}>
              {judul}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((m) => (
                <div key={m.id} className="card flex animate-masuk items-center gap-3.5 p-3" style={ke(m.id)}>
                  {m.fotoVersi !== null ? (
                    <button
                      type="button"
                      aria-label={`Lihat foto ${m.nama}`}
                      onClick={() => setLihatFoto(m)}
                      className="shrink-0 rounded-[var(--r-md)] transition-transform duration-150 active:scale-95"
                    >
                      <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} atur={m.atur} className={m.habis ? "opacity-45" : ""} />
                    </button>
                  ) : (
                    <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} className={m.habis ? "opacity-45" : ""} />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-[17px] font-semibold leading-[22px] ${m.habis ? "text-muted" : ""}`}>{m.nama}</h3>
                    <p className={`num mt-1 font-display text-[15px] font-semibold text-muted ${m.habis ? "line-through" : ""}`}>
                      {rupiah(m.harga)}
                    </p>
                  </div>
                  {m.habis ? (
                    <span className="animate-muncul rounded-full bg-bad-soft px-3.5 py-2 font-display text-sm font-bold text-bad">Habis</span>
                  ) : adaPesan ? (
                    <TombolTambah m={m} keranjang={keranjang} bisaPesan={bisaPesan} onPilihGula={() => setPilihGula(m)} />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ),
      )}

      {bisaPesan && jumlahItem > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md animate-naik px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <Link
            href="/pesan/keranjang"
            className="flex min-h-[60px] items-center justify-between gap-3 rounded-full bg-accent py-1 pl-[22px] pr-2 text-accent-fg shadow-pop-lg transition-transform duration-150 active:scale-[.98]"
          >
            <span className="flex flex-col">
              <span key={jumlahItem} className="animate-pop text-[13px] font-semibold text-accent-fg/70">
                {jumlahItem} item
              </span>
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
      {lihatFoto && <PratinjauFoto m={lihatFoto} onTutup={() => setLihatFoto(null)} />}
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
  const tombolBulat =
    "relative flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-pop transition-transform duration-150 active:scale-90 disabled:opacity-30 disabled:shadow-none";

  // Kopi dengan pilihan gula: + membuka panel; badge = jumlah di keranjang (semua pilihan gula)
  if (m.bisaLessSugar || !bisaPesan || diKeranjang === 0) {
    return (
      <button
        type="button"
        disabled={!bisaPesan}
        aria-label={`Tambah ${m.nama}${diKeranjang ? ` (${diKeranjang} di keranjang)` : ""}`}
        onClick={() => (m.bisaLessSugar ? onPilihGula() : ubahJumlah(m.id, false, 1))}
        className={`${tombolBulat} animate-muncul`}
      >
        {ikonPlus}
        {bisaPesan && diKeranjang > 0 && (
          <span
            key={diKeranjang}
            className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] animate-pop items-center justify-center rounded-full bg-sun px-1.5 font-display text-xs font-bold text-on-sun"
          >
            {diKeranjang}
          </span>
        )}
      </button>
    );
  }
  // Tanpa pilihan: setelah ditambah jadi stepper − n +
  return (
    <div className="flex animate-muncul items-center gap-1 rounded-full bg-accent p-1 shadow-pop">
      <button
        type="button"
        aria-label={`Kurangi ${m.nama}`}
        onClick={() => ubahJumlah(m.id, false, -1)}
        className="flex size-9 items-center justify-center rounded-full text-accent-fg transition-transform duration-150 active:scale-90"
      >
        {ikonMinus}
      </button>
      <span key={diKeranjang} className="num min-w-4 animate-pop text-center font-display font-bold text-accent-fg">
        {diKeranjang}
      </span>
      <button
        type="button"
        aria-label={`Tambah ${m.nama}`}
        onClick={() => ubahJumlah(m.id, false, 1)}
        className="flex size-9 items-center justify-center rounded-full bg-accent-fg text-accent transition-transform duration-150 active:scale-90"
      >
        {ikonPlusKecil}
      </button>
    </div>
  );
}

/** Panel bawah: pilih gula + jumlah, lalu "Tambah · Rp X". */
function PanelGula({ m, onTutup }: { m: MenuKatalog; onTutup: () => void }) {
  const [less, setLess] = useState(() => lessSugarTerakhir(m.id));
  const [qty, setQty] = useState(1);

  return (
    <Lapisan
      onTutup={onTutup}
      posisi="bawah"
      label={`Tambah ${m.nama}`}
      className="flex max-w-md flex-col gap-[18px] rounded-t-[28px] bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-3 shadow-pop-lg [&>:first-child]:-mb-3"
    >
      {(tutup) => (
        <>
          <div className="flex items-center gap-3.5">
            <FotoMenu id={m.id} jenis={m.jenis} fotoVersi={m.fotoVersi} atur={m.atur} size={72} />
            <div>
              <h2 className="text-xl font-bold">{m.nama}</h2>
              <p className="num mt-1 font-display text-[15px] font-semibold text-muted">{rupiah(m.harga)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-display text-xs font-semibold tracking-[.12em] text-muted">GULA</p>
            <Segmen
              label="Gula"
              nilai={less}
              onPilih={setLess}
              opsi={[
                [false, "Normal"],
                [true, "Less sugar"],
              ]}
            />
          </div>

          <div className="flex items-center gap-3">
            <Stepper qty={qty} onKurang={() => setQty((q) => Math.max(1, q - 1))} onTambah={() => setQty((q) => Math.min(20, q + 1))} nama={m.nama} />
            <button
              type="button"
              className="btn-primary min-h-[52px] flex-1 font-display transition-transform active:scale-[.97]"
              onClick={() => {
                ubahJumlah(m.id, less, qty);
                tutup();
              }}
            >
              Tambah · <span key={qty} className="num inline-block animate-pop">{rupiah(qty * m.harga)}</span>
            </button>
          </div>
        </>
      )}
    </Lapisan>
  );
}

/** Ketuk foto di kartu → foto utuh (tidak dipotong) + nama & harga. */
function PratinjauFoto({ m, onTutup }: { m: MenuKatalog; onTutup: () => void }) {
  return (
    <Lapisan onTutup={onTutup} posisi="tengah" label={`Foto ${m.nama}`} className="max-w-md">
      {(tutup) => (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto dari route sendiri, sudah di-cache */}
          <img
            src={urlFoto(m.id, m.fotoVersi!)}
            alt={m.nama}
            className="max-h-[68dvh] w-auto max-w-full rounded-[var(--r-lg)] bg-card-raised object-contain shadow-pop-lg"
          />
          <div className="flex w-full items-center justify-between gap-3 rounded-[var(--r-lg)] bg-card px-4 py-3 shadow-pop-lg">
            <div className="min-w-0">
              <p className="font-display text-lg font-bold">{m.nama}</p>
              <p className="num font-display text-[15px] font-semibold text-muted">{rupiah(m.harga)}</p>
            </div>
            <button
              type="button"
              aria-label="Tutup foto"
              onClick={tutup}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-transform active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </Lapisan>
  );
}

/** Stepper pil terang (keranjang & panel gula). */
export function Stepper({ qty, onKurang, onTambah, nama }: { qty: number; onKurang: () => void; onTambah: () => void; nama: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-card-raised p-[3px] shadow-[inset_0_0_0_1.5px_var(--outline)]">
      <button
        type="button"
        aria-label={`Kurangi ${nama}`}
        onClick={onKurang}
        className="flex size-10 items-center justify-center rounded-full transition-transform duration-150 active:scale-90"
      >
        {ikonMinus}
      </button>
      <span key={qty} className="num min-w-5 animate-pop text-center font-display text-[17px] font-bold">
        {qty}
      </span>
      <button
        type="button"
        aria-label={`Tambah ${nama}`}
        onClick={onTambah}
        className="flex size-10 items-center justify-center rounded-full transition-transform duration-150 active:scale-90"
      >
        {ikonPlusKecil}
      </button>
    </div>
  );
}
