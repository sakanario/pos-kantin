# Meter

Bar progres bersegmen 10 kotak, diambil dari bar "LOADING" pada gambar acuan. Dipakai untuk sisa kemasan bahan.

- Tiap segmen = 10%. Bulatkan ke atas supaya kemasan yang masih ada isinya tidak tampak kosong.
- Segmen terisi bergradasi `accent`, `accent-2`, `accent-3`. Di bawah 30% tambah `is-low`: semua segmen `warn`.
- Selalu tulis angkanya di bawah bar (`kp-hint`, "±15 cup lagi dari 25"); bar saja tidak cukup.
- Beri `role="progressbar"` dan `aria-valuenow`.
