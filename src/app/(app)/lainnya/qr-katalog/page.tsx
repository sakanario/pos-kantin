import QRCode from "qrcode";
import { PageHeader } from "@/components/page-header";
import { alamatAsal } from "@/lib/alamat";
import { NAMA_KANTIN } from "@/lib/katalog";
import { CetakButton } from "./cetak-button";

/** Lembar siap cetak berisi QR ke /pesan untuk ditempel di meja kantin. */
export default async function QrKatalogPage() {
  const { asal, lokal } = await alamatAsal();
  const url = `${asal}/pesan`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b100c", light: "#ffffff" } });

  return (
    <main>
      <div className="print:hidden">
        <PageHeader title="QR katalog" back="/lainnya" sub="Tempel di meja kantin; pembeli pindai untuk lihat menu" />
      </div>
      <div className="space-y-4 px-4">
        {lokal && (
          <p className="card border-warn text-sm print:hidden">
            ⚠️ Alamat ini ({url}) hanya bisa dibuka {lokal === "laptop" ? "di laptop ini" : "dari WiFi yang sama"}. Untuk dicetak, buka halaman ini dari alamat online
            (domain Vercel) supaya QR-nya mengarah ke sana.
          </p>
        )}
        <section className="mx-auto max-w-sm rounded-[var(--r-lg)] bg-white p-6 text-center text-[#2b100c] shadow-pop-lg print:max-w-none print:shadow-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo statis kecil */}
          <img src="/icons/logo.png" alt="" width={72} height={72} className="mx-auto size-[72px] rounded-[var(--r-md)]" />
          <h2 className="mt-3 text-3xl font-bold">{NAMA_KANTIN}</h2>
          <p className="mt-1 text-lg font-semibold">Pindai untuk lihat menu</p>
          <div className="mx-auto mt-4 w-full max-w-[280px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="num mt-3 break-all text-sm">{url.replace(/^https?:\/\//, "")}</p>
        </section>
        <div className="print:hidden">
          <CetakButton />
        </div>
      </div>
    </main>
  );
}
