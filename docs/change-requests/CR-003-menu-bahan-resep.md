# CR-003: Menu, bahan & resep (HPP otomatis dari harga belanja)

Status: **selesai** (2026-10-01)
Tanggal: 2026-10-01

## Latar belakang

Aplikasi sekarang hanya mengenal dua produk tetap (Kopi, Beng Beng). HPP kopi diisi manual di Setelan
(Rp7.000), padahal harga bahan berubah-ubah. Pengguna ingin:

1. Menjual menu lain (kopi susu panas, varian gula aren, snack selain Beng Beng).
2. HPP dihitung otomatis dari harga belanja bahan, mengikuti kemasan yang **sedang dipakai**.

Dengan data pengguna saat ini, HPP sebenarnya (Indocafe, cup 12 oz):

| Menu | Susu 100 gr | Kopi 4 gr | Creamer 10 gr | Pemanis 20 gr | Cup 12 oz | **HPP** |
|---|---|---|---|---|---|---|
| Kopi Susu SKM | 2.087 | 1.936 | 960 | SKM 748 | 442 | **6.173** |
| Kopi Susu Gula Aren | 2.087 | 1.936 | 960 | aren 1.120 | 442 | **6.545** |

(Dengan Nescafe Rp750/gr, kopi jadi Rp3.000 → SKM 7.237, aren 7.609.)

## Konsep

### Dua jenis menu
| | **Racikan** | **Barang jadi** |
|---|---|---|
| Contoh | Kopi Susu SKM, Kopi Susu Gula Aren, Kopi Susu Panas | Beng Beng, snack lain |
| Modal per item | HPP dari resep (bahan × takaran) | modal rata-rata tertimbang per pcs (rumus Beng Beng sekarang) |
| Stok | **tidak** dilacak | **dilacak**, sisa diinput tiap tutup buku |
| Tap terjual | ya (+1 / −1) | tidak (terjual = stok awal + beli − sendiri − sisa) |
| Tap sendiri | ya | ya |

- **Varian & ukuran beda = menu terpisah** dengan tombol tap sendiri (SKM vs gula aren, 12 oz vs 16 oz).
- Barang jadi dipisah jadi dua menu **hanya bila harga jualnya beda**. Beng Beng isi 17 dan isi 20 per
  dus = satu menu.
- Kopi **gratis / tester / terbuang** dicatat sebagai **sendiri** (tidak ada tombol terpisah).
- Menu bisa **dinonaktifkan**: hilang dari Beranda, form, dan tutup buku; riwayat tetap di laporan.
  Barang jadi nonaktif yang masih punya stok tetap muncul di tutup buku sampai stoknya 0.

### Bahan
- Satu bahan = satu **peran** dalam resep, dengan satuan `gr` atau `pcs`. Merek beda dengan takaran sama
  = **satu bahan** (Nescafe & Indocafe → "Kopi").
- Saat membuat bahan, pengguna mengisi **harga awal per satuan** (dipakai sampai ada pembelian aktif).
  Tidak ada lagi HPP manual.
- Bahan yang bukan bagian resep (es batu, plastik) dibuat sebagai bahan biasa yang tidak dipakai resep
  mana pun: tetap biaya, tidak memengaruhi HPP.

### Pembelian aktif (inti HPP)
Stok lama dihabiskan dulu baru pakai yang baru. Contoh: beli Kopi A Rp10.000, lalu Kopi B Rp5.000 saat A
belum habis → HPP tetap pakai harga A sampai pengguna mengganti ke B.

```
harga_bahan(t) = harga per satuan dari pembelian yang aktif pada waktu t
               = total / (jumlah_kemasan × isi_per_kemasan)
               (atau harga awal bahan bila belum ada pembelian aktif)

hpp_menu(t)    = Σ takaran(resep yang berlaku pada t) × harga_bahan(t)
```
- Mengganti pembelian aktif dicatat dengan **waktu mulai**. Tap sebelum waktu itu tetap memakai harga lama.
- Resep juga punya riwayat: mengubah resep berlaku sejak waktu diubah.

