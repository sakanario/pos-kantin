# CR-001: Tampilkan saldo terakhir & hapus langkah "setor cash" di Tutup Buku

Status: **selesai** (2026-09-28)
Tanggal: 2026-09-28

## Latar belakang

1. Langkah "1. Setor cash dulu" di wizard Tutup Buku berisi checkbox "Sudah ditransfer ke kantong" dan
   input "cash belum disetor". Pengguna selalu menyetor cash sebelum tutup buku dan tidak akan pernah
   memakai input cash, sehingga langkah ini hanya menambah klik.
2. Pengguna tidak bisa melihat saldo Kantong Kantin yang tercatat. Setelah mencatat Tarik Rp 500.000,
   tidak ada tempat yang menunjukkan saldo terakhir maupun efek tarik tersebut.

## Perubahan 1: Hapus langkah "setor cash" dari wizard Tutup Buku

**Yang diubah**
- `src/app/(app)/tutup-buku/wizard.tsx`: hapus seluruh section "1. Setor cash dulu" (checkbox
  `cashSudahDisetor` dan `RupiahInput name="cash"`), beserta state-nya. Penomoran langkah menjadi:
  1. Saldo Kantong Kantin, 2. Sisa Beng Beng.
- Nilai `cash` yang dikirim ke `previewTutupBukuAction` / `simpanTutupBukuAction` selalu `0`.
- Pengingat menyetor cash dipindah menjadi satu kalimat di langkah "Saldo Kantong Kantin", misalnya:
  *"Pastikan cash di kotak sudah ditransfer ke kantong sebelum melihat saldo."*

**Yang TIDAK diubah (keputusan pengguna)**
- Kolom `tutup_buku.cash_belum_disetor` **tetap ada**, selalu berisi 0. Tidak ada migrasi.
- Rumus di `src/lib/calc.ts` tetap menerima `cashBelumDisetor` (nilainya 0), jadi tes yang ada tetap valid.
- `TutupBukuInput.cash` di `src/app/actions.ts` boleh tetap ada (diisi 0 dari wizard) atau dihapus dari
  tipe input dan di-hardcode 0 di server. Pilih yang paling sederhana.
- `HasilView` sudah menyembunyikan baris cash bila 0; tidak perlu diubah.

**Dokumen**
- Update `spec.md` §4.4 (langkah wizard) dan §2 (alur cash tetap sama: cash disetor lewat transfer
  sebelum tutup buku, tapi tidak ada input "cash belum disetor" lagi).

## Perubahan 2: Tampilkan saldo terakhir + setor/tarik sejak itu

**Konsep (penting)**
- "Saldo terakhir" = `saldo_kantong` pada baris `tutup_buku` terakhir (atau setup awal bila belum pernah
  tutup buku). Ini angka **fakta** yang diinput pengguna, **tidak pernah dihitung ulang**.
- Aplikasi **tidak tahu saldo saat ini**, karena uang jualan (QRIS/transfer/cash) masuk tanpa dicatat.
  Jangan menampilkan "estimasi saldo sekarang".
- Setor/tarik yang terjadi **setelah** tutup buku terakhir ditampilkan sebagai daftar pergerakan, bukan
  dijumlahkan ke saldo. Efeknya baru dihitung di tutup buku berikutnya.

**Tampilan** (di Beranda dan Laporan; keputusan pengguna)

Kartu "Saldo Kantong Kantin", contoh:
```
Saldo Kantong Kantin
Rp 1.843.918
tercatat saat tutup buku 28 Sep, 07.00

Sejak itu:
  ⬆️ Tarik     29 Sep   −Rp 500.000
  ⬇️ Setor     30 Sep   +Rp 100.000
(belum termasuk uang jualan; dicek di tutup buku berikutnya)
```
- Bila belum pernah tutup buku, label: "tercatat saat setup awal <tanggal>".
- Bila tidak ada setor/tarik sejak itu, sembunyikan bagian "Sejak itu".
- Tiap baris setor/tarik bisa di-tap → `/catat/kas/[id]` (halaman edit yang sudah ada).
- Beranda: letakkan kartu setelah kartu "Periode berjalan".
- Laporan: letakkan kartu di paling atas (sebelum "Riwayat Pengeluaran").

**Data**
- Tambah fungsi di `src/lib/data.ts`, misalnya `getSaldoTerakhir()` yang mengembalikan
  `{ saldo, waktu, dariSetup: boolean, kasSejak: Kas[] }`.
  - `saldo`/`waktu` dari `getTutupTerakhir()`; `dariSetup = hasilJson === null`.
  - `kasSejak` = baris `kas` dengan `waktu > tutupTerakhir.waktu`, urut terbaru dulu.
- `getPeriodeBerjalan()` sudah memuat `data.kas` untuk periode berjalan, tapi untuk periode pertama
  rentangnya mulai dari 0 (lihat `awalData`), jadi bisa ikut memuat kas bertanggal sebelum setup.
  Untuk kartu ini gunakan `waktu > tutupTerakhir.waktu` apa adanya.
- Buat komponen bersama, misalnya `src/components/saldo-card.tsx` (server component), dipakai di dua halaman.

## Kriteria selesai
- [x] Wizard Tutup Buku hanya punya 2 langkah (saldo, sisa Beng Beng); tutup buku tersimpan dengan
      `cash_belum_disetor = 0`.
- [x] Kartu saldo tampil di Beranda dan Laporan, dengan tanggal tutup buku / setup yang benar.
- [x] Setor/tarik setelah tutup buku terakhir tampil di kartu; setor/tarik sebelum itu tidak.
- [x] Setelah tutup buku baru, kartu menampilkan saldo baru dan daftar "Sejak itu" kosong.
- [x] `npx tsc --noEmit`, `npx eslint src`, `npm test` lulus.
- [x] Dicek di browser dengan `dummy.db` (lihat CLAUDE.md → Verifikasi), tampilan HP (375px).
- [x] `spec.md` diperbarui.
