# CR-004: Tab "Lainnya" dan halaman "Uang & Barang" (inventaris)

Status: **selesai** (2026-10-01)
Tanggal: 2026-10-01

## Latar belakang

1. Pengguna ingin tahu berapa uangnya yang sekarang **berbentuk barang**. Contoh: stok 3 Beng Beng ×
   modal Rp2.000 = Rp6.000. Angka ini **tidak** masuk untung jualan maupun uang bersih (CR-002), jadi
   perlu tempat sendiri.
2. Halaman Laporan harus **fokus ke laporan**. Kartu saldo dan tautan Riwayat Pengeluaran dipindah.
3. Bottom nav sudah penuh (5 tab). Fitur Menu (CR-003) akan menambah halaman Bahan dan Menu.

## Perubahan 1: Tab "Setelan" diganti "Lainnya" (☰)

**Bottom nav (`src/app/(app)/bottom-nav.tsx`)**
```
☕ Beranda   📝 Catat   🔒 Tutup Buku   📊 Laporan   ☰ Lainnya
```
- Item Setelan diganti `{ href: "/lainnya", label: "Lainnya", icon: "☰" }`.
- Tab Lainnya **aktif** untuk semua halaman di bawahnya: `/lainnya`, `/lainnya/*`, `/setelan`.

**Halaman baru `/lainnya`**
```
Lainnya
─────────────────────────────────────
💰 Uang & Barang           ›   saldo, stok barang, potensi
🧾 Riwayat Pengeluaran     ›   semua belanja per bulan
⚙️ Setelan                 ›   harga, PIN, hitung ulang
```
- Gaya kartu sama dengan tautan "Riwayat Pengeluaran" yang sekarang ada di Laporan.
- CR-003 nanti menambahkan 🧂 Bahan dan 🍽️ Menu di daftar ini.

**Pindah rute**
- `/laporan/belanja` → `/lainnya/pengeluaran`. Perbarui tautan di `catat/page.tsx` dan fungsi
  pembentuk URL filter di halaman itu.
- `/setelan` tetap di tempatnya (hanya pintu masuknya yang pindah ke Lainnya). Halaman yang dibuka dari
  Lainnya menampilkan tombol kembali ke `/lainnya` (pakai `PageHeader` yang ada, bila mendukung).

**Laporan (`src/app/(app)/laporan/page.tsx`)**
- Hapus `SaldoCard` dan tautan "Riwayat Pengeluaran". Sisanya (grafik kopi, rekap bulanan, riwayat tutup
  buku) tetap.

## Perubahan 2: Halaman "Uang & Barang" (`/lainnya/uang-barang`)

**Konsep**
- Semua angka **per tutup buku terakhir** (atau setup awal), sama seperti kartu saldo: saldo dan sisa
  stok hanya diketahui saat tutup buku.
- **Modal barang** = sisa × modal rata-rata (`tutup_buku.sisa_bb × tutup_buku.avg_modal_bb`). Ini angka
  yang sama dengan modal untuk untung jualan.
- **Potensi omzet** = sisa × harga jual sekarang. **Potensi untung** = potensi omzet − modal barang.
- Bahan kopi **tidak** dihitung (stoknya tidak dilacak); alat dan dead stock (cup 16 oz) juga tidak.

**Tampilan** (angka = data pengguna per 1 Okt)
```
Uang & Barang
per tutup buku 1 Okt 2026, 16.48

Saldo Kantong Kantin                 Rp125.000
Barang (modal)                        Rp21.618
──────────────────────────────────────────────
Total                                Rp146.618

📦 Barang
🍫 Beng Beng     10 pcs × Rp2.162     Rp21.618
   Potensi omzet  10 × Rp3.000        Rp30.000
   Potensi untung                     +Rp8.382

Sejak tutup buku: +34 pcs dibeli, 1 dimakan sendiri      ← contoh; data pengguna belum ada
(yang terjual baru ketahuan saat tutup buku)

Bahan kopi, alat, dan barang yang tidak dijual tidak dihitung.
```
Di bawahnya: `SaldoCard` yang sudah ada (berisi daftar setor/tarik "Sejak itu").

- Baris "Sejak tutup buku" hanya muncul bila ada pembelian / tap sendiri sesudah tutup buku terakhir.
  Hitung dari `belanja` (kategori `bb`, `waktu > tutup terakhir`) dan `tap_event` (`bb_sendiri`).
- Bila sisa stok 0, tampilkan "Tidak ada stok barang" dan total = saldo.
- Fungsi data baru di `src/lib/data.ts`, misalnya `getUangBarang()`, yang mengembalikan saldo, waktu,
  daftar barang `{ nama, sisa, modalPerPcs, hargaJual }`, dan pergerakan sejak tutup buku. Perhitungan
  potensi boleh di komponen (bukan `Date.now()`, jadi aman untuk lint).
- Dibuat dalam bentuk daftar barang (meski sekarang hanya Beng Beng), supaya CR-003 tinggal mengisi
  daftar dari `stok_json` semua barang jadi.

**Beranda**
- `SaldoCard` di Beranda **tetap ada**.

## Dokumen
- `spec.md` §4 (navigasi: tab Lainnya, halaman Uang & Barang, Riwayat Pengeluaran pindah), §4.5 Laporan.
- `CLAUDE.md` bagian Arsitektur: daftar halaman `(app)/` (tambah `lainnya`).

## Kriteria selesai
- [x] Bottom nav: tab Lainnya menggantikan Setelan; aktif di `/lainnya*` dan `/setelan`.
- [x] `/lainnya` berisi Uang & Barang, Riwayat Pengeluaran, Setelan.
- [x] Riwayat Pengeluaran pindah ke `/lainnya/pengeluaran`; tidak ada tautan rusak (cek `catat/page.tsx`,
      filter bulan).
- [x] Laporan tidak lagi menampilkan kartu saldo dan tautan Riwayat Pengeluaran.
- [x] Uang & Barang pada salinan data pengguna: saldo 125.000, barang 21.618, total 146.618, potensi omzet
      30.000, potensi untung 8.382.
- [x] `npx tsc --noEmit`, `npx eslint src`, `npm test` lulus.
- [x] Dicek di browser dengan `dummy.db`, tampilan HP (375px).
- [x] `spec.md` dan `CLAUDE.md` diperbarui.
