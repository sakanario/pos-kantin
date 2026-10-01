Gaya kedua aplikasi Kantin, diambil dari poster bergaya kolase UI: latar kuning mustard bertekstur kertas, label-tag arang berteks putih dengan kotak centang putih, kartu putih tanpa garis tepi, huruf sempit tebal, dan aksen hijau jaket serta merah pita. Nama token sama dengan Kantin Pop, jadi aplikasi bisa berganti gaya tanpa mengubah halaman.

## Isi dan bahasa

- Bahasa Indonesia santai dengan kata pemilik kantin: "Catat", "Tutup buku", "Uang bersih", "Untung jualan", "Selisih", "Sendiri".
- Label-tag dan tombol ditulis singkat, huruf awal kapital ("Simpan belanja", "Kopi Susu SKM"), seperti nama di poster.
- Uang "Rp 412.000", selalu dengan `kp-num`. Naik/turun selalu bertanda + atau − dan kata.
- Tanggal ditulis lengkap di bawah angka besar ("Sabtu, 26 Sep – Jumat, 2 Okt"), seperti tanggal di bawah jam pada poster.
- Tanpa emoji di tampilan baru.

## Warna

- Latar `bg` kuning mustard dengan tekstur kertas tipis (kelas `kp-page`) dan bentuk besar samar `bg-dot`. Tema gelap: arang hangat.
- Isi duduk di kartu putih `card` tanpa garis tepi. Bidang di dalam kartu memakai `card-raised` (kertas).
- `accent` arang adalah warna aksi: label-tag, tombol utama, angka di bilah stat. Di tema gelap `accent` berubah jadi kuning dan `accent-fg` jadi arang, supaya aksi tetap paling menonjol.
- `sun` kuning menandai yang aktif: tab bawah aktif, garis hiasan di kartu. Di tema terang `sun` tidak dipakai di atas `bg`.
- `accent-2` hijau jaket untuk status "aktif" dan aksen kedua; `bad` merah pita untuk rugi dan hapus; `warn` untuk hampir habis.
- Pasangan teks memenuhi 4.5:1 di kedua tema (`muted` di atas `bg` ≈ 5.5:1; `good` hanya di atas `card`, karena di atas `bg` kuning ≈ 3.4:1).

## Huruf

- Judul, angka, tag, tombol: Barlow Condensed 600–700. Teks biasa: Barlow. Keduanya dari Google Fonts; di Next.js muat dengan `next/font/google` ke `--font-display` dan `--font-body`.
- Satu angka besar `display` per layar langsung di atas `bg`, dengan keterangan `caption` di bawahnya.
- Isian input 16px supaya HP tidak memperbesar layar.

## Bentuk, garis dan bayangan

- Sudut kecil: `radius-sm` 4px untuk tag, lencana, kotak centang; `radius-md` 6px tombol dan input; `radius-lg` 10px kartu, dialog, navigasi. Hampir tidak ada bentuk pil.
- Kartu dan tombol berwarna tidak bergaris tepi (`stroke` 0). Garis tipis `stroke-thin` warna `outline` hanya di input, kotak centang dan tombol putih.
- Bayangan lembut ber-blur: `shadow-pop` untuk tag dan tombol (mengecil saat ditekan), `shadow-pop-lg` untuk kartu dan dialog.
- Fokus keyboard: garis `accent-2` 3px.

## Tata letak

- Satu kolom, lebar maksimal 448px, margin samping `space-4`. Jarak antar kartu `space-3`, antar bagian `space-6`.
- Label-tag boleh ditumpuk vertikal rata kiri dengan jarak `space-2`, seperti daftar nama di poster.
- Dialog memakai tag judul yang menempel di tepi atas kartu.
- Navigasi bawah berupa bilah putih mengambang; tab aktif kotak kuning.

## Ikon

- Ikon garis 22px, tebal 2, ujung membulat, warna mengikuti teks. Sama bentuknya dengan Kantin Pop (kopi, catatan, gembok, grafik, menu), lebih tipis.
- Ikon di atas `accent` memakai `accent-fg`, seperti jempol putih di kotak arang pada poster.

## Pemetaan ke kode

Nama token warna, jarak, sudut, bayangan dan `stroke` sama persis dengan Kantin Pop. Untuk berganti gaya, aplikasi cukup mengganti nilai token (dan dua keluarga huruf). Bedanya ada di nilai bentuk: `stroke` 0, sudut kecil, bayangan ber-blur, dan pola latar kertas, bukan titik.
