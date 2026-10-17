import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { alamatAsal } from "@/lib/alamat";
import { rupiah, tanggalJam } from "@/lib/format";
import { NAMA_KANTIN } from "@/lib/katalog";
import { getPesananKode, LABEL_STATUS, sedangBerjalan, type PesananLengkap } from "@/lib/pesanan";
import { IngatPesanan, Pantau } from "../hidup";

export const metadata: Metadata = { title: `Pesanan · ${NAMA_KANTIN}` };

const ikonCentang = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);
const ikonCangkir = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
    <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
  </svg>
);

/** Struk sekaligus halaman lacak pesanan. Membukanya menambahkan pesanan ke "Pesananku" di HP ini. */
export default async function StrukPage(props: PageProps<"/pesan/[kode]">) {
  await connection();
  const { kode } = await props.params;
  const p = await getPesananKode(kode);
  if (!p) notFound();
  if (p.status === "menunggu_bayar") redirect(`/pesan/${p.kode}/bayar`);

  const { asal } = await alamatAsal();
  const qr = await QRCode.toString(`${asal}/pesan/${p.kode}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const lunas = p.dibayar !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-[18px] px-4 pb-10 pt-5">
      <IngatPesanan kode={p.kode} lunas={lunas} />
      {sedangBerjalan(p.status) && <Pantau ms={5000} />}
      <Link href="/pesan" className="inline-flex min-h-11 animate-masuk items-center gap-1 self-start text-[15px] font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Menu
      </Link>

      {lunas ? (
        <div className="flex animate-masuk flex-col items-center gap-1 text-center">
          <p className="font-display text-[22px] font-bold">Halo, {p.nama}!</p>
          <p className="mt-2 font-display text-xs font-semibold tracking-[.12em] text-muted">NOMOR ANTREAN</p>
          <p className="num animate-pop font-display text-[88px] font-extrabold leading-[92px]" style={{ animationDelay: "120ms" }}>
            #{p.nomor}
          </p>
          <p key={p.status} className="animate-pop rounded-full bg-accent px-3.5 py-1.5 font-display text-[15px] font-bold text-accent-fg shadow-pop">
            {LABEL_STATUS[p.status]}
          </p>
        </div>
      ) : (
        <div className="card animate-masuk text-center">
          <p className="font-display text-xl font-bold">{p.status === "kedaluwarsa" ? "Pembayaran kedaluwarsa" : "Pesanan dibatalkan"}</p>
          <p className="mt-1 text-sm text-muted">Pesanan ini belum dibayar.</p>
        </div>
      )}

      {lunas && p.status !== "batal" && <Langkah p={p} />}
      {lunas && p.status === "batal" && (
        <p className="card animate-muncul text-center text-sm">
          Maaf, pesanan ini dibatalkan kantin. Uangnya dikembalikan oleh kantin; tanyakan langsung bila belum diterima.
        </p>
      )}

      <div className="card flex animate-masuk flex-col gap-1" style={{ animationDelay: "200ms" }}>
        <div className="flex justify-between gap-3 border-b border-dashed border-outline pb-2 text-[13px] text-muted">
          <span>{tanggalJam(p.dibayar ?? p.dibuat)}</span>
          <span className="font-bold">{p.cara === "delivery" ? "Delivery" : "Pickup"}</span>
        </div>
        {p.catatan && <p className="pt-2 text-[13px] text-muted">Catatan: {p.catatan}</p>}
        <div className="border-b border-dashed border-outline py-2">
          {p.item.map((i) => (
            <div key={i.id} className="flex justify-between gap-3 py-0.5">
              <span>
                {i.qty}× {i.nama} {i.lessSugar && <span className="font-bold text-accent-2">less sugar</span>}
              </span>
              <span className="num whitespace-nowrap">{rupiah(i.qty * i.harga)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-2">
          <span className="font-semibold text-muted">
            {lunas ? `Total dibayar · ${(p.metode ?? "").toUpperCase()}` : "Total"}
          </span>
          <span className="num font-display text-lg font-bold">{rupiah(p.total)}</span>
        </div>

        {lunas && (
          <div className="mt-3.5 flex flex-col items-center gap-2">
            <div className="size-[148px] rounded-xl bg-white p-1.5 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="text-center text-[13px] text-muted">Screenshot struk ini. Scan QR-nya kapan saja untuk lacak pesanan.</p>
          </div>
        )}
      </div>

      {sedangBerjalan(p.status) ? (
        <p className="animate-masuk text-center text-sm text-muted" style={{ animationDelay: "260ms" }}>
          Status diperbarui otomatis.
        </p>
      ) : (
        !lunas && (
          <Link href="/pesan/keranjang" className="btn-primary self-center">
            Pesan lagi
          </Link>
        )
      )}
    </main>
  );
}

/** 4 langkah: Lunas → Diterima → Dibuat → Siap diambil / Diantar. */
function Langkah({ p }: { p: PesananLengkap }) {
  const urutan = ["lunas", "diterima", "dibuat", p.cara === "delivery" ? "diantar" : "siap"] as const;
  const label = ["Lunas", "Diterima", "Dibuat", p.cara === "delivery" ? "Diantar" : "Siap diambil"];
  const posisi = urutan.indexOf(p.status as (typeof urutan)[number]);
  const selesai = posisi === urutan.length - 1;
  return (
    <div className="card animate-masuk px-3 py-[18px]" style={{ animationDelay: "160ms" }}>
      <ol className="grid grid-cols-4 gap-1 text-center">
        {urutan.map((s, i) => {
          const lewat = i < posisi || (selesai && i === posisi);
          const kini = i === posisi && !selesai;
          return (
            <li key={s} aria-current={kini ? "step" : undefined} className="flex flex-col items-center gap-1.5">
              <span
                // key berubah saat langkah ini berubah keadaan → animasi pop (status diperbarui lewat polling)
                key={lewat ? "lewat" : kini ? "kini" : "nanti"}
                className={`flex size-9 items-center justify-center rounded-full transition-colors duration-500 ${
                  lewat
                    ? "animate-pop bg-good text-accent-fg"
                    : kini
                      ? "animate-denyut bg-accent text-accent-fg"
                      : "bg-card-raised shadow-[inset_0_0_0_1.5px_var(--outline)]"
                }`}
              >
                {lewat ? ikonCentang : kini ? ikonCangkir : null}
              </span>
              <span className={`text-[13px] ${kini ? "font-bold" : lewat ? "font-semibold" : "text-muted"}`}>{label[i]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
