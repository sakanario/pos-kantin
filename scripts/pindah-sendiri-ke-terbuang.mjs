// Sekali jalan: pindahkan tap "Sendiri" sebuah menu racikan pada satu tanggal (WIB) menjadi catatan bahan terbuang.
// Dipakai untuk susu basi 13 Okt 2026 yang dulu dicatat sebagai 6 Susu Murni diminum sendiri.
//
//   node scripts/pindah-sendiri-ke-terbuang.mjs "Susu Murni" 2026-10-13            # lihat dulu (tidak mengubah apa pun)
//   node scripts/pindah-sendiri-ke-terbuang.mjs "Susu Murni" 2026-10-13 --jalankan
//
// Database dari DATABASE_URL / DATABASE_AUTH_TOKEN (atau .env.local), sama seperti `npm run db:migrate`.
// Sesudahnya: Setelan → "Hitung ulang semua laporan" supaya snapshot tutup buku ikut berubah.
import { createClient } from "@libsql/client";

try {
  process.loadEnvFile(".env.local");
} catch {}

const [namaMenu, tanggal, flag] = process.argv.slice(2);
if (!namaMenu || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal ?? "")) {
  console.error('Pakai: node scripts/pindah-sendiri-ke-terbuang.mjs "<nama menu>" YYYY-MM-DD [--jalankan]');
  process.exit(1);
}
const url = process.env.DATABASE_URL ?? "file:local.db";
const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
console.log(`Database: ${url}`);

const WIB = 7 * 3600000;
const awal = Date.parse(`${tanggal}T00:00:00Z`) - WIB;
const akhir = awal + 86400000;

const menu = (await db.execute({ sql: "select * from menu where nama = ?", args: [namaMenu] })).rows[0];
if (!menu || menu.jenis !== "racikan") throw new Error(`Menu racikan "${namaMenu}" tidak ditemukan.`);

const taps = (
  await db.execute({
    sql: "select * from tap_event where menu_id = ? and jenis = 'sendiri' and waktu >= ? and waktu < ? order by waktu",
    args: [menu.id, awal, akhir],
  })
).rows;
const cup = taps.reduce((a, t) => a + Number(t.delta), 0);
if (cup <= 0) throw new Error(`Tidak ada tap Sendiri ${namaMenu} pada ${tanggal}.`);
const waktu = Math.max(...taps.map((t) => Number(t.waktu)));

// Resep yang berlaku saat tap terakhir; harus satu bahan (mis. Susu Murni = susu 100 gr)
const resep = (
  await db.execute({
    sql: "select * from resep where menu_id = ? and berlaku_mulai <= ? order by berlaku_mulai desc, id desc limit 1",
    args: [menu.id, waktu],
  })
).rows[0];
const isi = resep ? JSON.parse(String(resep.isi_json)) : [];
if (isi.length !== 1) throw new Error(`Resep ${namaMenu} harus berisi tepat satu bahan (ada ${isi.length}).`);
const bahan = (await db.execute({ sql: "select * from bahan where id = ?", args: [isi[0].bahanId] })).rows[0];
const jumlah = cup * isi[0].takaran;
const catatan = `${bahan.nama} basi (dipindah dari ${cup} tap ${namaMenu} "Sendiri" ${tanggal})`;

console.log(`${taps.length} baris tap (${cup} cup) → terbuang ${jumlah} ${bahan.satuan} ${bahan.nama}`);
console.log(`waktu ${new Date(waktu + WIB).toISOString().replace("T", " ").slice(0, 16)} WIB, catatan: ${catatan}`);

if (flag !== "--jalankan") {
  console.log("\nBelum diubah. Tambahkan --jalankan untuk menyimpan.");
  process.exit(0);
}
await db.batch(
  [
    ...taps.map((t) => ({ sql: "delete from tap_event where id = ?", args: [t.id] })),
    { sql: "insert into bahan_terbuang (waktu, bahan_id, jumlah, catatan) values (?, ?, ?, ?)", args: [waktu, bahan.id, jumlah, catatan] },
  ],
  "write",
);
console.log("\nTersimpan. Lanjut: Setelan → Hitung ulang semua laporan.");
