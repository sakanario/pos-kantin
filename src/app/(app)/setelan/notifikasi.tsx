"use client";

import { useEffect, useState, useTransition } from "react";
import { hapusLanggananAction, kirimNotifikasiUjiAction, simpanLanggananAction, type FormState } from "@/app/actions";
import { FormMessage } from "@/components/form";

type Keadaan = "memeriksa" | "tidak-didukung" | "tidak-aman" | "ditolak" | "mati" | "aktif";

function kunciKeBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** "Android · Chrome" dari user agent, supaya langganan di DB bisa dikenali. */
function namaPerangkat() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Lain";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${br}`;
}

/** Setelan: aktifkan notifikasi pesanan online di HP ini (web push), kirim notifikasi uji, matikan. */
export function NotifikasiPesanan({ kunci, jumlahHp }: { kunci: string | null; jumlahHp: number }) {
  const [keadaan, setKeadaan] = useState<Keadaan>("memeriksa");
  const [state, setState] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let batal = false;
    (async () => {
      let k: Keadaan;
      if (!window.isSecureContext) k = "tidak-aman";
      else if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) k = "tidak-didukung";
      else if (Notification.permission === "denied") k = "ditolak";
      else {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        k = (await reg?.pushManager.getSubscription()) ? "aktif" : "mati";
      }
      if (!batal) setKeadaan(k);
    })();
    return () => {
      batal = true;
    };
  }, []);

  const aktifkan = () =>
    startTransition(async () => {
      setState(undefined);
      if (!kunci) return setState({ error: "Kunci VAPID belum diisi di env server." });
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setKeadaan(izin === "denied" ? "ditolak" : "mati");
        return setState({ error: "Izin notifikasi tidak diberikan." });
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciKeBytes(kunci) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await simpanLanggananAction(json, namaPerangkat());
      setState(r);
      if (r?.ok) setKeadaan("aktif");
    });

  const matikan = () =>
    startTransition(async () => {
      setState(undefined);
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await hapusLanggananAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setKeadaan("mati");
      setState({ ok: "Notifikasi dimatikan di HP ini." });
    });

  const uji = () =>
    startTransition(async () => {
      setState(await kirimNotifikasiUjiAction());
    });

  return (
    <div className="space-y-2">
      {keadaan === "tidak-aman" && (
        <p className="text-sm text-muted">
          Notifikasi hanya bisa diaktifkan dari alamat <b>https://</b> (domain Vercel) atau localhost, bukan dari IP WiFi.
        </p>
      )}
      {keadaan === "tidak-didukung" && <p className="text-sm text-muted">Browser ini tidak mendukung notifikasi. Coba Chrome di Android.</p>}
      {keadaan === "ditolak" && (
        <p className="text-sm text-muted">Notifikasi diblokir untuk situs ini. Izinkan lewat pengaturan situs di browser, lalu buka lagi halaman ini.</p>
      )}
      {keadaan === "mati" && (
        <button type="button" disabled={pending} className="btn-primary w-full" onClick={aktifkan}>
          {pending ? "Mengaktifkan…" : "🔔 Aktifkan notifikasi pesanan di HP ini"}
        </button>
      )}
      {keadaan === "aktif" && (
        <>
          <p className="text-sm font-semibold text-good">🔔 Aktif di HP ini</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={pending} className="btn-ghost text-sm" onClick={uji}>
              Kirim uji
            </button>
            <button type="button" disabled={pending} className="btn-ghost text-sm text-bad" onClick={matikan}>
              Matikan
            </button>
          </div>
        </>
      )}
      <FormMessage state={state} />
      <p className="text-xs text-muted">
        {jumlahHp > 0 ? `${jumlahHp} perangkat menerima notifikasi.` : "Belum ada perangkat yang menerima notifikasi."} Saat pesanan
        lunas muncul &ldquo;Pesanan #7 · Budi · 1× Kopi Susu SKM&rdquo;; ketuk untuk membuka Pesanan.
      </p>
    </div>
  );
}
