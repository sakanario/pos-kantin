# Spec: POS Kantin (Beng Beng & Kopi Susu Gula Aren)

Aplikasi pencatatan untuk menghitung **profit usaha** tanpa perlu merekap setiap transaksi pembayaran.

## 1. Prinsip

1. **Profit dihitung dari uang nyata**: `profit = omzet − modal`. Omzet dibaca dari saldo, bukan dari rekap transaksi.
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
- Menampilkan: jumlah kopi hari ini, jumlah kopi di periode berjalan, dan ringkasan periode berjalan (belanja, estimasi stok Beng Beng)
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

Daftar belanja bisa difilter per periode/kategori, dan bisa diedit/dihapus selama periodenya belum ditutup.

### 4.3 Kas (Setor Modal / Tarik)
- **Setor Modal**: uang pribadi masuk ke Kantong Kantin (misal modal awal)
- **Tarik**: uang diambil dari Kantong Kantin untuk pribadi
- Field: tanggal, jenis, nominal, catatan

### 4.4 Tutup Buku (wizard, idealnya seminggu sekali)
1. Pengingat: *hitung cash di kotak → transfer nominal yang sama dari rekening utama ke Kantong Kantin*
2. Input **saldo Kantong Kantin** saat ini
3. Input **sisa Beng Beng** (pcs)
4. (Opsional) **Cash belum disetor**, jika belum sempat ditransfer, sebagai omzet tambahan
5. Tampilkan hasil perhitungan (lihat §5), lalu konfirmasi → periode dikunci

Periode = dari tutup buku sebelumnya sampai tutup buku ini. Setelah dikunci, data di periode itu tidak bisa diedit.

> Catatan: pencairan GoPay terjadi jam 22:00, jadi penjualan QRIS setelah itu baru masuk besoknya. Idealnya tutup buku dilakukan setelah pencairan (misal pagi hari sebelum jualan).

### 4.5 Laporan
- Per periode tutup buku (lihat format di §5.5)
- Rekap bulanan (gabungan periode yang tutup bukunya jatuh di bulan tersebut)
- Grafik sederhana: kopi terjual per hari, profit per periode
- Rincian belanja per kategori

### 4.6 Pengaturan
- Harga jual Beng Beng & Kopi (dengan tanggal berlaku)
- HPP estimasi kopi pribadi (dengan tanggal berlaku)
- Isi per dus Beng Beng
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
| `C` | Cash belum disetor (akhir); `C0` dari periode sebelumnya |
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

### 5.3 Angka utama (uang nyata)
```
omzet_nyata  = (S1 − S0) + (C − C0) − M + T + Bk
nilai_pribadi = (kopi_sendiri × hpp_kopi) + (bb_sendiri × avg_modal)

profit = omzet_nyata − B + (nilai_stok_akhir − nilai_stok_awal) + nilai_pribadi
```
- `Bp` masuk ke `B` (biaya), tetapi tidak memengaruhi saldo → otomatis setara setor modal.
- `nilai_pribadi` dianggap **Tarik barang**: biaya bahan yang dikonsumsi pribadi dikeluarkan dari biaya usaha.

### 5.4 Pembanding (seharusnya)
```
omzet_kopi_seharusnya = Σ (tap kopi × harga jual kopi yang berlaku saat tap)
omzet_bb_seharusnya   = bb_terjual × harga jual Beng Beng yang berlaku saat tutup buku
omzet_seharusnya      = omzet_kopi_seharusnya + omzet_bb_seharusnya

selisih = omzet_nyata − omzet_seharusnya     // negatif = uang hilang

profit_bb   = omzet_bb_seharusnya − (bb_terjual × avg_modal)
profit_kopi = omzet_kopi_seharusnya − Bkopi + (kopi_sendiri × hpp_kopi)
```
- Selisih hanya diketahui **total**, tidak bisa dipisah per produk.
- `Blain` tidak dialokasikan ke produk mana pun dan ditampilkan terpisah.

### 5.5 Contoh tampilan laporan
```
Periode 21–28 Sep 2026
──────────────────────────────────────────
Beng Beng terjual    40 × 3.000   = 120.000
Kopi terjual         25 × 10.000  = 250.000
Omzet seharusnya                  = 370.000
Omzet nyata                       = 362.000
Selisih                           =  −8.000 ⚠️
──────────────────────────────────────────
Belanja                            150.000
  Beng Beng                         73.000
  Bahan Kopi                        70.000
  Lain-lain                          7.000
Perubahan nilai stok BB            +12.900
Konsumsi pribadi                   +21.475
──────────────────────────────────────────
PROFIT                             246.375
  Profit Beng Beng (teoretis)       ...
  Profit Kopi (teoretis)            ...
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
