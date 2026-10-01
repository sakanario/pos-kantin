Gaya pop kuning–biru untuk aplikasi Kantin (pencatatan untung kopi racikan dan snack). Diambil dari ilustrasi bergaya UI retro: latar kuning berpola titik, panel krem bertepi navy tebal, tombol biru royal, bar "LOADING" bersegmen. Aplikasinya dipakai satu orang di HP, jadi semua aturan di bawah mengutamakan layar 375px dan jempol.

## Isi dan bahasa

- Semua teks dalam Bahasa Indonesia santai, kata yang dipakai pemilik kantin sehari-hari: "Catat", "Tutup buku", "Uang bersih", "Untung jualan", "Selisih", "Sendiri". Hindari istilah akuntansi (HPP, COGS) di layar.
- Tombol berupa kata kerja yang menyebut hasilnya: "Simpan belanja", "Tutup buku", "Hapus". Konfirmasi menyebut barang dan angkanya: "Belanja Susu UHT 1 L × 6 (Rp 108.000) tanggal 28 Sep akan dihapus."
- Uang ditulis "Rp 412.000": titik ribuan, tanpa desimal, selalu pakai kelas `kp-num` (tabular-nums) supaya angka sejajar.
- Naik/turun selalu dengan tanda + atau − dan kata ("+Rp 38.500 dari minggu lalu", "−Rp 6.000 kurang"). Jangan hanya mengandalkan warna `good`/`bad`.
- Tanpa emoji di tampilan baru. Navigasi dan tombol pakai ikon garis (lihat Ikon).

## Warna

- Latar halaman `bg` dengan pola titik `bg-dot` (kelas `kp-page`). Kuning di tema terang, navy malam di tema gelap.
- Semua isi duduk di kartu `card` (krem) bertepi `outline`. Teks `fg` dan `muted` hanya di `bg`, `card` atau `card-raised`.
- `accent` (biru royal) = aksi utama dan keadaan aktif: satu tombol primer per layar, tab bawah aktif, tautan. Teks di atasnya `accent-fg`.
- `sun` (kuning hoodie) = aksi besar kedua dan bilah judul jendela. Di tema terang jangan taruh `sun` langsung di atas `bg` kuning; taruh di atas `card`. Teks di atasnya `on-sun`.
- `accent-2` dan `accent-3` hanya untuk segmen bar progres dan hiasan, bukan teks.
- `good` untung, `bad` rugi/selisih kurang/koreksi, `warn` hampir habis (sebagai isian lencana, teksnya `on-sun`). `bad-soft` latar kotak galat.
- Semua pasangan teks lolos kontras 4.5:1 di kedua tema (`muted` di atas `bg` kuning ≈ 5.2:1, `accent` di atas `card` ≈ 6.6:1).

## Huruf

- Judul dan angka: Montserrat 700–800 (gaya `display`, `title`, `heading`, `number`). Satu angka besar `display` per layar, biasanya "Uang bersih".
- Teks: Plus Jakarta Sans (gaya `body`, `body-strong`, `small`, `caption`). Isian input 16px supaya HP tidak memperbesar layar.
- `caption` huruf besar dengan jarak huruf 0.06em untuk label di atas angka ("HARI INI").
- Keduanya dari Google Fonts. Di Next.js muat lewat `next/font/google` dan arahkan ke `--font-display` / `--font-body`.

## Bentuk, garis dan bayangan

- Ciri utama: tepi tebal `stroke` (3px) warna `outline` di kartu, tombol, input dan jendela; `stroke-thin` (2px) di chip dan lencana.
- Bayangan keras tanpa blur: `shadow-pop` (4px ke bawah) untuk tombol dan chip, `shadow-pop-lg` (8px) untuk kartu dan jendela. Saat ditekan tombol turun 4px dan bayangannya hilang.
- Sudut: `radius-lg` kartu/jendela, `radius-md` tombol/input, `radius-pill` chip, tombol tap +1, navigasi bawah.
- Pemisah baris di dalam kartu pakai `line` 1px, bukan `outline`.
- Fokus keyboard: garis `accent` 3px dengan jarak 3px.

## Tata letak

- Satu kolom, lebar maksimal 448px, margin samping `space-4`. Jarak antar kartu `space-3`, antar bagian `space-6`.
- Navigasi bawah (`kp-nav`) berupa pil mengambang `space-3` di atas tepi bawah layar.
- Target sentuh minimal 48px; tombol tap +1 96×56.
- Konfirmasi dan "Batalkan" memakai `kp-window` di dalam halaman, bukan `confirm()` browser.

## Ikon

- Ikon garis 22–24px, tebal 2.5px, ujung dan sudut membulat, warna mengikuti teks (`currentColor`), tanpa isian. Contoh lima ikon navigasi ada di komponen BottomNav.
- Belum ada set ikon resmi; ikon di BottomNav digambar khusus untuk sistem ini. Jika butuh lebih banyak, pakai set dengan gaya sama (mis. Lucide dengan `stroke-width` 2.5).

## Pemetaan ke kode

Token warna sengaja memakai nama yang sama dengan `src/app/globals.css` (`bg`, `card`, `fg`, `muted`, `line`, `accent`, `accent-fg`, `accent-soft`, `good`, `bad`), jadi kelas Tailwind yang sudah ada (`bg-card`, `text-muted`, `btn-primary`, …) langsung ikut berubah. Token baru: `bg-dot`, `card-raised`, `outline`, `accent-2`, `accent-3`, `sun`, `on-sun`, `bad-soft`, `warn`.
