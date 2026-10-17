"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MenuKatalog } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { buatPesananAction } from "../actions";
import { jeda } from "@/lib/gerak";
import { Segmen } from "../gerak";
import { barisValid, Stepper } from "../katalog-client";
import { bacaNama, simpanNama, tandaiKeranjangUntuk, ubahJumlah, useKeranjang } from "../keranjang";

export function KeranjangForm({
  menu,
  bisaPesan,
  buka,
  dilewati: dilewatiPesanLagi,
}: {
  menu: MenuKatalog[];
  bisaPesan: boolean;
  buka: boolean;
  dilewati: string | null;
}) {
  const router = useRouter();
  const keranjang = useKeranjang();
  const valid = barisValid(keranjang, menu);
  const dilewati = keranjang.filter((b) => !valid.some((v) => v.menuId === b.menuId));
  const total = valid.reduce((a, b) => a + b.qty * b.menu.harga, 0);
  const [cara, setCara] = useState<"pickup" | "delivery">("pickup");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function bayar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nama = String(fd.get("nama") ?? "").trim();
    const catatan = String(fd.get("catatan") ?? "").trim();
    setError(null);
    simpanNama(nama);
    startTransition(async () => {
      const r = await buatPesananAction({
        nama,
        cara,
        catatan,
        item: valid.map(({ menuId, lessSugar, qty }) => ({ menuId, lessSugar, qty })),
      });
      if ("error" in r) return setError(r.error);
      tandaiKeranjangUntuk(r.kode);
      router.push(`/pesan/${r.kode}/bayar`);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-36 pt-5">
      <Link href="/pesan" className="inline-flex min-h-11 animate-masuk items-center gap-1 self-start text-[15px] font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Menu
      </Link>
      <h1 className="animate-masuk text-[28px] font-bold">Pesananmu</h1>
      {dilewatiPesanLagi && (
        <p className="animate-muncul rounded-2xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">
          {dilewatiPesanLagi} sedang habis, jadi tidak dimasukkan ke keranjang.
        </p>
      )}

      {valid.length === 0 ? (
        <p className="card animate-masuk text-sm text-muted">
          Keranjang masih kosong.{" "}
          <Link href="/pesan" className="font-bold text-accent underline">
            Pilih menu dulu
          </Link>
        </p>
      ) : (
        <form id="form-pesan" onSubmit={bayar} className="space-y-4">
          <div className="card flex animate-masuk flex-col px-4 py-1.5" style={jeda(1)}>
            {valid.map((b, i) => (
              <div key={`${b.menuId}:${b.lessSugar}`} className="flex animate-masuk items-center gap-3 border-b border-line py-3" style={jeda(i + 2)}>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{b.menu.nama}</p>
                  <p className="num mt-0.5 text-sm text-muted">
                    {b.lessSugar && <span className="font-bold text-accent-2">Less sugar · </span>}
                    {b.qty > 1 ? `${b.qty} × ${rupiah(b.menu.harga)}` : rupiah(b.menu.harga)}
                  </p>
                </div>
                <Stepper
                  qty={b.qty}
                  nama={`${b.menu.nama}${b.lessSugar ? " less sugar" : ""}`}
                  onKurang={() => ubahJumlah(b.menuId, b.lessSugar, -1)}
                  onTambah={() => ubahJumlah(b.menuId, b.lessSugar, 1)}
                />
              </div>
            ))}
            <div className="flex items-baseline justify-between pb-2.5 pt-3.5">
              <span className="font-semibold text-muted">Total</span>
              <span key={total} className="num inline-block animate-pop font-display text-[22px] font-bold">
                {rupiah(total)}
              </span>
            </div>
          </div>

          {dilewati.length > 0 && (
            <p className="animate-muncul rounded-2xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">
              Ada menu di keranjang yang sedang habis / tidak tersedia, jadi tidak ikut dipesan.
            </p>
          )}

          <div className="card animate-masuk space-y-3.5" style={jeda(3)}>
            <div>
              <label htmlFor="nama" className="label">
                Nama kamu
              </label>
              <input
                // Nama terakhir dari HP ini (form baru muncul setelah keranjang terbaca dari localStorage)
                ref={(el) => {
                  if (el && !el.value) el.value = bacaNama();
                }}
                id="nama" name="nama" required maxLength={40} autoComplete="given-name" className="input" />
            </div>
            <fieldset>
              <legend className="label">Pesanan diambil gimana?</legend>
              <Segmen
                label="Cara ambil"
                nilai={cara}
                onPilih={setCara}
                opsi={[
                  ["pickup", "Pickup"],
                  ["delivery", "Delivery"],
                ]}
              />
              <p className="mt-2 text-[13px] text-muted">
                {cara === "pickup" ? "Nanti ada tanda di halaman pesanan saat sudah siap diambil." : "Pesanan diantar ke mejamu."}
              </p>
            </fieldset>
            <div>
              <label htmlFor="catatan" className="label">
                Catatan {cara === "pickup" && <span className="font-normal">(opsional)</span>}
              </label>
              <input
                id="catatan"
                name="catatan"
                maxLength={120}
                required={cara === "delivery"}
                placeholder={cara === "pickup" ? "mis. esnya dikit" : "mis. meja pojok dekat jendela, baju biru"}
                className="input"
              />
              {cara === "delivery" && <p className="mt-1 animate-muncul text-[13px] text-muted">Tulis posisi atau ciri-ciri biar gampang dicari.</p>}
            </div>
          </div>

          {error && <p className="animate-muncul rounded-2xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
          {!bisaPesan && (
            <p className="animate-muncul rounded-2xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">
              {buka ? "Pembayaran online belum aktif. Pesan langsung di kantin ya." : "Kantin sedang tutup. Pesan bisa lagi saat kantin buka."}
            </p>
          )}
        </form>
      )}

      {valid.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md animate-naik px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <button
            type="submit"
            form="form-pesan"
            disabled={!bisaPesan || pending}
            className="btn-primary min-h-14 w-full font-display text-[17px] shadow-pop-lg transition-transform active:scale-[.98]"
          >
            {pending ? "Menyiapkan pembayaran…" : `Bayar ${rupiah(total)}`}
          </button>
        </div>
      )}
    </main>
  );
}