### Rumus per periode (pengganti rumus kopi/Beng Beng di `calc.ts`)
Untuk tiap **racikan** m:
```
terjual_m       = Σ delta tap terjual
sendiri_m       = Σ delta tap sendiri
omzet_seh_m     = Σ tap terjual × jual_m(t)
untung_m        = Σ tap terjual × (jual_m(t) − hpp_m(t)) − Σ tap sendiri × hpp_m(t)
nilai_sendiri_m = Σ tap sendiri × hpp_m(t)                     // info saja
```
Untuk tiap **barang jadi** b (rumus Beng Beng sekarang, per barang):
```
terjual_b   = stok_awal_b + beli_b − sendiri_b − sisa_b
avg_modal_b = (stok_awal_b × avg_lalu_b + belanja_b) / (stok_awal_b + beli_b)
omzet_seh_b = terjual_b × jual_b(saat tutup buku)
untung_b    = terjual_b × (jual_b − avg_modal_b) − sendiri_b × avg_modal_b
```
Total:
```
omzet_nyata     = (sama seperti sekarang)
uang_bersih     = omzet_nyata − B                                                  // sesuai CR-002
omzet_seharusnya = Σ omzet_seh semua menu
selisih         = omzet_nyata − omzet_seharusnya
untung_jualan   = Σ untung semua menu
```
- `calc.ts` tetap fungsi murni. HPP per tap dihitung oleh fungsi murni baru (misal `hppPada(...)` di
  `calc.ts` atau `src/lib/hpp.ts`) yang menerima resep, bahan, pembelian aktif, dan belanja. `data.ts`
  hanya memuat data.
- `HasilPeriode` berisi daftar per menu (`menu: { id, nama, jenis, terjual, sendiri, omzetSeharusnya,
  untung, … }[]`) + total. Field lama khusus kopi/Beng Beng dihapus. Semua snapshot lama diperbarui lewat
  "Hitung ulang semua laporan" (CR-002).

## Data model

Tetap tanpa foreign key di level DB (konsisten dengan desain sekarang), tapi tabel baru memakai `id`
referensi.

**Tabel baru**
- `bahan`: `id`, `nama`, `satuan` (`gr` | `pcs`), `harga_awal` (real, per satuan).
- `menu`: `id`, `nama`, `jenis` (`racikan` | `barang_jadi`), `aktif` (bool), `urutan` (int).
- `resep`: `id`, `menu_id`, `berlaku_mulai`, `isi_json` (`[{ bahanId, takaran }]`). Satu baris per versi;
  resep yang berlaku pada t = baris terakhir dengan `berlaku_mulai ≤ t`.
- `bahan_aktif`: `id`, `bahan_id`, `belanja_id` (null = harga awal), `mulai`. Pembelian aktif pada t =
  baris terakhir dengan `mulai ≤ t`.

**Tabel diubah**
- `harga`: `produk`/`jenis` diganti `menu_id`; hanya harga **jual** (riwayat tetap, tidak pernah ditimpa).
  Baris `hpp` dihapus.
- `tap_event`: `jenis` diganti `menu_id` + `jenis` (`terjual` | `sendiri`). `delta`, `manual` tetap.
- `belanja`: `kategori` menjadi `bahan` | `barang` | `lain`; tambah `bahan_id`, `menu_id` (barang jadi),
  `isi_kemasan` (real), `jumlah_kemasan` (int). `qty_pcs` tetap untuk barang jadi
  (= jumlah dus × isi per dus).
- `tutup_buku`: `sisa_bb` + `avg_modal_bb` diganti `stok_json` (`{ [menuId]: { sisa, avgModal } }`).
  Kolom lama boleh dibiarkan (tidak dipakai) bila lebih aman untuk migrasi.
- `settings.isi_per_dus` dihapus (isi per dus diisi di form belanja).

## Tampilan

