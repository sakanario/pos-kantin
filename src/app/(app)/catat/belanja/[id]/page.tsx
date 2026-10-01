import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { belanja } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { getInfoFormBelanja, getInfoTutup, getPeriodeBerjalan, tanggalDanPosisi } from "@/lib/data";
import { BelanjaForm } from "../../belanja-form";

export default async function EditBelanjaPage(props: PageProps<"/catat/belanja/[id]">) {
  const { id } = await props.params;
  const row = await db.query.belanja.findFirst({ where: eq(belanja.id, Number(id)) });
  if (!row) notFound();
  const [p, formBelanja, { setup, tutup, semua }] = await Promise.all([getPeriodeBerjalan(), getInfoFormBelanja(), getInfoTutup()]);
  if (!p) return null;

  return (
    <main>
      <PageHeader title="Ubah belanja" />
      <div className="space-y-4 px-4">
        <BelanjaForm
          bahan={formBelanja.bahan}
          barang={formBelanja.barang}
          hariIni={p.hariIni}
          info={{ setup, tutup }}
          edit={{ ...row, ...tanggalDanPosisi(row.waktu, semua) }}
        />
        <Link href="/catat" className="btn-ghost w-full">
          ← Kembali
        </Link>
      </div>
    </main>
  );
}
