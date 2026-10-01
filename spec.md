# Spec: POS Kantin (Beng Beng & Kopi Susu Gula Aren)

Aplikasi pencatatan untuk menghitung **profit usaha** tanpa perlu merekap setiap transaksi pembayaran.

## 1. Prinsip

1. **Dua angka per periode** (CR-002): **untung jualan** (perkiraan per cup, angka utama) dan **uang bersih** (uang nyata: omzet − belanja; dijumlah = balik modal). Omzet nyata dibaca dari saldo, bukan dari rekap transaksi.
2. **Semua uang usaha ada di satu tempat**: Kantong "Kantin" di Bank Jago.
3. **Pencatatan seminimal mungkin**: tap saat bikin kopi, catat saat belanja, lalu tutup buku seminggu sekali.
4. **Hitungan "seharusnya" dipakai sebagai pembanding** untuk mendeteksi uang yang hilang, bukan sebagai angka utama.

## 2. Alur Uang (di luar aplikasi)

```
QRIS ──► GoPay Merchant ──(otomatis 22:00, jika saldo > Rp 10.000)──► Kantong Kantin (Jago)
Transfer ─────────────────────────────────────────────────────────► Kantong Kantin (Jago)
Cash ──► kotak ──(saat tutup buku: cash diambil pribadi, transfer nominal yang sama
                  dari rekening utama ke Kantong Kantin)──────────► Kantong Kantin (Jago)
```

Aturan kebiasaan:
- Pembeli yang transfer diberi **nomor rekening Kantong Kantin**. Transfer yang nyasar ke rekening utama dipindahkan manual.
- Belanja **sebaiknya dibayar dari Kantong Kantin**. Belanja yang dibayar dari rekening pribadi tetap boleh, dan dicatat dengan sumber "pribadi" (otomatis dianggap setor modal).
- Konversi cash ke saldo kantong **tidak dicatat** di aplikasi. Itu hanya perpindahan bentuk omzet.
- Cash **selalu** disetor (ditransfer) ke Kantong Kantin sebelum tutup buku, jadi tidak ada input "cash belum disetor" (kolom `cash_belum_disetor` selalu 0).

## 3. Produk

| Produk | Stok dilacak? | Terjual dihitung dari | Modal dihitung dari |
|---|---|---|---|
| Beng Beng | Ya (per biji) | Stok awal + beli − sisa − konsumsi pribadi | Harga beli rata-rata tertimbang |
| Kopi Susu Gula Aren | Tidak | Tap **+1 Kopi** | Total belanja bahan kopi |

Harga awal:
- Beng Beng: jual **Rp 3.000/pcs**, isi dus default **17 pcs**
- Kopi: jual **Rp 10.000/cup**, HPP estimasi (hanya untuk kopi pribadi) **Rp 6.428/cup**

Semua harga bisa diubah dan **disimpan beserta tanggal berlakunya**, sehingga laporan periode lama tetap memakai harga lama.

## 4. Fitur

### 4.1 Beranda (tap counter)
- Tombol besar **+1 Kopi** (penjualan)
- Tombol kecil **+1 Kopi Sendiri** dan **+1 Beng Beng Sendiri** (konsumsi pribadi)
- Tombol **−1** untuk koreksi masing-masing
- Menampilkan: jumlah kopi hari ini, jumlah kopi di periode berjalan, dan ringkasan periode berjalan (untung kopi hari ini & periode ini, belanja, estimasi stok Beng Beng)
- **Untung kopi** (hari ini / periode ini) = Σ tap kopi × (jual − HPP saat tap) − Σ kopi sendiri × HPP − Beng Beng sendiri × modal rata-rata terakhir. Untung Beng Beng terjual baru dihitung saat tutup buku.
- Kartu **Balik modal** (sesudah kartu saldo), uang nyata saja, sampai tutup buku terakhir:
  ```
  modal_masuk  = saldo_awal_setup + cash_awal_setup + Σ setor + Σ belanja dari uang pribadi
  uang_kembali = saldo_kantong_terakhir + cash_terakhir + Σ tarik
  posisi       = uang_kembali − modal_masuk        // = Σ uang_bersih semua periode
  ```
  `posisi < 0` → "Sisa modal belum kembali" + progress `uang_kembali / modal_masuk`; `posisi ≥ 0` → "Sudah balik modal, untung bersih sejak mulai".
  Belanja pribadi / setor sesudah tutup buku terakhir ditampilkan terpisah ("masuk di tutup buku berikutnya"). Stok tidak dihitung.
