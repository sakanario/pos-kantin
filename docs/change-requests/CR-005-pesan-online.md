# CR-005: Katalog menu, pesan online, payment gateway, antrean & notifikasi

Status: **siap dikerjakan** (pertanyaan terbuka sudah dijawab 2026-10-16)
Tanggal: 2026-10-13

## Latar belakang

Pengguna ingin pembeli bisa memesan sendiri: buka katalog di HP (tanpa login), pilih menu, isi nama, bayar
lewat payment gateway, lalu dapat nomor antrean. Saat order lunas, HP pengguna (Android) mendapat notifikasi.
Penjualan langsung (cash / QRIS GoPay / transfer) **tetap ada** seperti sekarang.

Dibuat **di app ini** karena menu, harga, dan stok sudah ada di sini. Halaman pembeli bersifat publik; halaman
lama tetap dikunci PIN. Hasil diskusi: `docs/diskusi.md` #12.

### Prinsip yang tetap berlaku

- Profit tetap dihitung dari **uang nyata saat tutup buku**. Order online **tidak** menambah saldo apa pun di
  app. Order online hanya dicatat sebagai penjualan, persis seperti tap +1.
- Saldo gateway = **kantong kedua**, diisi saat Tutup Buku. Saldo gateway sudah bersih dari potongan, jadi
  potongan otomatis mengurangi uang bersih dan **tidak** dicatat lagi sebagai belanja.
- Pencairan gateway ke Kantong Kantin **tidak dicatat** (gateway turun, Kantong naik, totalnya tetap).

Contoh 1 kopi Rp10.000 lewat app, potongan Rp70:
```
Tap terjual (otomatis)                      1 kopi
Saldo gateway naik                          Rp9.930
Omzet nyata (Kantong + gateway)             Rp9.930
Omzet seharusnya                           Rp10.000
Selisih                                        −Rp70 → semuanya potongan gateway, uang hilang Rp0
Untung jualan  1 × (10.000 − 7.000) − 70    Rp2.930
```

## Tahapan

Dikerjakan dan dicoba bertahap. Tahap 2 harus selesai **sebelum** order online dibuka untuk pembeli, supaya
uang di saldo gateway tidak luput dari tutup buku.

| Tahap | Isi | Bisa dicoba |
|---|---|---|
| 1 | Pengaturan katalog + halaman katalog (lihat saja, belum bisa pesan) | buka katalog di HP |
| 2 | Saldo gateway di Tutup Buku + potongan di laporan | tutup buku dengan saldo gateway 0 |
| 3 | Pesan, bayar (sandbox gateway dulu), antrean, tap otomatis, batal/refund | order uji coba |
| 4 | Web push ke HP pengguna | notifikasi saat order uji lunas |

## Tahap 1: Pengaturan katalog & halaman katalog

**Data**
- `menu`: kolom baru `di_katalog` (boolean, default false), `habis` (boolean, default false), `foto`
  (BLOB WebP mentah, nullable — **bukan** base64) dan `foto_versi` (integer, waktu foto terakhir diganti).
- Foto disajikan lewat route handler (mis. `/pesan/foto/[menuId]?v=<foto_versi>`) dengan
  `Cache-Control: public, max-age=31536000, immutable`; ganti foto → `foto_versi` berubah → URL baru.
- `settings.kantin_buka` (`"1"`/`"0"`).

**Halaman pengguna (pakai PIN)**
- Menu (`/lainnya/menu`, edit menu): sakelar **Tampil di katalog** dan **Foto** (ambil dari kamera / galeri).
  Foto dikecilkan di browser sebelum diunggah (mis. sisi terpanjang 800 px, WebP, ±50 KB).
- Beranda: sakelar besar **Kantin buka / tutup**, dan daftar singkat menu katalog dengan tombol **Habis / Ada**
  per menu (dipakai sehari-hari, misalnya susu habis). Berlaku untuk **semua** menu, termasuk barang jadi: app
  tidak tahu stok Beng Beng saat ini karena penjualan langsungnya tidak di-tap. Status habis **tidak** reset otomatis.
- Lainnya: **QR katalog**, halaman siap cetak berisi QR code ke `/pesan` untuk ditempel di meja kantin.

**Halaman publik `/pesan`** (tanpa login)
```
Kopi Ksatria                          ● Buka
─────────────────────────────────────
[foto]  Kopi Susu SKM          Rp10.000   [ + ]
[foto]  Kopi Susu Gula Aren    Rp12.000   Habis
[foto]  Beng Beng              Rp3.000    [ + ]
```
- Menu tanpa foto memakai gambar pengganti (ikon/emoji menu).
- Hanya menu `aktif && di_katalog`. Harga = harga jual yang berlaku sekarang.
- Saat kantin tutup: menu tetap tampil, tombol pesan nonaktif, tulisan "Kantin sedang tutup".
- Gaya tampilan Kantin Latte (satu-satunya gaya); terang/gelap mengikuti HP pembeli.
- `proxy.ts`: kecualikan `/pesan` (dan nanti rute webhook & `sw.js`) dari cek cookie sesi.