### Lainnya → Bahan
```
Bahan
Susu         gr    Rp20,9/gr    Susu Ultra 1L · 28 Sep
Kopi         gr    Rp484/gr     Indocafe 100 gr · 28 Sep
...
[+ Bahan baru]
```
Detail bahan (tap baris):
```
Kopi · gr · dipakai di: Kopi Susu SKM, Kopi Susu Gula Aren
3 pembelian terakhir:
● Indocafe 100 gr   Rp484/gr   28 Sep   ← aktif sejak 28 Sep
○ Nescafe 20 gr     Rp750/gr   28 Sep   [Pakai ini]
Harga awal: Rp750/gr  [ubah]
```
"Pakai ini" → pilih tanggal mulai pakai (default sekarang; input mundur memakai aturan
`waktuDariTanggal`). Bila menyentuh periode yang sudah ditutup → `setelahUbah()`.

**Info "habis setelah N cup"** (setiap kali pembelian aktif diganti, termasuk dari pengingat dan form
belanja): tampilkan sekilas, misalnya
*"Creamer sebelumnya habis setelah 30 cup (perkiraan resep: 50 cup)."*
- N = Σ (terjual + sendiri) semua menu yang memakai bahan itu selama kemasan lama aktif.
- Perkiraan resep = (isi × jumlah kemasan) ÷ takaran.
- Hanya info; tidak mengubah apa pun. Tidak ditampilkan bila kemasan lama adalah "harga awal" (tanpa
  pembelian).

### Lainnya → Menu
Daftar menu aktif & nonaktif. Form menu:
```
Nama        Kopi Susu Panas
Jenis       [Racikan] [Barang jadi]
Harga jual  Rp8.000
Resep
  Susu        120 gr    Rp2.504
  Kopi          4 gr    Rp1.936
  SKM          20 gr      Rp748
  Cup panas     1 pcs     Rp400
  [+ bahan]
───────────────────────────────
HPP Rp5.588 · untung Rp2.412/cup (30%)
[Simpan]   [Nonaktifkan]
```
- HPP dan untung dihitung langsung saat mengetik (client), memakai harga bahan yang aktif sekarang.
- Barang jadi: hanya nama + harga jual.
- Ubah harga jual → baris baru di `harga` (berlaku sejak sekarang), seperti sekarang.
- Ubah resep → versi resep baru (berlaku sejak sekarang).
- Hapus dari Setelan: form HPP manual, form harga Beng Beng/Kopi, form isi per dus.

### Form belanja
```
Kategori      [Bahan] [Barang jadi] [Lain]

— Bahan —
Bahan         [Susu] [Kopi] [Creamer] [SKM] [Gula aren] [Cup 12oz] …
Nama barang   Susu Ultra 1L           ← dari belanja terakhir bahan ini
Isi/kemasan   1030 gr                 ← dari belanja terakhir bahan ini
Jumlah        2 kemasan
Total harga   Rp43.000
Dibayar dari  Kantong
☐ Langsung dipakai sekarang (kosongkan kalau stok lama masih ada)
ℹ Rp20,9/gr → Susu Rp2.087 per cup
  (bila dicentang: Kopi Susu SKM 6.173 → 6.173)

— Barang jadi —
Barang        [Beng Beng] …
Jumlah        2 dus × isi [17] pcs = 34 pcs     ← isi dari belanja terakhir barang ini
Total harga   Rp73.500
ℹ Rp2.162/pcs
```
- Pembelian **pertama** suatu bahan otomatis aktif (checkbox tidak ditampilkan).
- Pilihan bahan/barang memakai tombol + `<input type="hidden">` (jebakan form reset React 19, lihat
  CLAUDE.md). Isian yang terisi otomatis harus ikut kembali saat event `reset`.
- Edit/hapus belanja yang menjadi pembelian aktif: hapus → baris `bahan_aktif` terkait ikut dihapus (HPP
  kembali ke pembelian aktif sebelumnya), lalu `setelahUbah()`.

