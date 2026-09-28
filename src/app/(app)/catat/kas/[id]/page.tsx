import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kas } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { getInfoTutup, getPeriodeBerjalan, tanggalDanPosisi } from "@/lib/data";
import { KasForm } from "../../forms";

export default async function EditKasPage(props: PageProps<"/catat/kas/[id]">) {
  const { id } = await props.params;
  const row = await db.query.kas.findFirst({ where: eq(kas.id, Number(id)) });
  if (!row) notFound();
  const [p, { setup, tutup, semua }] = await Promise.all([getPeriodeBerjalan(), getInfoTutup()]);
  if (!p) return null;

  return (
    <main>
      <PageHeader title={row.jenis === "setor" ? "Ubah setor modal" : "Ubah tarik"} />
      <div className="space-y-4 px-4">
        <KasForm hariIni={p.hariIni} info={{ setup, tutup }} edit={{ ...row, ...tanggalDanPosisi(row.waktu, semua) }} />
        <Link href="/catat?tab=kas" className="btn-ghost w-full">
          ← Kembali
        </Link>
      </div>
    </main>
  );
}
