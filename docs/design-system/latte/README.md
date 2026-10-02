Gaya ketiga aplikasi Kantin, diambil dari halaman kafe kopi: latar krem busa susu dengan lingkaran buram seperti foto yang tidak fokus, kartu kaca buram bersudut besar, tombol pil espresso dengan bayangan lembut, label harga pil yang menggantung di tepi kartu, dan aksen karamel. Nama token sama dengan Kantin Pop dan Kantin Poster, jadi aplikasi bisa berganti gaya tanpa mengubah halaman.

## Isi dan bahasa

- Bahasa Indonesia santai dengan kata pemilik kantin: "Catat", "Tutup buku", "Uang bersih", "Untung jualan", "Selisih", "Sendiri".
- Tombol berupa kata kerja pendek ("Simpan belanja", "Tutup buku"). Nama menu ditulis seperti di papan kafe: "Kopi Susu Gula Aren".
- Uang "Rp 412.000", selalu dengan `kp-num`. Naik/turun selalu bertanda + atau − dan kata ("+Rp 38.000 naik").
- Label kecil di atas judul boleh huruf kapital berjarak (`caption`), seperti "LET'S TALK" di referensi: "PERIODE BERJALAN".
- Tanpa emoji di tampilan baru.

## Warna

- Latar `bg` krem busa susu, ditimpa empat bulatan besar buram (krem terang, cokelat susu, karamel, mocha) dan butiran halus, seperti foto kafe yang tidak fokus. Tema gelap: espresso pekat dengan bulatan cokelat dan karamel redup.
- Isi duduk di kartu `card` krem 65% tembus pandang yang memburamkan latar, dengan kilau putih tipis di tepi (kaca buram). Bidang di dalam kartu memakai `card-raised`.
- `accent` espresso adalah warna aksi: tombol pil, label harga, navigasi bawah. Di tema gelap `accent` berubah jadi krem latte dan `accent-fg` jadi espresso, supaya aksi tetap paling menonjol.
- `accent-2` karamel untuk aksi kedua dan status "aktif"; `accent-3` crema hanya hiasan.
- `sun` karamel muda untuk sorotan: label harga positif, tombol "Batalkan" di toast, tombol "Tutup buku".
- `bad` merah bata untuk rugi dan hapus; `warn` untuk hampir habis; `good` hijau daun untuk untung.
- Semua pasangan teks ≥ 4.5:1 di kedua tema, dihitung: `fg` di `bg` 11.2:1, `muted` di `bg` 7:1 dan di titik bulatan tergelap ≥ 4.5:1, `accent-fg` di `accent-2` 5.6:1 (gelap 7.8:1), `good` di `card` 5.7:1. `outline` 3.2:1 hanya untuk tepi kontrol.

## Huruf

- Judul, angka, tombol, label harga: Rubik 600–700, bulat dan tebal seperti judul "Coffee The Best For You". Teks biasa: DM Sans. Keduanya dari Google Fonts; di Next.js dimuat dengan `next/font/google`.
- Satu angka besar `display` per layar langsung di atas `bg`, keterangan `muted` di bawahnya.
- Isian input 16px supaya HP tidak memperbesar layar.

## Bentuk, garis dan bayangan

- Sudut besar dan lembut: `radius-lg` 24px untuk kartu dan dialog, `radius-md` 16px untuk input dan ubin ikon, `radius-pill` untuk semua tombol, chip, tab dan navigasi.
- Tidak ada garis tepi di kartu, tombol berwarna dan chip (`stroke` 0). Garis tipis `stroke-thin` warna `outline` hanya di input dan tombol polos.
- Bayangan lembut ber-blur dengan rona espresso: `shadow-pop` di bawah tombol, chip dan label harga (hilang saat ditekan); `shadow-pop-lg` untuk kartu, dialog dan navigasi.
- Fokus keyboard: garis `accent` 3px (aplikasi) atau cincin karamel (input).

## Elemen khas

- **Label harga** (`kp-price`): pil espresso yang menggantung setengah di tepi bawah kartu ringkasan.
- **Cangkir dialog** (`kp-window-cup`): bulatan espresso berisi ikon yang mencuat dari tepi atas dialog.
- **Ubin ikon** (`kp-icon`): kotak krem membulat berisi ikon garis.
- **Bar kemasan berlapis** (`kp-meter`): butir pil espresso → karamel → crema.

## Tata letak

- Satu kolom, lebar maksimal 448px, margin samping `space-4`. Kartu ber-padding `space-5`, jarak antar kartu `space-3`, antar bagian `space-6`.
- Navigasi bawah berupa pil espresso mengambang; tab aktif pil krem.

## Ikon

- Ikon garis 22px, tebal 2, ujung membulat, warna mengikuti teks. Sama bentuknya dengan Kantin Pop (kopi, catatan, gembok, grafik, menu).
- Ikon di atas `accent` memakai `accent-fg`.

## Pemetaan ke kode

Nama token warna, jarak, sudut, bayangan dan `stroke` sama persis dengan Kantin Pop dan Poster; aplikasi cukup mengganti nilai token (dan dua keluarga huruf) lewat `data-gaya="latte"`. Bedanya ada di nilai bentuk: `stroke` 0, sudut besar, kontrol pil, bayangan ber-blur, latar lingkaran buram, kartu kaca buram, dan navigasi bawah gelap.
