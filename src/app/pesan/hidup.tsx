"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ingatPesananAction } from "./actions";
import { selesaiBayar } from "./keranjang";

/** Muat ulang data halaman tiap `ms` (status pesanan diperbarui otomatis, tanpa reload). */
export function Pantau({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ms);
    return () => clearInterval(t);
  }, [ms, router]);
  return null;
}

/** "12:30" mundur dari `sisaMs`; saat habis halaman dimuat ulang (pesanan jadi kedaluwarsa). */
export function SisaWaktu({ sisaMs }: { sisaMs: number }) {
  const router = useRouter();
  const [sisa, setSisa] = useState(sisaMs);
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => {
      const s = sisaMs - (Date.now() - t0);
      setSisa(s);
      if (s <= 0) {
        clearInterval(t);
        setTimeout(() => router.refresh(), 1500);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [sisaMs, router]);
  const d = Math.max(0, Math.ceil(sisa / 1000));
  return (
    <span className="num">
      {Math.floor(d / 60)}:{String(d % 60).padStart(2, "0")}
    </span>
  );
}

/** Halaman struk: ingat pesanan ini di HP (Pesananku) dan kosongkan keranjang bila pesanan ini sudah lunas. */
export function IngatPesanan({ kode, lunas }: { kode: string; lunas: boolean }) {
  useEffect(() => {
    ingatPesananAction(kode);
  }, [kode]);
  useEffect(() => {
    if (lunas) selesaiBayar(kode);
  }, [kode, lunas]);
  return null;
}
