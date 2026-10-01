# Window

Jendela ala aplikasi desktop retro: bilah judul kuning `sun` dengan tiga bulatan, isi `card-raised`. Dipakai untuk konfirmasi di halaman (pengganti `confirm()` browser) dan notifikasi "Batalkan".

- Bilah judul berisi pertanyaan singkat ("Hapus belanja?"). Untuk aksi yang menghapus data, bilah boleh `is-danger` (merah `bad`).
- Isi menyebut barangnya dengan angka nyata (nama, nominal, tanggal) dan akibatnya.
- Tombol di kanan bawah: "Batal" polos dulu, lalu aksinya. Aksi menghapus pakai `kp-btn-danger`.
- Tiga bulatan hanya hiasan (`aria-hidden`), bukan tombol tutup.
