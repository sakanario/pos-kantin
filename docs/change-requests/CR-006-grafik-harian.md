# CR-006: Grafik harian barang jadi (perkiraan), batang bertumpuk, dan geser minggu/bulan

Status: **selesai** (2026-10-13)
Tanggal: 2026-10-13

## Latar belakang

1. Laporan hanya punya grafik **racikan** terjual 14 hari terakhir. Pengguna ingin grafik yang sama untuk
   **barang jadi** (Beng Beng, Chuba).
2. Barang jadi tidak di-tap. Jumlah terjualnya hanya diketahui **per periode tutup buku**
   (stok awal + beli − sendiri − sisa). Untuk grafik harian, total periode **dibagi ke hari-hari kantin buka**
   di periode itu, jadi angkanya **perkiraan**.
3. Hari libur kantin tidak tentu, dan tidak bisa ditebak dari tap kopi (ada hari buka tanpa penjualan kopi).
   Karena itu hari buka ditanyakan saat Tutup Buku.
4. Pengguna ingin bisa melihat grafik minggu lalu atau bulan lalu, tidak hanya 14 hari terakhir.

Diskusi: `docs/diskusi.md` #13.

## Perubahan 1: Langkah "Hari buka" di Tutup Buku

**Data**
- `tutup_buku`: kolom baru `hari_buka_json` (text, nullable): daftar tanggal WIB yang dicentang buka,
  mis. `["2026-10-11","2026-10-13"]`. `NULL` = periode lama (sebelum fitur ini), dihitung dengan centang bawaan.

**Wizard (`src/app/(app)/tutup-buku/wizard.tsx`)**: langkah baru sesudah "2. Sisa stok":
```
3. Hari apa saja kantin buka?
Hapus centang hari libur.
☑ Sab, 11 Okt
☐ Min, 12 Okt
☑ Sen, 13 Okt
```
- Isinya semua tanggal WIB dari awal periode sampai waktu tutup buku ini.
- **Centang bawaan** semua tercentang, kecuali:
  - **awal periode**: jika tutup buku **sebelumnya** dilakukan jam **21.00 atau lebih**, tanggal itu tidak
    dicentang (kantin sudah tutup, sisa hari itu tidak ada jualan);
  - **akhir periode**: jika tutup buku **ini** dilakukan **sebelum jam 08.00**, tanggal hari ini tidak dicentang
    (belum ada jualan hari ini).
  - Jam 08.00–20.59: tanggal itu tercentang di kedua periode.
- Minimal satu tanggal harus tercentang (jika tidak, tombol simpan nonaktif dengan pesan).
- Langkah ini hanya tampil bila ada barang jadi di periode itu (yang juga ditanyakan di "2. Sisa stok").
- Hari buka tidak bisa diubah setelah tutup buku disimpan (tidak ada tombol ubah di detail laporan).
- Pakai tombol + `<input type="hidden">` (jebakan form reset React 19), bukan checkbox terkontrol.

**Periode pertama** mulai dari 0 untuk perhitungan, tetapi daftar tanggalnya dimulai dari **waktu setup awal**.

**Periode lama** (`hari_buka_json` = NULL): dianggap buka setiap hari, dengan aturan jam yang sama.

## Perubahan 2: Pembagian terjual barang jadi per hari (`src/lib/calc.ts`)

Fungsi murni baru (dites di `calc.test.ts`):

```ts
/** Tanggal bawaan yang dicentang buka untuk periode (awal, akhir]; aturan jam 08.00 & 21.00 WIB. */
hariBukaBawaan(awalPeriode: number, akhirPeriode: number): string[]

/** Bagi `jumlah` ke `hari` (urut tanggal) dengan pembulatan; total tetap. */
bagiPerHari(jumlah: number, hari: string[]): Map<string, number>
```
- Pembulatan: `dasar = floor(jumlah / n)`, sisanya `+1` ke hari-hari **pertama**.
  Contoh 5 pcs / 2 hari → 3 + 2; 9 pcs / 3 hari → 3 + 3 + 3; 2 pcs / 3 hari → 1 + 1 + 0.
- Terjual negatif (salah input, sudah ada peringatan di laporan) → dianggap 0 di grafik.
- Tanggal yang muncul di dua periode (jam 08.00–20.59) mendapat jumlah dari keduanya.

Contoh (tutup buku Senin 07.00 lalu Selasa 20.00):
```
Periode 1  Min 08.00 – Sen 07.00   terjual 10   hari buka: Min          → Min 10
Periode 2  Sen 07.00 – Sel 20.00   terjual 8    hari buka: Sen, Sel     → Sen 4, Sel 4
Grafik     Min 10 · Sen 4 · Sel 4
```