## Tahap 2: Saldo gateway & potongan

**Data**
- `tutup_buku`: kolom baru `saldo_gateway` (integer, default 0). Tutup buku lama = 0.

**Tutup Buku**
- Langkah 1 menjadi "Saldo": **Kantong Kantin** dan **Saldo gateway** (diketik manual; jika gateway terpilih
  punya API cek saldo, isi otomatis dan tetap bisa diubah, lihat Tahap 3).
- Input saldo gateway hanya tampil bila fitur pesan online sudah pernah dipakai (ada order lunas) atau saldo
  gateway terakhir ≠ 0.

**Rumus (`src/lib/calc.ts`)**
```
omzet_nyata    = (S1 + G1) − (S0 + G0) + (C − C0) − M + T + Bk     // G = saldo gateway
potongan       = Σ potongan order yang pernah lunas di periode (termasuk yang kemudian dibatalkan)
untung_jualan  = Σ untung semua menu − potongan
selisih        = omzet_nyata − omzet_seharusnya                     // tetap
uang_hilang    = selisih + potongan                                  // yang ditampilkan sebagai "uang hilang"
```
- Uang bersih tidak berubah rumusnya (potongan sudah ada di dalam saldo gateway).
- Potongan **tidak** dibagi per menu; tampil sebagai satu baris di untung jualan:
  ```
  ☕ Kopi Susu SKM                  +3.000
  💳 Potongan payment gateway          −70
  Untung jualan                     +2.930
  ```
- Kartu balik modal & Uang & Barang: `uang_kembali` memakai `saldo_kantong + saldo_gateway` terakhir.
- Tes rumus baru di `calc.test.ts` (contoh di atas + pencairan gateway → Kantong di tengah periode).

## Tahap 3: Pesan, bayar, antrean

**Gateway: Midtrans** (pendaftaran sedang review bisnis, per 2026-10-16). Tahap 3 dikerjakan di sandbox
Midtrans dulu; production menunggu review disetujui. Yang dicek sebelum lanjut: potongan QRIS, webhook
(notification URL + signature key), API cek saldo, cara pencairan & biayanya.

**Data (tabel baru)**
- `pesanan`: `id`, `kode` (acak, untuk link status), `nomor` (antrean, mulai 1 setiap hari WIB), `nama`,
  `status` (`menunggu_bayar` / `lunas` / `dibuat` / `siap` / `diambil` / `kedaluwarsa` / `batal`), `total`,
  `potongan`, `gateway_ref`, `perangkat` (id acak dari cookie pembeli), `dibuat`, `dibayar`, `kedaluwarsa_pada`,
  `refund_dari` (`kantong` / `pribadi`, saat batal setelah lunas).
- `pesanan_item`: `pesanan_id`, `menu_id`, `qty`, `harga` (harga saat order).
- `tap_event`: kolom baru `pesanan_id` (nullable) untuk tap yang dibuat dari order.

**Alur pembeli**
1. `/pesan`: pilih menu & jumlah → isi **nama** → **Bayar** → QRIS dinamis tampil (berlaku 15 menit).
2. Setelah bayar, halaman `/pesan/[kode]` menampilkan nomor antrean & status, diperbarui otomatis:
   ```
   Halo, Budi!
   Nomor antrean   #7
   ● Lunas → ○ Dibuat → ○ Siap → ○ Diambil
   1× Kopi Susu SKM   Rp10.000
   ```
   Link disimpan di cookie perangkat, jadi pembeli bisa membuka lagi order miliknya dari `/pesan`.
3. Satu perangkat maksimal **3 order belum bayar**. Order belum bayar kedaluwarsa setelah 15 menit.

**Webhook gateway** (`/api/gateway`): verifikasi tanda tangan gateway; idempoten (notifikasi ganda tidak
mencatat dua kali). Saat **lunas**:
- Simpan `dibayar` & `potongan`, status `lunas`.
- Racikan: buat `tap_event` `terjual`, `delta = qty`, `waktu = dibayar`, `pesanan_id`. Masuk ke angka
  "terjual hari ini" di Beranda seperti tap biasa.
- Barang jadi: **tidak** membuat tap (terjual barang jadi dihitung dari sisa stok saat tutup buku; Beng Beng
  yang dijual online sudah otomatis tidak ada di sisa).