- Setiap tap disimpan sebagai event (`+1` / `−1`) dengan timestamp

### 4.2 Belanja
Form:
- Tanggal (default hari ini)
- Kategori: `Beng Beng` / `Bahan Kopi` / `Lain-lain`
- Nama barang (bebas, misal "Susu 1L", "Cup 16oz 50pcs")
- Khusus Beng Beng: jumlah (input dalam **dus** atau **pcs**, dus × isi per dus) → disimpan dalam pcs
- Total harga (Rp)
- Dibayar dari: `Kantong Kantin` (default) / `Pribadi`
- Catatan (opsional)

Daftar belanja bisa difilter per bulan/kategori. Semua catatan (belanja & kas) bisa diedit/dihapus kapan saja, termasuk yang tanggalnya ada di periode yang sudah ditutup (lihat §4.4).

### 4.3 Kas (Setor Modal / Tarik)
- **Setor Modal**: uang pribadi masuk ke Kantong Kantin (misal modal awal)
- **Tarik**: uang diambil dari Kantong Kantin untuk pribadi
- Field: tanggal, jenis, nominal, catatan

### 4.4 Tutup Buku (wizard, idealnya seminggu sekali)
1. Input **saldo Kantong Kantin** saat ini, dengan pengingat: *pastikan cash di kotak sudah ditransfer ke kantong sebelum melihat saldo*
2. Input **sisa Beng Beng** (pcs)
3. Tampilkan hasil perhitungan (lihat §5), lalu konfirmasi → periode disimpan (`cash_belum_disetor = 0`)

Periode = dari tutup buku sebelumnya sampai tutup buku ini. Catatan masuk periode sesuai **tanggal aslinya**, jadi input telat (H+1, H+sekian) tetap masuk periode yang benar:
- Tanggal tanpa tutup buku → dianggap jam 12:00 WIB hari itu (hari ini → jam sekarang).
- Tanggal yang ada tutup bukunya → pengguna memilih *sebelum* atau *sesudah* tutup buku.
- Tanggal sebelum setup awal → masuk periode pertama.

Kalau catatan di periode yang sudah ditutup ditambah/diubah/dihapus, laporan periode itu dan semua periode sesudahnya **dihitung ulang otomatis**. Input tutup buku (saldo, sisa Beng Beng) tidak berubah; yang berubah hasil hitungan dan modal rata-rata Beng Beng yang berantai. Tap (+1 Kopi, dll.) selalu tercatat di waktu tap dan tidak bisa diinput mundur.

**Batalkan tutup buku terakhir** (tombol di detail laporan periode terakhir): baris tutup buku dihapus, periodenya menyatu lagi dengan periode berjalan. Catatan di dalamnya tidak ikut terhapus. Hanya tutup buku terakhir yang bisa dibatalkan (bisa diulang untuk membatalkan beberapa, dari yang terbaru), jadi tidak perlu hitung ulang. Setup awal tidak bisa dibatalkan.

> Catatan: pencairan GoPay terjadi jam 22:00, jadi penjualan QRIS setelah itu baru masuk besoknya. Idealnya tutup buku dilakukan setelah pencairan (misal pagi hari sebelum jualan).

### 4.5 Laporan
- Kartu **Saldo Kantong Kantin** (juga di Beranda, sesudah kartu periode berjalan): saldo yang diinput di tutup buku terakhir (atau setup awal) beserta waktunya, lalu daftar setor/tarik **sejak itu** (tap → halaman edit). Setor/tarik tidak dijumlahkan ke saldo, karena uang jualan tidak dicatat sehingga saldo saat ini tidak diketahui; efeknya dihitung di tutup buku berikutnya.
- Per periode tutup buku (lihat format di §5.5)
- Rekap bulanan (gabungan periode yang tutup bukunya jatuh di bulan tersebut)
- Angka utama tiap periode & bulan: **untung jualan**; angka kedua (lebih kecil): **uang bersih**
- Grafik sederhana: kopi terjual per hari
- Rincian belanja per kategori