Data (`src/lib/data.ts`): fungsi baru, mis. `getGrafikHarian(dari, sampai)`, yang mengembalikan per tanggal:
- racikan: Σ delta tap `terjual` per menu (pengganti `getTerjualPerHari`);
- barang jadi: hasil `bagiPerHari` per menu, dari `hasil_json.menu[].terjual` semua periode yang menyentuh
  rentang itu, dan tanggal tutup buku terakhir (batas data barang jadi).

## Perubahan 3: Grafik di Laporan

```
Racikan terjual
[Minggu] [Bulan]                    ‹  6 – 12 Okt  ›
  ▆   ▇   ▃   ▅   ▇   ▂   ▅           (bertumpuk per menu)
  S   S   R   K   J   S   M
■ Kopi Susu SKM  ■ Kopi Susu Gula Aren

Barang jadi terjual · perkiraan
  ▅   ▅   ▃   ▃   ▃
  S   S   R   K   J                   (berhenti di tutup buku terakhir)
■ Beng Beng  ■ Chuba
Dibagi rata ke hari buka di tiap tutup buku.
```

- **Pilihan Minggu | Bulan** dan tombol **‹ ›** di atas grafik racikan. Keduanya mengatur **dua grafik
  sekaligus** (bergerak bersama). Menggantikan "Racikan terjual, 14 hari terakhir".
  - Minggu = 7 batang, Senin–Minggu. Bulan = 1 batang per tanggal; label tanggal di bawah hanya sebagian
    (mis. 1, 5, 10, 15, 20, 25, 30) supaya terbaca di 375 px.
  - Tampilan awal = **minggu berjalan** (berisi hari ini).
  - ‹ tidak bisa mundur sebelum minggu/bulan setup awal; › tidak bisa maju melewati minggu/bulan berjalan.
  - Disimpan di URL (`/laporan?grafik=minggu&dari=2026-10-06`), jadi tombol kembali di browser bekerja.
- **Batang bertumpuk** per menu, urut `menu.urutan`, dengan keterangan warna di bawah grafik. Angka di atas
  batang = total hari itu. Ketuk/hover batang → rincian per menu (atribut `title` cukup).
- **Grafik barang jadi**:
  - judul memakai kata **"perkiraan"**, dan satu baris penjelasan di bawah keterangan warna;
  - hanya sampai **tanggal tutup buku terakhir**; tanggal sesudahnya dibiarkan tidak terisi (tanpa label
    "belum tutup buku"). Di minggu/bulan yang sudah lewat, grafik selalu penuh;
  - warna sama terangnya dengan grafik racikan (tidak dipudarkan).
- Menu yang tidak punya penjualan di rentang itu tidak masuk keterangan warna.
- **Warna**: token baru per tema/gaya di `globals.css`, mis. `--grafik-1` … `--grafik-6` (boleh berangkat dari
  `--meter-1..3`), cukup kontras di tema terang & gelap. Lebih dari 6 menu → warna berulang.
- `laporan/loading.tsx`: sesuaikan kerangka (dua grafik).

## Dokumen
- `spec.md`: §4.4 Tutup Buku (langkah hari buka), §4.5 Laporan (grafik), §5 (pembagian per hari), §6 (kolom baru).
- `CLAUDE.md`: tidak ada yang perlu diubah selain bila ada jebakan baru.

## Kriteria selesai
- [x] Migrasi `hari_buka_json` (backup `local.db` dulu; beri tahu pengguna untuk `npm run db:migrate`).
- [x] Tes `calc.test.ts`: `bagiPerHari` (5/2 → 3+2, 2/3 → 1+1+0, negatif → 0) dan `hariBukaBawaan`
      (tutup buku 07.00, 12.00, 21.30 di kedua ujung periode).
- [x] Wizard Tutup Buku: centang bawaan sesuai aturan jam; hari yang dihapus centangnya tidak kebagian penjualan.
- [x] Laporan: dua grafik bertumpuk, Minggu/Bulan dan ‹ › menggeser keduanya; barang jadi berhenti di tutup
      buku terakhir; total barang jadi per periode di grafik = terjual di laporan periode itu.
- [x] `npx tsc --noEmit`, `npx eslint src`, `npm test` lulus.
- [x] Dicek di browser dengan `dummy.db` di **salinan folder terpisah** (jangan `next build` di folder yang
      dev server pengguna sedang jalan), tampilan HP (375px), tema terang & gelap.
- [x] `spec.md` diperbarui.
