@AGENTS.md

# POS Kantin

Aplikasi pencatatan profit usaha kecil (kopi racikan + snack seperti Beng Beng) untuk satu pengguna.
Desain & rumus lengkap: `spec.md`. Permintaan perubahan: `docs/change-requests/`.

Pengguna berbahasa Indonesia (santai). Semua teks UI dan penjelasan ke pengguna dalam Bahasa Indonesia.
Pengguna bukan akuntan: jelaskan dengan contoh angka, bukan istilah.

## Prinsip bisnis (jangan dilanggar)

- **Profit dihitung dari uang nyata**, bukan HPP × jumlah terjual. Omzet dibaca dari perubahan saldo
  Kantong Kantin (Bank Jago). Pembayaran pembeli (QRIS/transfer/cash) **tidak** dicatat per transaksi.
- Hitungan "seharusnya" (tap kopi × harga, Beng Beng terjual × harga) hanya **pembanding** untuk
  mendeteksi selisih/uang hilang.
- Menu **racikan** (kopi): stok bahan tidak dilacak; HPP = resep × harga bahan dari **pembelian aktif**
  (kemasan yang sedang dipakai). Menu **barang jadi** (Beng Beng): stok dilacak (terjual = stok awal + beli −
  sendiri − sisa), modal rata-rata tertimbang.
- Dua angka per periode: **untung jualan** (per item, pakai HPP/modal) dan **uang bersih** (omzet nyata − belanja).
- Setor modal / tarik tidak mengubah profit; fungsinya mengoreksi perubahan saldo.
- Saldo payment gateway (pesan online, CR-005) = kantong kedua di tutup buku; potongan gateway = biaya yang
  mengurangi untung jualan, dan "uang hilang" = selisih + potongan. Pencairan gateway → Kantong tidak dicatat.
- Pesanan online yang lunas = tap terjual otomatis (racikan saja; barang jadi tetap dari sisa stok). Pembayarannya
  tidak dicatat sebagai uang; uangnya terbaca dari saldo gateway saat tutup buku.
- Env `GATEWAY=palsu` = tombol "Simulasikan bayar" (lunas tanpa uang). Hanya untuk laptop; ditolak di Vercel.
- Konsumsi pribadi (tap "Sendiri") = biaya: mengurangi untung jualan.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Drizzle ORM + libsql
(SQLite lokal `local.db`, produksi Turso) · deploy Vercel · login PIN (bcrypt + cookie HMAC).
Next 16 berbeda dari versi lama: baca `node_modules/next/dist/docs/` sebelum memakai API Next
(mis. `proxy.ts` pengganti middleware, `cookies()`/`params` async, `connection()`).

## Perintah

```bash
npm run dev            # dev server (local.db)
npm test               # tes rumus: src/lib/calc.test.ts (node --test, TS langsung)
npx tsc --noEmit && npx eslint src
npm run db:generate    # setelah ubah src/db/schema.ts → buat migrasi di drizzle/
npm run db:migrate     # terapkan migrasi ke DATABASE_URL
npm run seed:dummy     # buat ulang dummy.db (simulasi 27 Jul – hari ini)
npm run dev:dummy      # dev server memakai dummy.db
```

## Arsitektur

```
src/lib/calc.ts        rumus 1 periode + HPP (fungsi murni) — satu-satunya sumber kebenaran perhitungan
src/lib/data.ts        query baca (periode berjalan, riwayat, ringkasan harian, dll.)
src/lib/hitung-ulang.ts hitung ulang hasil semua tutup buku sejak waktu tertentu
src/app/actions.ts     semua server action (tulis). Setiap action memanggil requireAuth()
src/app/(app)/         halaman setelah login: beranda, catat (belanja/kopi/kas + edit), tutup-buku,
                       laporan (+ /[id] detail), lainnya (+ /menu, /bahan, /uang-barang, /pengeluaran, /qr-katalog),
                       pesanan (pesanan online), setelan
src/app/login, setup   tanpa login
src/app/pesan/         halaman pembeli (CR-005, tanpa login): katalog, keranjang, [kode]/bayar, [kode] (struk),
                       riwayat, foto/[id]; actions.ts = server action publik (validasi ulang di lib/pesanan.ts)
src/lib/pesanan.ts     pesanan online: buat, kedaluwarsa, tandaiLunas (idempoten, tap otomatis), majukan, batalkanLunas
src/lib/push.ts        web push saat pesanan lunas (public/sw.js; kunci VAPID di env)
src/db/schema.ts       13 tabel: settings, menu, bahan, resep, bahan_aktif, harga, tap_event, belanja, kas, tutup_buku,
                       pesanan, pesanan_item, push_langganan
                       (menu.foto = BLOB: jangan ikut di-select, pakai getMenu / columns: { foto: false })
scripts/seed-dummy.ts  generator dummy.db (pakai calc.ts yang sama)
```

### Model data: semuanya dihubungkan oleh waktu

- Tiap catatan punya `waktu` (epoch ms UTC). Tidak ada foreign key.
- `tutup_buku` = garis pembatas periode. Baris pertama (`hasil_json IS NULL`) = setup awal.
  Periode = catatan dengan `waktu` di (tutup sebelumnya, tutup ini]. **Periode pertama mulai dari 0**
  (mencakup catatan bertanggal sebelum setup) — selalu pakai `awalData(tutupSebelumnya)`, jangan
  `tutupSebelumnya.waktu` langsung.