- Jika waktu bayar jatuh di periode yang sudah ditutup → `hitungUlangSejak()`.
- (Tahap 4) kirim notifikasi.

**Halaman pengguna `/pesanan`** (pakai PIN; dibuka dari kartu "Pesanan" di Beranda yang menampilkan jumlah
order aktif)
```
Pesanan aktif
#7  Budi    1× Kopi Susu SKM            Lunas   [Dibuat]
#6  Sari    2× Beng Beng                Dibuat  [Siap]
#5  Andi    1× Kopi Susu Gula Aren      Siap    [Diambil]
```
- Satu tombol untuk maju ke status berikutnya. Riwayat order selesai/batal bisa dilihat per hari.
- **Batalkan** (order lunas yang tidak bisa dibuat): refund dilakukan manual oleh pengguna, lalu app bertanya
  "Uang refund dari mana?":
  - **Kantong Kantin**: hapus tap order itu. Saldo Kantong turun sendiri saat refund → uang bersih benar.
  - **Uang pribadi**: hapus tap order itu dan buat catatan **setor modal** sebesar total order (uang order
    tetap di saldo gateway, tapi bukan penjualan).
  - Potongan order batal **tetap biaya** (gateway tidak mengembalikannya): tetap dihitung di `potongan`
    periode itu dan mengurangi untung jualan. Rumus Tahap 2 memakai "Σ potongan order lunas di periode,
    termasuk yang kemudian dibatalkan".

## Tahap 4: Web push

- Service worker `public/sw.js`, kunci VAPID di env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), paket `web-push`.
- Tabel baru `push_langganan` (endpoint, kunci, dibuat). Bisa lebih dari satu perangkat.
- Setelan: tombol **Aktifkan notifikasi pesanan di HP ini** (+ tombol kirim notifikasi uji).
- Saat order lunas: *"Pesanan #7 · Budi · 1× Kopi Susu SKM"*, ketuk → `/pesanan`.
- Langganan yang ditolak server push (410) dihapus otomatis.

## Keputusan (2026-10-13)

- Semua menu ditandai **Habis manual** (stok Beng Beng tidak diketahui sebelum tutup buku).
- Potongan order yang dibatalkan **tetap biaya**.
- Katalog **pakai foto** menu.
- Pembeli membuka katalog lewat link `/pesan` dan **QR code** di meja kantin.

## Pertanyaan terbuka

- [x] **Tempat menyimpan foto**: di database (Turso), kolom BLOB (dijawab 2026-10-16).
- [x] **Gateway**: Midtrans, sedang review bisnis (dijawab 2026-10-16).

## Dokumen
- `spec.md`: §1 & §2 (alur uang: gateway sebagai kantong kedua), §4 (Beranda: buka/tutup, habis, kartu
  pesanan; halaman pesanan; katalog publik), §4.4 Tutup Buku, §5.3/5.3b/5.4 (rumus), §6 (tabel baru),
  §8 (halaman publik), §9 (hapus "rekap per transaksi" untuk order online).
- `CLAUDE.md`: Arsitektur (rute publik, tabel baru), prinsip bisnis (order online = tap, saldo gateway).

## Kriteria selesai

Tahap 1
- [ ] Sakelar tampil di katalog, habis, kantin buka/tutup, dan foto tersimpan dan tampil benar di `/pesan`.
- [ ] QR katalog bisa dicetak dan membuka `/pesan` saat dipindai.
- [ ] `/pesan` bisa dibuka tanpa login; halaman lain tetap minta PIN.

Tahap 2
- [ ] Migrasi `saldo_gateway`; hasil semua tutup buku lama tidak berubah setelah hitung ulang.
- [ ] Tes `calc.test.ts`: contoh Rp10.000/Rp70 → untung jualan 2.930, uang bersih 9.930, uang hilang 0.

Tahap 3
- [ ] Order uji di sandbox: bayar → lunas → tap terjual muncul di Beranda → status bisa dimajukan sampai Diambil.
- [ ] Webhook ganda tidak mencatat dua kali; tanda tangan palsu ditolak.
- [ ] Order kedaluwarsa setelah 15 menit; perangkat ke-4 order belum bayar ditolak.
- [ ] Batal (refund dari Kantong / pribadi) menghapus tap dan (pribadi) membuat setor modal.

Tahap 4
- [ ] Notifikasi muncul di HP Android pengguna saat order uji lunas; ketuk membuka `/pesanan`.

Semua tahap
- [ ] `npx tsc --noEmit`, `npx eslint src`, `npm test` lulus.
- [ ] Dicek di browser dengan `dummy.db`, tampilan HP (375px).
- [ ] `spec.md` dan `CLAUDE.md` diperbarui.
