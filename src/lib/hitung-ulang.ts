import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tutupBuku } from "@/db/schema";
import { hitungPeriode } from "./calc";
import { awalData, getDataPeriode, stokDari } from "./data";

/**
 * Hitung ulang semua periode yang sudah ditutup, mulai dari periode yang memuat `sejakWaktu`.
 * Dipakai saat catatan lama ditambah/diubah/dihapus. Input tutup buku (saldo, sisa stok) tidak berubah,
 * hanya hasilnya (dan modal rata-rata barang jadi yang berantai ke periode berikutnya).
 * Mengembalikan jumlah periode yang dihitung ulang.
 */
export async function hitungUlangSejak(sejakWaktu: number): Promise<number> {
  const rows = await db.select().from(tutupBuku).orderBy(asc(tutupBuku.waktu), asc(tutupBuku.id));
  let jumlah = 0;
  let prev = rows[0];
  for (const row of rows.slice(1)) {
    if (row.waktu >= sejakWaktu) {
      const data = await getDataPeriode(awalData(prev), row.waktu);
      const sisa = Object.fromEntries(Object.entries(stokDari(row)).map(([id, s]) => [id, s.sisa]));
      const hasil = hitungPeriode(
        { saldoKantong: prev.saldoKantong, cashBelumDisetor: prev.cashBelumDisetor, stok: stokDari(prev) },
        { waktu: row.waktu, saldoKantong: row.saldoKantong, cashBelumDisetor: row.cashBelumDisetor, sisa },
        data,
      );
      const stokJson = JSON.stringify(hasil.stok);
      await db.update(tutupBuku).set({ stokJson, hasilJson: JSON.stringify(hasil) }).where(eq(tutupBuku.id, row.id));
      row.stokJson = stokJson;
      jumlah++;
    }
    prev = row;
  }
  return jumlah;
}