### 4.6 Pengaturan
- Harga jual Beng Beng & Kopi (dengan tanggal berlaku)
- HPP estimasi kopi pribadi (dengan tanggal berlaku)
- Isi per dus Beng Beng
- **Hitung ulang semua laporan**: hitung ulang hasil semua tutup buku dengan rumus terbaru (dipakai setelah rumus berubah atau data diubah langsung di DB). Laporan dengan snapshot rumus lama menampilkan ajakan ke tombol ini.
- Ganti PIN

### 4.7 Setup Awal (pertama kali dibuka)
- Buat PIN
- Saldo awal Kantong Kantin
- Stok awal Beng Beng + modal per pcs
- Harga jual awal

## 5. Perhitungan (per periode)

### 5.1 Notasi
| Simbol | Arti |
|---|---|
| `S0`, `S1` | Saldo kantong awal (tutup buku sebelumnya) & akhir |
| `C` | Cash belum disetor (akhir); `C0` dari periode sebelumnya. Sejak CR-001 selalu 0 (data lama bisa berisi nilai) |
| `M` | Total Setor Modal |
| `T` | Total Tarik (uang) |
| `Bk` | Belanja dibayar dari kantong |
| `Bp` | Belanja dibayar pribadi |
| `B` | Total belanja = `Bk + Bp` |
| `Bbb`, `Bkopi`, `Blain` | Belanja per kategori |

### 5.2 Beng Beng
```
stok_awal        = sisa pada tutup buku sebelumnya (atau setup awal)
beli             = Σ pcs belanja Beng Beng di periode
bb_sendiri       = Σ tap Beng Beng Sendiri
sisa             = input tutup buku
bb_terjual       = stok_awal + beli − bb_sendiri − sisa

avg_modal        = (stok_awal × avg_modal_lalu + Bbb) / (stok_awal + beli)   // rata-rata tertimbang periodik
nilai_stok_awal  = stok_awal × avg_modal_lalu
nilai_stok_akhir = sisa × avg_modal
```
Kalau `bb_terjual` negatif → tampilkan peringatan (kemungkinan salah input).

### 5.3 Uang bersih (uang nyata)
```
omzet_nyata = (S1 − S0) + (C − C0) − M + T + Bk
uang_bersih = omzet_nyata − B
```
- `Bp` masuk ke `B` (biaya), tetapi tidak memengaruhi saldo → otomatis setara setor modal.
- Pasti, tapi naik-turun mengikuti hari belanja. Dijumlah semua periode = posisi balik modal (§4.1).
- Nilai stok Beng Beng **tidak** masuk angka mana pun (hanya info di rincian).

### 5.3b Untung jualan (perkiraan per cup, angka utama)
```
untung_kopi   = Σ tap kopi × (jual_kopi(t) − hpp_kopi(t)) − Σ tap kopi_sendiri × hpp_kopi(t)
untung_bb     = bb_terjual × (harga_jual_bb − avg_modal) − bb_sendiri × avg_modal
untung_jualan = untung_kopi + untung_bb
```
- **Konsumsi pribadi = biaya**: kopi/Beng Beng yang dikonsumsi sendiri mengurangi untung (bahannya habis, uang tidak kembali).
  Contoh: jual 3 kopi (10.000, HPP 7.000) → +9.000; minum 1 → −7.000; untung 2.000.
- `nilai_pribadi = Σ kopi_sendiri × hpp_kopi(t) + bb_sendiri × avg_modal` tetap dihitung sebagai info.
- `Blain` (biasanya alat) tidak masuk untung jualan, tetapi masuk uang bersih & balik modal.
- HPP diisi worst case, jadi untung sebenarnya bisa lebih besar. Jangka panjang ≈ uang bersih bila HPP akurat.

### 5.4 Pembanding (seharusnya)
```
omzet_kopi_seharusnya = Σ (tap kopi × harga jual kopi yang berlaku saat tap)
omzet_bb_seharusnya   = bb_terjual × harga jual Beng Beng yang berlaku saat tutup buku
omzet_seharusnya      = omzet_kopi_seharusnya + omzet_bb_seharusnya

selisih = omzet_nyata − omzet_seharusnya     // negatif = uang hilang
```
- Selisih hanya diketahui **total**, tidak bisa dipisah per produk.

