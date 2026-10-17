"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { aturTemaPembeliAction } from "./actions";

// Komponen bergerak untuk halaman pembeli: lapisan (panel bawah / dialog / pratinjau) dengan animasi masuk &
// keluar, dan pilihan dua opsi dengan indikator yang meluncur. Keyframe di globals.css (animate-*).

const DURASI_KELUAR = 200;

/**
 * Lapisan di atas halaman, lewat portal ke <body> (kartu kaca dengan backdrop-filter mengurung position: fixed).
 * Tutup: ketuk latar, Esc, atau `tutup` dari children. Animasi keluar diputar dulu sebelum `onTutup` dipanggil.
 * Panel bawah punya handle yang bisa diseret: ikut jari, lepas jauh / kibas cepat ke bawah = tutup, selain itu
 * memantul balik. Ditarik ke atas terasa berat (seperti karet).
 */
export function Lapisan({
  onTutup,
  posisi,
  label,
  peran = "dialog",
  className = "",
  children,
}: {
  onTutup: () => void;
  posisi: "bawah" | "tengah";
  label?: string;
  peran?: "dialog" | "alertdialog";
  className?: string;
  children: (tutup: () => void) => React.ReactNode;
}) {
  const [menutup, setMenutup] = useState(false);
  const [sudahMasuk, setSudahMasuk] = useState(false); // animasi masuk selesai → transform bebas dipakai seretan
  const [tarik, setTarik] = useState(0); // px ke bawah (negatif = ke atas, sudah diberi hambatan)
  const [seret, setSeret] = useState<{ tinggi: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const jejak = useRef<{ y0: number; y: number; t: number; v: number }>({ y0: 0, y: 0, t: 0, v: 0 });
  const tutup = () => {
    setMenutup(true);
    setTimeout(onTutup, DURASI_KELUAR);
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenutup(true);
      setTimeout(onTutup, DURASI_KELUAR);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onTutup]);

  useEffect(() => {
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // halaman di belakang tidak ikut bergulir
    return () => {
      document.body.style.overflow = lama;
    };
  }, []);

  const handle = {
    onPointerDown: (e: React.PointerEvent) => {
      if (menutup) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      jejak.current = { y0: e.clientY, y: e.clientY, t: performance.now(), v: 0 };
      setSeret({ tinggi: panel.current?.offsetHeight ?? 400 });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!seret) return;
      const j = jejak.current;
      const now = performance.now();
      j.v = (e.clientY - j.y) / Math.max(1, now - j.t); // px/ms, positif = ke bawah
      j.y = e.clientY;
      j.t = now;
      const dy = e.clientY - j.y0;
      setTarik(dy >= 0 ? dy : -Math.min(40, Math.sqrt(-dy) * 4));
    },
    onPointerUp: () => {
      if (!seret) return;
      const lepasJauh = tarik > Math.min(120, seret.tinggi * 0.3);
      const kibas = jejak.current.v > 0.5 && tarik > 10;
      setSeret(null);
      if (lepasJauh || kibas) tutup(); // animasi keluar mulai dari posisi jari sekarang
      else setTarik(0); // memantul balik (transition)
    },
    onPointerCancel: () => {
      setSeret(null);
      setTarik(0);
    },
  };
  const gelapLatar = seret && tarik > 0 ? Math.max(0.2, 1 - tarik / seret.tinggi) : 1;

  const animasi = menutup
    ? posisi === "bawah"
      ? "animate-turun"
      : "animate-hilang"
    : sudahMasuk
      ? ""
      : posisi === "bawah"
        ? "animate-naik"
        : "animate-muncul";

  return createPortal(
    <div className={`fixed inset-0 z-30 flex justify-center ${posisi === "bawah" ? "items-end" : "items-center px-6"}`}>
      <button
        type="button"
        aria-label="Tutup"
        tabIndex={-1}
        className={`absolute inset-0 bg-[rgb(43_16_12/.5)] ${menutup ? "animate-latar-keluar" : "animate-latar"}`}
        style={{ opacity: gelapLatar }}
        onClick={tutup}
      />
      <div
        ref={panel}
        role={peran}
        aria-modal="true"
        aria-label={label}
        className={`relative w-full ${animasi} ${className} ${
          // Panel bawah diperpanjang ke bawah layar (warna sama), supaya saat ditarik ke atas tidak ada celah kosong
          posisi === "bawah"
            ? "after:pointer-events-none after:absolute after:inset-x-0 after:top-[calc(100%-1px)] after:h-16 after:[background:inherit]"
            : ""
        }`}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && !menutup) setSudahMasuk(true);
        }}
        style={
          posisi === "bawah"
            ? {
                transform: tarik ? `translateY(${tarik}px)` : undefined,
                transition: seret ? "none" : "transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.25)",
              }
            : undefined
        }
      >
        {posisi === "bawah" && (
          // Area seret selebar panel; garis kecil = tanda bisa diseret
          <div
            {...handle}
            aria-hidden="true"
            className="-mx-5 -mt-3 flex h-9 shrink-0 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
          >
            <span className={`h-[5px] rounded-full bg-outline transition-all duration-200 ${seret ? "w-14 opacity-90" : "w-11"}`} />
          </div>
        )}
        {children(tutup)}
      </div>
    </div>,
    document.body,
  );
}

