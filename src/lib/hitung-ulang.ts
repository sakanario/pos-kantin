import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tutupBuku } from "@/db/schema";
import { hitungPeriode } from "./calc";
import { awalData, getDataPeriode } from "./data";

/**
 * Hitung ulang semua periode yang sudah ditutup, mulai dari periode yang memuat `sejakWaktu`.
 * Dipakai saat catatan lama ditambah/diubah/dihapus. Input tutup buku (saldo, sisa, cash) tidak berubah,
 * hanya hasilnya (dan modal rata-rata Beng Beng yang berantai ke periode berikutnya).
 * Mengembalikan jumlah periode yang dihitung ulang.
 */
export async function hitungUlangSejak(sejakWaktu: number): Promise<number> {
  const rows = await db.select().from(tutupBuku).orderBy(asc(tutupBuku.waktu), asc(tutupBuku.id));
  let jumlah = 0;
  let prev = rows[0];
  for (const row of rows.slice(1)) {
    if (row.waktu >= sejakWaktu) {
      const data = await getDataPeriode(awalData(prev), row.waktu);
      const hasil = hitungPeriode(
        {
          saldoKantong: prev.saldoKantong,
          sisaBb: prev.sisaBb,
          cashBelumDisetor: prev.cashBelumDisetor,
          avgModalBb: prev.avgModalBb,
        },
        { waktu: row.waktu, saldoKantong: row.saldoKantong, sisaBb: row.sisaBb, cashBelumDisetor: row.cashBelumDisetor },
        data,
      );
      await db
        .update(tutupBuku)
        .set({ avgModalBb: hasil.avgModalBb, hasilJson: JSON.stringify(hasil) })
        .where(eq(tutupBuku.id, row.id));
      row.avgModalBb = hasil.avgModalBb;
      jumlah++;
    }
    prev = row;
  }
  return jumlah;
}