### 5.5 Contoh tampilan laporan
```
Untung jualan periode ini        +3.515
Uang bersih +59.000 · ✅ Uang masuk sesuai hitungan
──────────────────────────────────────────
Untung jualan (perkiraan per cup)
☕ Kopi                           +1.000
   5 terjual × (10.000 − 7.000)  +15.000
   2 diminum sendiri × 7.000     −14.000
🍫 Beng Beng                      +2.515
   3 terjual × (3.000 − 2.162)    +2.515
   0 dimakan sendiri
Untung jualan                     +3.515
📦 Belanja lain-lain (bila ada)   −13.798  (masuk balik modal, bukan untung jualan)
──────────────────────────────────────────
Uang bersih
Omzet nyata (dari saldo)          59.000
Belanja                               −0
Uang bersih                      +59.000
──────────────────────────────────────────
Omzet: seharusnya vs nyata, lalu Rincian (stok, kopi, uang)
```

## 6. Data Model (SQLite / Turso)

Semua nominal disimpan dalam **integer rupiah**. Semua waktu disimpan dalam UTC, ditampilkan dalam **Asia/Jakarta**.

```
settings
  key TEXT PK, value TEXT            -- pin_hash, isi_per_dus, setup_done

harga
  id, produk ('bb' | 'kopi'), jenis ('jual' | 'hpp'),
  nilai INTEGER, berlaku_mulai DATE

tap_event
  id, waktu DATETIME, jenis ('kopi' | 'kopi_sendiri' | 'bb_sendiri'), delta INTEGER (+1 / −1)

belanja
  id, tanggal DATE, kategori ('bb' | 'kopi' | 'lain'), nama TEXT,
  qty_pcs INTEGER NULL (hanya bb), total INTEGER,
  sumber ('kantong' | 'pribadi'), catatan TEXT NULL

kas
  id, tanggal DATE, jenis ('setor' | 'tarik'), nominal INTEGER, catatan TEXT NULL

tutup_buku
  id, waktu DATETIME,
  saldo_kantong INTEGER, sisa_bb INTEGER, cash_belum_disetor INTEGER DEFAULT 0,
  avg_modal_bb INTEGER,            -- snapshot hasil hitung
  hasil_json TEXT                  -- snapshot seluruh angka laporan
```
Setup awal disimpan sebagai `tutup_buku` pertama (periode ke-0) berisi saldo awal, stok awal, dan modal awal per pcs.

## 7. Tech Stack

- **Next.js** (App Router, TypeScript), full-stack: UI + Server Actions/Route Handlers
- **Drizzle ORM** + `@libsql/client`
  - Lokal: file SQLite (`file:local.db`)
  - Produksi: **Turso** (via `DATABASE_URL` + `DATABASE_AUTH_TOKEN`)
- **Tailwind CSS**, mobile-first
- **PWA**: manifest + ikon, agar bisa "Add to Home Screen"
- Deploy: **Vercel**

## 8. Auth

- Satu pengguna, login dengan **PIN** (4–6 digit)
- PIN disimpan sebagai hash (bcrypt/argon2)
- Sesi berupa cookie `httpOnly`, `secure`, dan ditandatangani (masa berlaku panjang, misal 30 hari)
- Pembatasan percobaan: jeda setelah 5 kali salah

## 9. Di Luar Lingkup (untuk sekarang)

- Rekap per transaksi / per metode pembayaran
- Stok bahan kopi
- Multi-user / multi-cabang
- Mode offline (tap disimpan dulu saat tidak ada sinyal), kandidat fitur berikutnya
- Aplikasi Flutter terpisah

## 10. Pertanyaan Terbuka

- Perlu tombol **"cup/kopi terbuang"** agar tidak dihitung sebagai penjualan? (sementara: tidak, cukup −1)
- Jika harga jual Beng Beng berubah di tengah periode, omzet seharusnya memakai harga saat tutup buku. Sarankan: ubah harga tepat saat tutup buku.
- Perlu ekspor data (CSV) untuk backup?