### Beranda
- Grid 2 kolom, satu kartu per menu aktif (urut `urutan`):
  - Racikan: jumlah hari ini, **+1 terjual**, **+1 sendiri**, −1 masing-masing.
  - Barang jadi: hanya **+1 sendiri** / −1.
- Kartu "Periode berjalan": terjual per racikan, stok tersedia per barang jadi, untung hari ini & periode
  ini (dari CR-002, sekarang dijumlah semua racikan).
- **Pengingat kemasan habis** (hanya bila ada pembelian yang lebih baru dari yang aktif):
  ```
  ☕ Nescafe kemungkinan sudah habis (perkiraan 5 cup, sudah 7 cup).
     Sudah pakai Indocafe?  [Ya, ganti]  [Belum]
  ```
  Perkiraan = (isi × jumlah kemasan) ÷ takaran, dibandingkan Σ (terjual + sendiri) semua menu yang
  memakai bahan itu sejak pembelian aktif dimulai. "Ya, ganti" = "Pakai ini" dengan waktu sekarang.
  "Belum" menyembunyikan pengingat sampai ada tap berikutnya yang menambah 20% lagi (atau cukup sampai
  hari berikutnya; pilih yang sederhana). Hanya pengingat, tidak pernah mengganti otomatis.

### Lainnya (CR-004)
- Tambah 🧂 **Bahan** dan 🍽️ **Menu** di daftar halaman Lainnya.
- Halaman **Uang & Barang**: daftar barang diisi dari `stok_json` semua barang jadi (sisa × modal
  rata-rata, potensi omzet & untung per barang). Baris "Sejak tutup buku" per barang.

### Catat → tab Kopi (input manual hari sebelumnya)
Pilih menu racikan + terjual/sendiri + jumlah.

### Tutup buku
Langkah 2 menjadi "Sisa stok": satu isian per barang jadi (aktif, atau nonaktif yang stoknya masih ada).

### Laporan & detail tutup buku
- Kartu "Omzet seharusnya vs nyata": satu baris per menu.
- Kartu "Untung jualan" (CR-002): satu blok per menu (terjual, sendiri, untung).
- Ringkasan bulanan: tambahan rincian per menu (terjual, untung).

### Setup awal (instalasi baru)
Disederhanakan: PIN + saldo awal Kantong. Menu & bahan dibuat di Lainnya sesudahnya. Barang jadi baru
mulai dengan stok 0 (stok bertambah dari belanja).

## Migrasi data

**Migrasi skema (generik, berlaku juga di produksi)**
1. Buat menu "Kopi" (racikan) dan "Beng Beng" (barang jadi). Salin riwayat harga jual `kopi` / `bb` ke
   `harga` dengan `menu_id` baru. Baris `hpp` dibuang.
2. `tap_event`: `kopi` → (Kopi, terjual), `kopi_sendiri` → (Kopi, sendiri), `bb_sendiri` → (Beng Beng,
   sendiri).
3. `belanja`: `bb` → `barang` (menu Beng Beng, `isi_kemasan` = `isi_per_dus`, `jumlah_kemasan` =
   `qty_pcs / isi_per_dus`); `kopi` → `bahan` dengan `bahan_id` **kosong**; `lain` tetap.
4. `tutup_buku`: `stok_json` = `{ [BengBeng]: { sisa: sisa_bb, avgModal: avg_modal_bb } }`.
5. Menu "Kopi" mendapat resep kosong sampai pengguna mengisinya.

**Langkah pengguna setelah migrasi (lewat aplikasi)**
- Lainnya → Menu: ganti nama "Kopi" → **"Kopi Susu SKM"**, isi resep. Buat menu **"Kopi Susu Gula Aren"**
  (racikan, Rp10.000).
