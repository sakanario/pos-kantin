"use client";

import { useSyncExternalStore } from "react";

// Keranjang pembeli disimpan di localStorage HP (tanpa akun). Juga: nama terakhir & kode pesanan yang
// dibuat dari keranjang ini (keranjang dikosongkan saat pesanan itu lunas).

export type Baris = { menuId: number; lessSugar: boolean; qty: number };

const KUNCI = "kantin.keranjang";
const KUNCI_NAMA = "kantin.nama";
const KUNCI_UNTUK = "kantin.keranjang-untuk";
const KUNCI_PILIHAN = "kantin.pilihan";
const KOSONG: Baris[] = [];

let cache: Baris[] | null = null;
const pendengar = new Set<() => void>();

function baca(): Baris[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI) ?? "[]");
    cache = Array.isArray(v) ? v.filter((x) => x && Number.isFinite(x.menuId) && x.qty > 0) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function tulis(b: Baris[]) {
  cache = b;
  try {
    localStorage.setItem(KUNCI, JSON.stringify(b));
  } catch {}
  pendengar.forEach((f) => f());
}

function subscribe(f: () => void) {
  pendengar.add(f);
  const dariTabLain = (e: StorageEvent) => {
    if (e.key === KUNCI) {
      cache = null;
      f();
    }
  };
  window.addEventListener("storage", dariTabLain);
  return () => {
    pendengar.delete(f);
    window.removeEventListener("storage", dariTabLain);
  };
}

export function useKeranjang(): Baris[] {
  return useSyncExternalStore(subscribe, baca, () => KOSONG);
}

/** Tambah / kurangi jumlah satu baris (menu + pilihan gula). */
export function ubahJumlah(menuId: number, lessSugar: boolean, delta: number) {
  const b = baca();
  const i = b.findIndex((x) => x.menuId === menuId && x.lessSugar === lessSugar);
  const qty = Math.max(0, Math.min(20, (i >= 0 ? b[i].qty : 0) + delta));
  const baru = i >= 0 ? b.map((x, j) => (j === i ? { ...x, qty } : x)) : [...b, { menuId, lessSugar, qty }];
  tulis(baru.filter((x) => x.qty > 0));
}

/** Ganti isi keranjang ("Pesan lagi" dari riwayat). */
export function isiKeranjang(b: Baris[]) {
  tulis(b.filter((x) => x.qty > 0));
}

export function kosongkan() {
  tulis([]);
}

export function bacaNama(): string {
  try {
    return localStorage.getItem(KUNCI_NAMA) ?? "";
  } catch {
    return "";
  }
}

export function simpanNama(nama: string) {
  try {
    localStorage.setItem(KUNCI_NAMA, nama);
  } catch {}
}

// Pilihan dari pesanan terakhir HP ini, jadi bawaan pesanan berikutnya: cara ambil + gula per menu.
// Catatan sengaja tidak diingat (posisi meja / baju beda tiap hari).
export type Cara = "pickup" | "delivery";
type Pilihan = { cara?: Cara; gula?: Record<string, boolean> };

function bacaPilihan(): Pilihan {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI_PILIHAN) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function caraTerakhir(): Cara {
  return bacaPilihan().cara === "delivery" ? "delivery" : "pickup";
}

export function lessSugarTerakhir(menuId: number): boolean {
  return bacaPilihan().gula?.[menuId] === true;
}

/** Dipanggil saat pesanan dibuat. Menu yang dipesan normal & less sugar sekaligus: baris terakhir yang menang. */
export function simpanPilihan(cara: Cara, item: { menuId: number; lessSugar: boolean }[]) {
  const p = bacaPilihan();
  const gula = { ...p.gula };
  for (const i of item) gula[i.menuId] = i.lessSugar;
  try {
    localStorage.setItem(KUNCI_PILIHAN, JSON.stringify({ cara, gula }));
  } catch {}
}

export function tandaiKeranjangUntuk(kode: string) {
  try {
    localStorage.setItem(KUNCI_UNTUK, kode);
  } catch {}
}

/** Pesanan `kode` sudah lunas: kosongkan keranjang bila keranjang ini yang dipesan. */
export function selesaiBayar(kode: string) {
  try {
    if (localStorage.getItem(KUNCI_UNTUK) !== kode) return;
    localStorage.removeItem(KUNCI_UNTUK);
  } catch {
    return;
  }
  kosongkan();
}
