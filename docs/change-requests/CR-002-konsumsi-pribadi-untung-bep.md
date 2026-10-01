# CR-002: Konsumsi pribadi jadi biaya, "untung jualan", "uang bersih", dan kartu BEP

Status: **selesai** (2026-10-01)
Tanggal: 2026-10-01

## Latar belakang

Data pengguna per 1 Okt 2026 (4 hari jualan):

- Total belanja Rp339.259 (semua dari uang pribadi), saldo Kantong naik 0 → Rp125.000.
- Uang nyata: 125.000 − 339.259 = **−Rp214.259**.
- Jumlah profit 4 tutup buku di aplikasi: **−Rp137.339**. Bedanya Rp76.920 =
  stok Beng Beng sisa Rp21.618 + konsumsi pribadi "dikembalikan" **Rp55.302**.

Pengguna bingung karena kopi/Beng Beng yang dikonsumsi sendiri malah **menambah** profit
(`nilai_pribadi` dianggap "tarik barang"). Bagi pengguna, kopi yang diminum = bahan habis, uang tidak
kembali → harus **mengurangi** untung.

Contoh dari pengguna (harga jual 10.000, HPP 7.000):
> Jual 3 kopi → untung 3 × 3.000 = 9.000. Minum 1 kopi → −7.000. Untung hari itu **2.000**.
> (Aplikasi sekarang akan bilang 9.000.)

Tiga pertanyaan yang ingin dijawab pengguna: (1) sudah BEP belum, (2) saldo minimal Kantong
(ditunda, lihat `docs/diskusi.md`), (3) berapa yang bisa diambil (ditunda).

### Dua cara menghitung untung (disepakati)

| | **Cara A: untung jualan (per cup)** | **Cara B: uang nyata** |
|---|---|---|
| Rumus | tiap item terjual: harga jual − modal; tiap item dikonsumsi sendiri: − modal | uang masuk − uang keluar |
| Sifat | perkiraan (bergantung HPP), rata per hari | pasti, tapi naik-turun mengikuti hari belanja |
| Dipakai untuk | untung harian / mingguan / per periode | BEP, posisi uang |

Dalam jangka panjang keduanya sama bila HPP akurat. HPP diisi **worst case**, jadi untung asli boleh
lebih besar dari cara A.

### Profit lama dihapus (keputusan topik 5, 2026-10-01)

Profit lama = uang nyata + perubahan nilai stok Beng Beng. Angka ini setengah perkiraan (stok Beng Beng
dihitung sebagai aset) dan setengah uang nyata (stok bahan kopi, alat, dead stock tidak). Setelah ada
cara A, angka ini tidak punya peran dan hanya menambah bingung. Tiap periode cukup **dua angka**:

| | Arti | Data pengguna (total 4 periode) |
|---|---|---|
| **Untung jualan** (cara A) — **angka utama** | "jualannya untung nggak?" | −21.022 (HPP manual) / −13.131 (HPP resep CR-003) |
| **Uang bersih** (cara B) | "uangku nambah berapa?" Dijumlah = kartu BEP | −214.259 |

Nilai stok Beng Beng tidak masuk angka mana pun; ditampilkan terpisah sebagai inventaris.

## Perubahan 1: Konsumsi pribadi = biaya

**Rumus (`src/lib/calc.ts`)**
```
uang_bersih = omzet_nyata − B          // pengganti `profit`
```
- Field `profit` **dihapus**, diganti `uangBersih`. Tidak ada lagi `+ nilai_pribadi` maupun
  `+ (nilai_stok_akhir − nilai_stok_awal)`.
