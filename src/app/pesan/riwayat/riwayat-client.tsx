"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lapisan } from "../gerak";
import type { MenuKatalog } from "@/lib/data";
import { bersihkanRiwayatAction } from "../actions";
import { isiKeranjang } from "../keranjang";

const ikonSapu = (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <g transform="rotate(40 12 12)">
      <path d="M12 1.5V7" />
      <rect x="8.5" y="7" width="7" height="3" rx="1" />
      <path d="M9 10l-2 9.5q5 2 10 0L15 10" />
      <path d="M10.6 19.9l.3-3M13.4 19.9l-.3-3" />
    </g>
    <circle cx="4.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="8" cy="5.8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="3.4" cy="11" r="1" fill="currentColor" stroke="none" />
  </svg>
);

/** Isi ulang keranjang dengan pesanan lama; menu yang habis / tidak ada dilewati (diberi tahu di keranjang). */
export function PesanLagi({
  item,
  menu,
}: {
  item: { menuId: number; nama: string; lessSugar: boolean; qty: number }[];
  menu: MenuKatalog[];
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full bg-accent px-4 font-display text-sm font-bold text-accent-fg shadow-pop transition-transform duration-150 active:scale-95"
      onClick={() => {
        const ada = item.filter((i) => menu.some((m) => m.id === i.menuId && !m.habis));
        const lewat = item.filter((i) => !ada.includes(i)).map((i) => i.nama);
        isiKeranjang(ada.map(({ menuId, lessSugar, qty }) => ({ menuId, lessSugar, qty })));
        router.push(lewat.length ? `/pesan/keranjang?dilewati=${encodeURIComponent([...new Set(lewat)].join(", "))}` : "/pesan/keranjang");
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 14-5.3L20 9" />
        <path d="M20 4v5h-5" />
      </svg>
      Pesan lagi
    </button>
  );
}

/** Tombol sapu kecil di label SELESAI + dialog konfirmasi. Hanya daftar di HP ini; database tidak berubah. */
export function BersihkanRiwayat({ jumlah }: { jumlah: number }) {
  const [buka, setBuka] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        aria-label="Bersihkan riwayat selesai"
        onClick={() => setBuka(true)}
        className="-mr-1.5 flex size-11 shrink-0 items-center justify-center text-muted"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-card-raised shadow-pop transition-transform duration-150 active:scale-90">
          {ikonSapu(18)}
        </span>
      </button>
      {buka && (
        <Lapisan
          onTutup={() => setBuka(false)}
          posisi="tengah"
          peran="alertdialog"
          label="Bersihkan riwayat selesai?"
          className="flex max-w-sm flex-col gap-2.5 rounded-[var(--r-lg)] bg-card px-5 pb-5 pt-11 text-center shadow-pop-lg"
        >
          {(tutup) => (
            <>
              <span className="absolute -top-7 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[0_0_0_6px_var(--card)]">
                {ikonSapu(26)}
              </span>
              <h2 className="text-xl font-bold">Bersihkan riwayat selesai?</h2>
              <p className="text-[15px] leading-[22px] text-muted">
                {jumlah} pesanan selesai dihapus dari daftar <strong className="text-fg">di HP ini saja</strong>. Pesanan yang sedang
                berjalan tetap ada.
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost font-display" disabled={pending} onClick={tutup}>
                  Batal
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="btn font-display text-accent-fg"
                  style={{ backgroundColor: "var(--bad)", borderColor: "transparent" }}
                  onClick={() =>
                    startTransition(async () => {
                      await bersihkanRiwayatAction();
                      tutup();
                    })
                  }
                >
                  {pending ? "…" : "Bersihkan"}
                </button>
              </div>
            </>
          )}
        </Lapisan>
      )}
    </>
  );
}
