import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { belanja } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { getInfoTutup, getPeriodeBerjalan, tanggalDanPosisi } from "@/lib/data";
import { getIsiPerDus } from "@/lib/settings";
import { BelanjaForm } from "../../forms";

export default async function EditBelanjaPage(props: PageProps<"/catat/belanja/[id]">) {
  const { id } = await props.params;
  const row = await db.query.belanja.findFirst({ where: eq(belanja.id, Number(id)) });
  if (!row) notFound();
  const [p, isiDus, { setup, tutup, semua }] = await Promise.all([getPeriodeBerjalan(), getIsiPerDus(), getInfoTutup()]);
  if (!p) return null;

  return (
    <main>
      <PageHeader title="Ubah belanja" />
      <div className="space-y-4 px-4">
        <BelanjaForm
          isiDus={isiDus}
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