- Lainnya → Bahan: buat bahan, lalu tandai belanja lama yang `bahan_id`-nya kosong. Halaman Bahan menampilkan
  daftar "Belanja bahan belum ditandai". Rujukan untuk data pengguna:

  | Belanja | Bahan | Isi/kemasan | Aktif |
  |---|---|---|---|
  | susu 1 L, Rp21.500 | Susu (gr) | 1.030 | ✓ |
  | nescafe ice froze 10pcs, Rp15.000 | Kopi (gr) | 20 | |
  | indocafe fine blend 100gr, Rp48.400 | Kopi (gr) | 100 | ✓ |
  | creamer 500gr, Rp48.000 | Creamer (gr) | 500 | ✓ |
  | susu kental manis indomilk, Rp20.000 | SKM (gr) | 535 | ✓ |
  | Gula aren cair 250 ml, Rp18.199 | Gula aren (gr) | 325 | ✓ |
  | cup 12oz 50 cup, Rp22.100 (dulu tertulis 8oz) | Cup 12oz (pcs) | 50 | ✓ |
  | Cup 16 oz 100 pcs, Rp58.762 | Cup 16oz (pcs) — dead stock, tidak di resep mana pun | 100 | ✓ |

- Pembelian aktif untuk data lama dimulai dari **awal** (waktu 0), supaya semua tap lama memakai HPP
  dari resep (Kopi Susu SKM Rp6.173), bukan HPP manual Rp6.428/Rp7.000.
- Semua tap kopi lama masuk menu Kopi Susu SKM (semua penjualan memang SKM; kopi gula aren yang pernah
  diminum/tester ikut tercatat sebagai "sendiri" SKM, selisih HPP Rp372/cup diabaikan).
- Terakhir: Setelan → "Hitung ulang semua laporan". **Backup `local.db` dulu.**

## Dokumen
- `spec.md`: §3 Produk (menu racikan & barang jadi), §4.1 Beranda, §4.2 Belanja, §4.4 Tutup buku,
  §4.6 Pengaturan (bahan, menu), §4.7 Setup, §5 Perhitungan (rumus per menu, HPP, pembelian aktif),
  §6 Data model.
- `CLAUDE.md`: bagian Arsitektur & Model data (tabel baru, `stok_json`, pembelian aktif).
- `scripts/seed-dummy.ts`: buat menu, bahan, resep, pembelian aktif, dan tap per menu.

## Kriteria selesai
- [x] Migrasi skema berjalan di salinan `local.db`; semua tap, belanja, dan tutup buku lama terbaca.
      Setelah "Hitung ulang", **uang bersih, omzet, dan selisih tiap periode tidak berubah** (tidak bergantung
      HPP); yang berubah hanya untung jualan.
- [x] Lainnya → Bahan & Menu: CRUD bahan (harga awal, 3 pembelian terakhir, "Pakai ini" + tanggal), CRUD menu (racikan
      dengan resep + preview HPP, barang jadi, nonaktif), daftar belanja bahan belum ditandai.
- [x] HPP Kopi Susu SKM = Rp6.173 dan Gula Aren = Rp6.545 pada data rujukan di atas.
- [x] Contoh pembelian aktif: beli Kopi B tanpa centang "langsung dipakai" → HPP tidak berubah; setelah
      "Pakai ini" → HPP berubah hanya untuk tap sesudah waktu mulai.
- [x] Form belanja bahan & barang jadi dengan isian terisi otomatis dari belanja terakhir.
- [x] Beranda: kartu tap per menu; pengingat kemasan habis muncul sesuai perkiraan.
- [x] Info "habis setelah N cup" muncul saat pembelian aktif diganti.
- [x] Tutup buku: sisa stok per barang jadi; laporan dan detail per menu.
- [x] Tes `calc` untuk: HPP dari resep + pembelian aktif (termasuk ganti di tengah periode), perubahan
      resep, untung per menu, dua barang jadi dengan stok masing-masing.
- [x] `npx tsc --noEmit`, `npx eslint src`, `npm test` lulus; `npm run seed:dummy` jalan.
- [x] Dicek di browser dengan `dummy.db`, tampilan HP (375px).
- [x] `spec.md` dan `CLAUDE.md` diperbarui.