/** Dua pilihan dengan pil gelap yang meluncur ke pilihan aktif (Normal / Less sugar, Pickup / Delivery). */
export function Segmen<T extends string | boolean>({
  nilai,
  opsi,
  onPilih,
  label,
}: {
  nilai: T;
  opsi: readonly (readonly [T, string])[];
  onPilih: (v: T) => void;
  label: string;
}) {
  const i = Math.max(
    0,
    opsi.findIndex(([v]) => v === nilai),
  );
  return (
    <div
      role="group"
      aria-label={label}
      className="relative grid grid-cols-2 gap-1 rounded-full bg-card-raised p-1 shadow-[inset_0_0_0_1.5px_var(--outline)]"
    >
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-full bg-accent shadow-pop transition-transform duration-300 ease-[cubic-bezier(.2,.9,.3,1.15)]"
        style={{ width: "calc(50% - 6px)", transform: `translateX(calc(${i * 100}% + ${i * 4}px))` }}
      />
      {opsi.map(([v, teks]) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={v === nilai}
          onClick={() => onPilih(v)}
          className={`relative min-h-11 rounded-full font-display text-[15px] font-bold transition-colors duration-300 ${v === nilai ? "text-accent-fg" : "text-muted"}`}
        >
          {teks}
        </button>
      ))}
    </div>
  );
}

/**
 * Tombol tema terang/gelap halaman pembeli. Tampilan langsung berganti (atribut data-theme di <html>, warna
 * berpindah halus lewat kelas tema-ganti), lalu pilihan disimpan di cookie HP ini.
 */
export function TombolTema({ tema }: { tema: "terang" | "gelap" }) {
  const [kini, setKini] = useState(tema);
  const gelap = kini === "gelap";
  return (
    <button
      type="button"
      aria-label={gelap ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      onClick={() => {
        const baru = gelap ? "terang" : "gelap";
        const html = document.documentElement;
        html.classList.add("tema-ganti");
        html.dataset.theme = baru === "gelap" ? "dark" : "light";
        setTimeout(() => html.classList.remove("tema-ganti"), 400);
        setKini(baru);
        aturTemaPembeliAction(baru);
      }}
      className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-raised text-accent shadow-pop transition-transform duration-150 active:scale-90"
    >
      <span key={kini} className="animate-putar flex">
        {gelap ? (
          // matahari: ketuk untuk terang
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          // bulan: ketuk untuk gelap
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
          </svg>
        )}
      </span>
    </button>
  );
}