- `tutup_buku` menyimpan input pengguna (saldo, cash — kini selalu 0, sisa per barang jadi) + snapshot
  `hasil_json`. `stok_json` = `{ [menuId]: { sisa, avgModal } }`: sisa = input, avgModal = hasil (berantai).
- Catatan boleh diinput mundur / diedit / dihapus kapan saja. Jika menyentuh periode yang sudah
  ditutup, action memanggil `hitungUlangSejak()` (lewat `setelahUbah()` di actions.ts).
  **Mengubah data langsung di DB tidak memicu hitung ulang** → snapshot laporan jadi basi.
- Tanggal input → `waktu`: hari ini = sekarang; hari lain = 12:00 WIB; jika tanggal itu ada tutup
  buku, pengguna memilih sebelum/sesudah (`waktuDariTanggal` di actions.ts).
- Riwayat dengan pola "baris terakhir dengan mulai <= t": `harga` (jual per menu), `resep` (`berlaku_mulai`),
  `bahan_aktif` (`mulai`, kemasan yang dipakai). Racikan dinilai per waktu tap; barang jadi pakai harga saat tutup buku.
  Resep pertama sebuah menu & pembelian aktif pertama sebuah bahan berlaku sejak 0.
- `tap_event` = (`menu_id`, `terjual`/`sendiri`, `delta`). Delta +1/−1 (tap) atau N (input manual, `manual = true`).
- Nominal selalu integer rupiah. Tampilan & batas hari memakai WIB (`src/lib/format.ts`).

## Jebakan yang pernah terjadi

- **Form reset React 19**: setelah server action, form otomatis di-reset. Jangan pakai radio/select
  terkontrol untuk nilai yang harus bertahan — pakai tombol + `<input type="hidden">` (lihat
  `catat/forms.tsx`). Untuk state yang mengikuti input, dengarkan event `reset` pada form.
- **Halaman yang membaca DB harus dinamis**: `(app)/layout.tsx`, `login`, `setup` memanggil
  `await connection()`. Tanpa itu, build dengan DB kosong me-render redirect statis ke /setup.
- **`Date.now()` di render** ditolak lint (react-hooks/purity) → hitung di `lib/data.ts`.
- **Akses dari HP** (IP LAN): `allowedDevOrigins` di `next.config.ts` diisi IP laptop otomatis;
  tanpa itu JS diblokir di dev dan tombol tidak berfungsi. IP berubah → restart dev server.
- **Tampilan**: satu gaya saja, Kantin Latte (`docs/design-system/latte/`). Gaya Pop & Poster dihapus
  2026-10-16 supaya UI baru cukup dicek di terang & gelap. Tema terang/gelap/ikut HP = cookie per perangkat
  (Setelan) → `data-theme` di <html>. Halaman pembeli `/pesan` punya tema sendiri (cookie `tema_pembeli`, bawaan terang,
  tidak ikut HP), dipilih root layout lewat header `x-area` dari `proxy.ts` (`lib/tema-server.ts`). Warna & bentuk lewat variabel di `globals.css` (`--r-sm/md/lg/ctl`,
  `--stroke*`, `--pop-shadow*`, `--font-ui/judul`); jangan pakai `--radius-*`/`--shadow-*` untuk variabel
  sendiri (bentrok dengan tema bawaan Tailwind).
- **Dialog `position: fixed` di dalam `.card`**: kartu kaca memakai `backdrop-filter`, yang menjadi containing block
  untuk elemen fixed (dialog jadi terkurung di kartu). Render dialog seperti itu lewat `createPortal(…, document.body)`.
- **File `"use client"`**: fungsi/konstanta yang diekspor darinya tidak bisa dipanggil dari komponen server
  (error "Attempted to call X() from the server"). Taruh helper bersama di `src/lib/` (mis. `lib/gerak.ts`).
- **Tailwind v4**: kelas kustom (`card`, `input`, `btn-primary`, …) didefinisikan dengan `@utility`
  di `globals.css`, bukan `@layer components`.
- Next.js menolak dua `next dev` di folder yang sama.

## Data pengguna — hati-hati

- `local.db` berisi data pengguna. Jangan hapus/reset. Sebelum mengubah skema atau data langsung,
  **backup dulu** (salin file) dan beri tahu pengguna. Perubahan data sebaiknya lewat aplikasi.
- Pengguna mungkin membuka `local.db` dengan ekstensi VS Code SQLite; hindari menulis bersamaan.
- Setelah menambah migrasi, `local.db` pengguna juga perlu `npm run db:migrate` (server dev yang
  sedang jalan akan error sampai kolom baru ada).

## Verifikasi perubahan UI

Pengguna biasanya menjalankan `npm run dev` di port 3000 dengan `local.db`. Untuk mengetes tanpa
menyentuh datanya: jalankan build produksi di port lain dengan DB terpisah, mis.
`DATABASE_URL=file:dummy.db npx next build && DATABASE_URL=file:dummy.db npx next start -p 3001`
(PIN dummy ada di `scripts/seed-dummy.ts`). Cek di viewport HP (375px). Hapus DB tes setelahnya.
