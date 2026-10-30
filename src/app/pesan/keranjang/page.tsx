import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getKatalog } from "@/lib/data";
import { NAMA_KANTIN } from "@/lib/katalog";
import { gatewayAktif } from "@/lib/pesanan";
import { isSetupDone } from "@/lib/settings";
import { KeranjangForm } from "./keranjang-form";

export const metadata: Metadata = { title: `Pesananmu · ${NAMA_KANTIN}` };

export default async function KeranjangPage(props: PageProps<"/pesan/keranjang">) {
  await connection();
  if (!(await isSetupDone())) notFound();
  const [{ buka, menu }, { dilewati }] = await Promise.all([getKatalog(), props.searchParams]);
  return (
    <KeranjangForm
      menu={menu}
      bisaPesan={buka && gatewayAktif() !== null}
      buka={buka}
      // "Pesan lagi": menu yang dilewati karena habis / tidak tersedia
      dilewati={typeof dilewati === "string" ? dilewati.slice(0, 200) : null}
    />
  );
}