- `nilaiPribadiKopi`, `nilaiPribadiBb`, `nilaiPribadi` **tetap dihitung** sebagai info ("berapa yang kamu
  konsumsi"). Konsumsi sendiri sudah mengurangi untung jualan (Perubahan 2).
- `nilaiStokAwal`, `nilaiStokAkhir`, `avgModalBb` tetap dihitung (dipakai untung jualan & inventaris).
- Rumus stok Beng Beng terjual, omzet seharusnya, dan selisih **tidak berubah** (deteksi uang hilang
  tetap sama).

**Tampilan (`src/components/hasil-view.tsx`)**
Kartu "Profit" diganti kartu "Uang bersih":
```
Uang bersih
Omzet nyata (dari saldo)       59.000
Belanja                            −0
  Beng Beng / Bahan kopi / Lain-lain
──────────────────────────────────────
Uang bersih                   +59.000
```
- Hapus baris "Perubahan nilai stok Beng Beng" dan "Konsumsi pribadi (dikembalikan)".
- Kartu "Untung jualan" (Perubahan 2) diletakkan **di atas** kartu ini sebagai angka utama.

**Hitung ulang data lama**
- Snapshot `hasil_json` lama memakai rumus lama. Mengubah rumus **tidak** memperbarui snapshot.
- Tambah tombol di Setelan: **"Hitung ulang semua laporan"**, yang memanggil `hitungUlangSejak(0)`
  (server action, `requireAuth()`), lalu tampilkan "N laporan dihitung ulang". Tombol ini juga berguna
  setelah data diubah langsung di DB.
- Setelah deploy, jalankan tombol ini sekali di lokal (`local.db`, **backup dulu**) dan di produksi.

**Contoh hasil pada data pengguna** (untuk verifikasi; untung jualan memakai HPP manual
Rp6.428 sebelum 29 Sep 23.32 WIB, sesudahnya Rp7.000):

| Tutup buku | Profit lama | **Untung jualan** | **Uang bersih** |
|---|---|---|---|
| #4 | −149.259 | −5.312 | −216.159 |
| #5 | −44.110 | −14.740 | −46.100 |
| #6 | −10.485 | −4.485 | −11.000 |
| #7 | +66.515 | +3.515 | +59.000 |
| **Total** | **−137.339** | **−21.022** | **−214.259** |

## Perubahan 2: Untung jualan (cara A)

**Rumus baru di `hitungPeriode`** (HPP kopi = harga `kopi/hpp` yang berlaku saat tap, harga jual kopi
saat tap, seperti omzet seharusnya):
```
untung_kopi    = Σ tap kopi × (jual_kopi(t) − hpp_kopi(t)) − Σ tap kopi_sendiri × hpp_kopi(t)
untung_bb      = bb_terjual × (harga_jual_bb − avg_modal) − bb_sendiri × avg_modal
untung_jualan  = untung_kopi + untung_bb
```
- Field baru di `HasilPeriode`: `untungKopi`, `untungBb`, `untungJualan` (dibulatkan).
- `profitBb` dan `profitKopi` lama (kartu "Per produk (teoretis)") **diganti** oleh field baru ini.
  `profitKopi` lama memakai belanja bahan kopi (campuran cara B) dan menambahkan kopi sendiri, jadi
  membingungkan. Hapus dari tipe dan tampilan.
- Belanja kategori "lain" (hampir selalu alat / capex) **tidak** masuk untung jualan, tapi tetap masuk
  uang bersih dan BEP.

**Tampilan detail tutup buku (`hasil-view.tsx`)**
Ganti kartu "Per produk (teoretis)" menjadi (angka = tutup buku #7 pengguna):
```
Untung jualan (perkiraan per cup)
☕ Kopi                                   +1.000
   5 terjual × (10.000 − 7.000)         +15.000
   2 diminum sendiri × 7.000            −14.000
🍫 Beng Beng                             +2.515
   3 terjual × (3.000 − 2.162)           +2.515
   0 dimakan sendiri
──────────────────────────────────────────
Untung jualan                            +3.515
```
Bila ada belanja alat di periode itu, tampilkan di bawahnya:
`📦 Belanja lain-lain −13.798 (masuk balik modal, bukan untung jualan)`.
Teks kecil: *"Pakai HPP worst case dari Setelan. Untung sebenarnya bisa lebih besar."*

**Beranda (`src/app/(app)/page.tsx`, kartu "Periode berjalan")**
Tambah dua baris:
```
Untung kopi hari ini        +2.000   (3 terjual, 1 diminum)
Untung kopi periode ini    +12.000
```
- Hitung di `src/lib/data.ts` (bukan di render; lihat jebakan `Date.now()` di CLAUDE.md), pakai
  `hargaPada` dari `calc.ts` agar harga/HPP per waktu tap sama dengan rumus tutup buku.
- Beng Beng terjual baru diketahui saat tutup buku, jadi untung harian hanya kopi. Beng Beng yang
  dimakan sendiri **dikurangkan** (`bb_sendiri × avg_modal` terakhir). Tambahkan teks kecil:
  *"Untung Beng Beng dihitung saat tutup buku."*

**Laporan (`src/app/(app)/laporan/page.tsx`)**
- Daftar tutup buku dan ringkasan bulanan: **untung jualan** sebagai angka utama, **uang bersih** sebagai
  angka kedua yang lebih kecil. Ringkasan bulanan menjumlahkan `untungJualan` dan `uangBersih`
  (bukan `profit`).

## Perubahan 3: Kartu BEP di Beranda

**Konsep**
Uang nyata saja, tanpa menghitung stok di lemari. Dihitung sampai **tutup buku terakhir** (karena saldo
hanya diketahui saat tutup buku, sama seperti kartu saldo CR-001).
```
modal_masuk  = saldo_awal_setup + cash_awal_setup + Σ setor + Σ belanja dari uang pribadi
uang_kembali = saldo_kantong_terakhir + cash_terakhir + Σ tarik
posisi       = uang_kembali − modal_masuk
```
- Semua Σ = catatan dengan `waktu ≤ tutup buku terakhir`, **termasuk** catatan bertanggal sebelum setup
  (periode pertama mulai dari 0).
- Pemeriksaan: `posisi` = Σ `uangBersih` semua periode. Pada data pengguna:
  −216.159 − 46.100 − 11.000 + 59.000 = −214.259. Jadikan tes.
- Data pengguna saat ini: modal_masuk = 0 + 339.259, uang_kembali = 125.000 → **posisi −214.259**.

**Tampilan**
Sebelum BEP (`posisi < 0`):
```
Balik modal
Sisa modal belum kembali
Rp214.259
dari total modal Rp339.259 · per tutup buku 1 Okt
[██████░░░░░░░░░░] 37%
```
Sesudah BEP (`posisi ≥ 0`):
```
🎉 Sudah balik modal
Untung bersih sejak mulai
Rp50.000
per tutup buku 15 Okt
```
- Teks kecil: *"Hanya uang nyata. Stok yang masih ada belum dihitung."*
- Bila ada belanja dari uang pribadi / setor **setelah** tutup buku terakhir, tampilkan:
  *"+ Rp48.000 belanja pribadi sejak itu, masuk di tutup buku berikutnya."*
- Bila belum pernah tutup buku (hanya setup), tampilkan modal masuk saja tanpa progress.
- Letak: Beranda, setelah kartu saldo. Fungsi data baru di `src/lib/data.ts`, misalnya `getBep()`.
  Bagian murni (rumus `posisi`) taruh di `calc.ts` agar bisa dites.

## Keputusan terkait (tanpa perubahan kode)
- Mulai sekarang belanja ulang dibayar dari **uang Kantong**. Default "Dibayar dari" di form belanja
  sudah "kantong", tidak perlu diubah.
- Saldo minimal dan "boleh diambil" **ditunda** (lihat `docs/diskusi.md`).
- Kategori belanja tetap bernama **"Lain"** (tidak diganti label). Barang habis pakai yang dipakai per cup
  (sedotan, tutup) sebaiknya masuk resep (CR-003); sebelum CR-003 dicatat di Bahan Kopi.
- BEP **hanya total** (tidak per alat, tanpa daftar alat, tanpa perkiraan "±N hari lagi"). Membeli alat
  dari Kantong otomatis menaikkan lagi "sisa modal belum kembali".

## Dokumen
- `spec.md` §5.3 (profit → uang bersih; konsumsi pribadi = biaya), §5.4 (ganti
  `profit_bb`/`profit_kopi` dengan untung jualan), §5.5 (contoh laporan), §4.1 (Beranda: untung kopi
  hari ini, kartu BEP), §4.5 (Laporan), §4.6 (tombol hitung ulang).

## Kriteria selesai
- [x] `calc.ts`: `profit` diganti `uangBersih` (= omzet nyata − belanja); field `untungKopi`, `untungBb`,
      `untungJualan`; `profitBb`/`profitKopi` dihapus; rumus `posisi` BEP sebagai fungsi murni.
- [x] `calc.test.ts` diperbarui + tes baru: contoh pengguna (3 terjual, 1 diminum → untung kopi 2.000),
      dan tes posisi BEP.
- [x] Tombol "Hitung ulang semua laporan" di Setelan berjalan; pada salinan `local.db`, angka tiap periode
      sesuai tabel di atas (total untung jualan −21.022, uang bersih −214.259).
- [x] Beranda menampilkan untung kopi hari ini & periode ini, dan kartu BEP (−214.259 pada data pengguna).
- [x] Detail tutup buku: kartu "Untung jualan" (utama) lalu "Uang bersih"; baris "Perubahan nilai stok"
      dan "Konsumsi pribadi (dikembalikan)" hilang. Laporan memakai untung jualan sebagai angka utama.
- [x] `scripts/seed-dummy.ts` mencetak untung jualan & uang bersih (bukan `profit`).
- [x] `scripts/seed-dummy.ts` masih jalan (memakai `calc.ts` yang sama).
- [x] `npx tsc --noEmit`, `npx eslint src`, `npm test` lulus.
- [x] Dicek di browser dengan `dummy.db` (lihat CLAUDE.md → Verifikasi), tampilan HP (375px).
- [x] `spec.md` diperbarui.
