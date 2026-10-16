import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getKatalog } from "@/lib/data";
import { NAMA_KANTIN } from "@/lib/katalog";
import { gatewayAktif } from "@/lib/pesanan";
import { isSetupDone } from "@/lib/settings";
import { KeranjangForm } from "./keranjang-form";

export const metadata: Metadata = { title: `Pesananmu · ${NAMA_KANTIN}` };

export default async function KeranjangPage() {
  await connection();
  if (!(await isSetupDone())) notFound();
  const { buka, menu } = await getKatalog();
  return <KeranjangForm menu={menu} bisaPesan={buka && gatewayAktif() !== null} buka={buka} />;
}
