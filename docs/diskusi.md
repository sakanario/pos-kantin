# Daftar diskusi (belum disepakati)

Fitur dan pertanyaan yang masih perlu dibahas sebelum dijadikan change request.
Yang sudah disepakati pindah ke `docs/change-requests/`. Terakhir diperbarui: 2026-10-13.

---

## ✅ 1. Fitur Menu (bahan, resep, HPP otomatis) → `CR-003-menu-bahan-resep.md`

## ✅ 2. HPP kopi → masuk CR-003

- Semua penjualan selama ini **Kopi Susu SKM**; gula aren baru diminum sendiri / tester.
- HPP manual di Setelan **dihapus** di CR-003 (HPP mengikuti harga belanja bahan). Sampai CR-003 selesai,
  HPP manual Rp7.000 dibiarkan apa adanya.

## 3. Saldo minimal Kantong — ditunda

Rumus yang dibahas: uang yang harus ada untuk belanja ulang sebelum uang dari jualannya kembali.
Tebakan kasar ±Rp150rb; angka pasti butuh data 2–3 minggu.

- [ ] Ditentukan manual oleh pengguna, atau otomatis dari rata-rata belanja N minggu terakhir?

## 4. "Boleh diambil" (take profit) — menunggu saldo minimal

```
boleh_diambil = saldo Kantong − saldo minimal
```
- Sebelum BEP: uang yang diambil = **balik modal** (mengurangi "sisa modal belum kembali").
- Sesudah BEP: = **profit**.
- [ ] Disepakati bersama saldo minimal.

## ✅ 5. Profit per tutup buku → masuk CR-002

Profit lama (uang + stok Beng Beng) **dihapus**. Tiap periode: **untung jualan** (angka utama) dan
**uang bersih** (= omzet nyata − belanja; dijumlah = kartu BEP). Nilai stok tidak masuk angka mana pun.

## ✅ 5b. Inventaris → `CR-004-tab-lainnya-uang-barang.md`

Tab Setelan diganti "Lainnya" (☰): Uang & Barang (saldo + modal barang + potensi omzet & untung),
Riwayat Pengeluaran, Setelan. Laporan fokus ke laporan.

## ✅ 6. Kategori "Lain" → masuk CR-002

Nama tetap "Lain" (tidak diganti). Tidak masuk untung jualan, tetap masuk uang bersih & BEP.

## ✅ 7. BEP investasi baru → masuk CR-002

Cukup BEP total. Tidak ada BEP per alat, daftar alat, maupun perkiraan "±N hari lagi".

## ✅ 8. Membandingkan cara A vs B → tidak dibuat

Selisih A vs B tercampur stok, alat, selisih uang, dan kebocoran, jadi tidak informatif. Tombol
"Catat terbuang" dan cek per bahan kumulatif juga **tidak dibuat** (khawatir repot kalibrasi).
Kebocoran (tumpah, diminta teman, takaran tidak stabil) cukup terlihat di uang bersih & BEP; perkiraan
per kemasan otomatis bersih lagi setiap "Pakai ini". Teman minta kopi = tap "sendiri".
Tambahan ke CR-003: info "habis setelah N cup" saat ganti kemasan.

## ✅ 9. Perkiraan stok bahan kopi → tidak dibuat

Hanya hitungan per kemasan aktif untuk pengingat habis & info "habis setelah N cup" (CR-003).

## ✅ 10. Buka kemasan baru saat kemasan lama masih ada sisa → tanpa pertanyaan

Tidak ada pertanyaan saat "Pakai ini". Info "habis setelah N cup" tetap ditampilkan apa adanya (pengguna
sendiri yang ingat bila kemasan digabung). Efek ke HPP diabaikan (beberapa ratus rupiah).

## ✅ 11. Susu tercatat 1 L, tapi sudah 13 cup × 100 gr → tidak ada belanja yang terlewat

Beberapa kali susu dibuat dengan takaran lebih sedikit. Belanja lengkap, jadi uang bersih & BEP akurat.
Takaran resep tetap 100 gr (worst case).

## ✅ 12. Katalog menu + pesan online + payment gateway + notifikasi → `CR-005-pesan-online.md`

Dibuat di app ini (halaman publik `/pesan`). Order online = tap terjual (tidak mengubah saldo); saldo gateway =
kantong kedua di Tutup Buku; potongan sudah ada di saldo gateway, ditampilkan sebagai penjelasan selisih dan
mengurangi untung jualan. Antrean + nama tanpa login, kantin buka/tutup, web push (Android).

## ✅ 13. Grafik barang jadi terjual per hari (perkiraan) → `CR-006-grafik-harian.md`

Terjual per periode dibagi (dibulatkan) ke hari buka yang dicentang saat Tutup Buku (aturan jam 08.00 / 21.00).
Grafik racikan & barang jadi bertumpuk per menu, geser Minggu/Bulan bersama, barang jadi berhenti di tutup buku terakhir.
