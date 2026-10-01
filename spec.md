# Spec: POS Kantin (kopi racikan & snack)

Aplikasi pencatatan untuk menghitung **profit usaha** tanpa perlu merekap setiap transaksi pembayaran.

## 1. Prinsip

1. **Dua angka per periode** (CR-002): **untung jualan** (perkiraan per cup, angka utama) dan **uang bersih** (uang nyata: omzet − belanja; dijumlah = balik modal). Omzet nyata dibaca dari saldo, bukan dari rekap transaksi.
2. **Semua uang usaha ada di satu tempat**: Kantong "Kantin" di Bank Jago.
3. **Pencatatan seminimal mungkin**: tap saat bikin kopi, catat saat belanja (dan saat membuka kemasan baru), lalu tutup buku seminggu sekali.
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

## 3. Menu & bahan (CR-003)

Dua jenis menu:

| | **Racikan** | **Barang jadi** |
|---|---|---|
| Contoh | Kopi Susu SKM, Kopi Susu Gula Aren | Beng Beng, snack lain |
| Modal per item | HPP dari resep (takaran × harga bahan) | modal rata-rata tertimbang per pcs |
| Stok | tidak dilacak | dilacak, sisa diinput tiap tutup buku |
| Tap terjual | ya (+1 / −1) | tidak (terjual = stok awal + beli − sendiri − sisa) |
| Tap sendiri | ya | ya |

- Varian & ukuran beda = menu terpisah. Barang jadi dipisah hanya bila harga jualnya beda.
- Kopi gratis / tester / terbuang dicatat sebagai **sendiri**.
- Menu bisa **dinonaktifkan**: hilang dari Beranda, form, dan tutup buku; riwayat tetap di laporan.
  Barang jadi nonaktif yang masih punya stok tetap muncul di tutup buku.
- Harga jual per menu disimpan **beserta tanggal berlakunya** (riwayat, tidak pernah ditimpa).

**Bahan**: satu bahan = satu peran dalam resep (`gr` atau `pcs`). Merek beda dengan takaran sama = satu bahan.
Tiap bahan punya **harga awal** per satuan (dipakai sampai ada pembelian aktif). Bahan yang tidak dipakai resep
(es batu, plastik) boleh dibuat: tetap biaya, tidak memengaruhi HPP.

**Pembelian aktif** (inti HPP): stok lama dihabiskan dulu baru pakai yang baru.
```
harga_bahan(t) = total / (jumlah_kemasan × isi_kemasan) dari pembelian yang aktif pada t
                 (atau harga awal bila belum ada pembelian aktif)
hpp_menu(t)    = Σ takaran(resep yang berlaku pada t) × harga_bahan(t)
```
- Mengganti pembelian aktif ("Pakai ini") dicatat dengan **waktu mulai**; tap sebelum itu tetap memakai harga lama.
- Resep punya riwayat: mengubah resep berlaku sejak diubah.
- **Versi resep pertama** sebuah menu dan **pembelian aktif pertama** sebuah bahan berlaku **sejak awal (waktu 0)**,
  supaya tap lama ikut memakai HPP dari resep (bukan 0 / harga awal). Laporan lama dihitung ulang otomatis.

## 4. Fitur

Navigasi bawah: ☕ Beranda · 📝 Catat · 🔒 Tutup Buku · 📊 Laporan · ☰ Lainnya.
Tab **Lainnya** (`/lainnya`) berisi daftar: 🍽️ Menu (§4.6), 🧂 Bahan (§4.6), 💰 Uang & Barang (§4.8),
🧾 Riwayat Pengeluaran (`/lainnya/pengeluaran`), ⚙️ Setelan (`/setelan`). Tab ini aktif di `/lainnya*` dan
`/setelan`; halaman di bawahnya punya tombol "‹ Kembali".

### 4.1 Beranda (tap counter)
- Grid 2 kolom, satu kartu per menu aktif (urut `urutan`):
  - Racikan: jumlah terjual hari ini, **+1** terjual, −1 koreksi, **🙋 Sendiri** +1 / −1.
  - Barang jadi: hanya **🙋 Sendiri** +1 / −1 (terjual dihitung saat tutup buku).
- Di atas grid: total racikan terjual hari ini · omzet.
- Kartu "Periode berjalan": untung hari ini & periode ini, terjual per racikan, belanja, stok tersedia per barang jadi.
- **Untung** (hari ini / periode ini) = Σ racikan terjual × (jual − HPP saat tap) − Σ racikan sendiri × HPP − barang
  jadi sendiri × modal rata-rata terakhir. Untung barang jadi terjual baru dihitung saat tutup buku.
- **Pengingat kemasan habis**: bila ada pembelian bahan yang lebih baru dari yang aktif dan pemakaian sejak kemasan
  aktif dimulai ≥ perkiraan resep:
  *"Nescafe kemungkinan sudah habis (perkiraan 5 cup, sudah 7 cup). Sudah pakai Indocafe? [Ya, ganti] [Belum]"*.
  "Ya, ganti" = "Pakai ini" mulai sekarang. "Belum" menyembunyikan pengingat bahan itu sampai besok
  (`settings.tunda_pengingat`). Tidak pernah mengganti otomatis.
- Kartu **Balik modal** (sesudah kartu saldo), uang nyata saja, sampai tutup buku terakhir:
  ```
  modal_masuk  = saldo_awal_setup + cash_awal_setup + Σ setor + Σ belanja dari uang pribadi
  uang_kembali = saldo_kantong_terakhir + cash_terakhir + Σ tarik
  posisi       = uang_kembali − modal_masuk        // = Σ uang_bersih semua periode
  ```
  `posisi < 0` → "Sisa modal belum kembali" + progress `uang_kembali / modal_masuk`; `posisi ≥ 0` → "Sudah balik modal, untung bersih sejak mulai".
  Belanja pribadi / setor sesudah tutup buku terakhir ditampilkan terpisah ("masuk di tutup buku berikutnya"). Stok tidak dihitung.
- Setiap tap disimpan sebagai event (`menu_id`, `terjual`/`sendiri`, `+1` / `−1`) dengan timestamp.

### 4.2 Belanja
Kategori: `Bahan` / `Barang jadi` / `Lain-lain`.
- **Bahan**: pilih bahan (tombol), nama barang & isi/kemasan **terisi otomatis dari belanja terakhir bahan itu**,
  jumlah kemasan, total. Info: harga per satuan → biaya per cup di tiap menu (dan HPP lama → baru bila langsung dipakai).
  Checkbox **"Langsung dipakai sekarang"** (kosongkan kalau stok lama masih ada). Pembelian pertama suatu bahan otomatis aktif.
- **Barang jadi**: pilih barang, jumlah dus × isi per dus (isi terisi dari belanja terakhir barang itu) = pcs. Info Rp/pcs.
- **Lain-lain**: nama barang bebas (biasanya alat). Tidak masuk untung jualan, masuk uang bersih & balik modal.
- Total harga, dibayar dari `Kantong Kantin` (default) / `Pribadi`, tanggal, catatan.

Daftar belanja (Riwayat Pengeluaran, `/lainnya/pengeluaran`) bisa difilter per bulan/kategori. Semua catatan (belanja & kas) bisa diedit/dihapus kapan saja, termasuk yang tanggalnya ada di periode yang sudah ditutup (lihat §4.4).
Menghapus belanja yang sedang aktif → HPP kembali ke pembelian aktif sebelumnya. Mengganti bahannya → status aktif dilepas.

Tab **Penjualan** di Catat: input manual hari sebelumnya, pilih menu + terjual/sendiri + jumlah (barang jadi: sendiri saja).

### 4.3 Kas (Setor Modal / Tarik)
- **Setor Modal**: uang pribadi masuk ke Kantong Kantin (misal modal awal)
- **Tarik**: uang diambil dari Kantong Kantin untuk pribadi
- Field: tanggal, jenis, nominal, catatan

### 4.4 Tutup Buku (wizard, idealnya seminggu sekali)
1. Input **saldo Kantong Kantin** saat ini, dengan pengingat: *pastikan cash di kotak sudah ditransfer ke kantong sebelum melihat saldo*
2. Input **sisa stok** per barang jadi (aktif, atau nonaktif yang masih punya stok)
3. Tampilkan hasil perhitungan (lihat §5), lalu konfirmasi → periode disimpan (`cash_belum_disetor = 0`)

Periode = dari tutup buku sebelumnya sampai tutup buku ini. Catatan masuk periode sesuai **tanggal aslinya**, jadi input telat (H+1, H+sekian) tetap masuk periode yang benar:
- Tanggal tanpa tutup buku → dianggap jam 12:00 WIB hari itu (hari ini → jam sekarang).
- Tanggal yang ada tutup bukunya → pengguna memilih *sebelum* atau *sesudah* tutup buku.
- Tanggal sebelum setup awal → masuk periode pertama.

Kalau catatan di periode yang sudah ditutup ditambah/diubah/dihapus (termasuk ganti kemasan aktif, resep pertama, harga awal bahan), laporan periode itu dan semua periode sesudahnya **dihitung ulang otomatis**. Input tutup buku (saldo, sisa stok) tidak berubah; yang berubah hasil hitungan dan modal rata-rata barang jadi yang berantai. Tap (+1, dll.) selalu tercatat di waktu tap dan tidak bisa diinput mundur.

**Batalkan tutup buku terakhir** (tombol di detail laporan periode terakhir): baris tutup buku dihapus, periodenya menyatu lagi dengan periode berjalan. Catatan di dalamnya tidak ikut terhapus. Hanya tutup buku terakhir yang bisa dibatalkan (bisa diulang untuk membatalkan beberapa, dari yang terbaru), jadi tidak perlu hitung ulang. Setup awal tidak bisa dibatalkan.

> Catatan: pencairan GoPay terjadi jam 22:00, jadi penjualan QRIS setelah itu baru masuk besoknya. Idealnya tutup buku dilakukan setelah pencairan (misal pagi hari sebelum jualan).

### 4.5 Laporan
Fokus ke laporan saja (kartu saldo & Riwayat Pengeluaran ada di Lainnya, CR-004).

- Kartu **Saldo Kantong Kantin** (di Beranda sesudah kartu periode berjalan, dan di Uang & Barang): saldo yang diinput di tutup buku terakhir (atau setup awal) beserta waktunya, lalu daftar setor/tarik **sejak itu** (tap → halaman edit). Setor/tarik tidak dijumlahkan ke saldo, karena uang jualan tidak dicatat sehingga saldo saat ini tidak diketahui; efeknya dihitung di tutup buku berikutnya.
- Per periode tutup buku (lihat format di §5.5): angka per menu.
- Rekap bulanan (gabungan periode yang tutup bukunya jatuh di bulan tersebut), dengan rincian per menu (terjual, untung).
- Angka utama tiap periode & bulan: **untung jualan**; angka kedua (lebih kecil): **uang bersih**
- Grafik sederhana: racikan terjual per hari

### 4.6 Menu, Bahan, Setelan (dibuka dari tab Lainnya)
**Menu** (`/lainnya/menu`): daftar aktif & nonaktif dengan harga jual, HPP/modal, untung per item. Form menu:
nama, jenis (saat dibuat), harga jual, urutan, dan untuk racikan **resep** (bahan + takaran, biaya per baris).
HPP & untung (%) dihitung langsung saat mengetik dari harga bahan yang aktif sekarang. Ubah harga jual → baris baru di
`harga` (berlaku sejak sekarang); ubah resep → versi resep baru. Tombol Nonaktifkan / Aktifkan lagi.

**Bahan** (`/lainnya/bahan`): daftar bahan (harga per satuan sekarang + kemasan yang aktif), form bahan baru
(nama, satuan, harga awal), dan daftar **"Belanja bahan belum ditandai"** (belanja lama dari sebelum CR-003): pilih
bahan, isi/kemasan, jumlah, dan "Kemasan ini yang dipakai" (berlaku sejak awal). Detail bahan: dipakai di menu apa,
3 pembelian terakhir (● aktif / ○ **Pakai ini** + tanggal mulai), ubah nama/satuan/harga awal, hapus (bila belum dipakai).

**Info "habis setelah N cup"** setiap kali pembelian aktif diganti (Pakai ini, pengingat, form belanja):
*"Kopi sebelumnya habis setelah 30 cup (perkiraan resep: 50 cup)."* N = Σ (terjual + sendiri) semua racikan yang
resepnya memakai bahan itu selama kemasan lama aktif; perkiraan = isi total ÷ takaran rata-rata. Tidak ditampilkan bila
kemasan lama adalah harga awal.

**Setelan**: Hitung ulang semua laporan (rumus terbaru; juga setelah data diubah langsung di DB; laporan dengan
snapshot lama menampilkan ajakan ke tombol ini), Ganti PIN, Keluar.

### 4.7 Setup Awal (pertama kali dibuka)
- Buat PIN
- Saldo awal Kantong Kantin
- Sesudahnya diarahkan ke Lainnya → Menu. Menu & bahan dibuat di sana; barang jadi mulai dengan stok 0.

### 4.8 Uang & Barang (`/lainnya/uang-barang`)
Uang yang sekarang berbentuk saldo dan barang, **per tutup buku terakhir** (atau setup awal):
```
Saldo Kantong Kantin                 Rp125.000
Barang (modal)                        Rp21.618    ← Σ sisa × modal rata-rata (tutup_buku.stok_json)
Total                                Rp146.618

🍫 Beng Beng     10 pcs × Rp2.162     Rp21.618
   Potensi omzet  10 × Rp3.000        Rp30.000    ← sisa × harga jual sekarang
   Potensi untung                     +Rp8.382
```
- Satu blok per barang jadi (aktif, atau nonaktif yang masih punya stok).
- Bila ada pembelian / tap sendiri sesudah tutup buku: "Beng Beng sejak tutup buku: +34 pcs dibeli,
  1 dimakan sendiri (yang terjual baru ketahuan saat tutup buku)". Stok 0 → "Tidak ada stok barang".
- Bahan kopi, alat, dan barang yang tidak dijual tidak dihitung. Angka ini tidak masuk untung jualan maupun uang bersih.
- Di bawahnya kartu Saldo Kantong Kantin (dengan setor/tarik sejak tutup buku).

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
| `Bbahan`, `Bbarang`, `Blain` | Belanja per kategori |

Menu yang dihitung di suatu periode: menu aktif, ditambah menu nonaktif yang punya tap, belanja, atau stok di periode itu.

### 5.2 Racikan (per menu m)
```
terjual_m       = Σ delta tap terjual
sendiri_m       = Σ delta tap sendiri
omzet_seh_m     = Σ tap terjual × jual_m(t)
untung_m        = Σ tap terjual × (jual_m(t) − hpp_m(t)) − Σ tap sendiri × hpp_m(t)
nilai_sendiri_m = Σ tap sendiri × hpp_m(t)
```

### 5.2b Barang jadi (per menu b)
```
stok_awal_b   = sisa pada tutup buku sebelumnya (stok_json)
beli_b        = Σ pcs belanja barang b di periode
terjual_b     = stok_awal_b + beli_b − sendiri_b − sisa_b
avg_modal_b   = (stok_awal_b × avg_lalu_b + belanja_b) / (stok_awal_b + beli_b)   // rata-rata tertimbang periodik
omzet_seh_b   = terjual_b × jual_b(saat tutup buku)
untung_b      = terjual_b × (jual_b − avg_modal_b) − sendiri_b × avg_modal_b
```
Kalau terjual negatif → tampilkan peringatan (kemungkinan salah input). `{ sisa, avgModal }` tiap barang disimpan di
`tutup_buku.stok_json` dan berantai ke periode berikutnya.

### 5.3 Uang bersih (uang nyata)
```
omzet_nyata = (S1 − S0) + (C − C0) − M + T + Bk
uang_bersih = omzet_nyata − B
```
- `Bp` masuk ke `B` (biaya), tetapi tidak memengaruhi saldo → otomatis setara setor modal.
- Pasti, tapi naik-turun mengikuti hari belanja. Dijumlah semua periode = posisi balik modal (§4.1).
- Tidak bergantung HPP: mengubah resep / harga bahan tidak mengubah uang bersih, omzet, maupun selisih.
- Nilai stok barang jadi **tidak** masuk angka mana pun (hanya info di rincian & Uang & Barang).

### 5.3b Untung jualan (perkiraan per item, angka utama)
```
untung_jualan = Σ untung semua menu
```
- **Konsumsi pribadi = biaya**: yang dikonsumsi sendiri mengurangi untung (bahannya habis, uang tidak kembali).
  Contoh: jual 3 kopi (10.000, HPP 7.000) → +9.000; minum 1 → −7.000; untung 2.000.
- `Blain` (biasanya alat) tidak masuk untung jualan, tetapi masuk uang bersih & balik modal.
- Takaran resep diisi worst case, jadi untung sebenarnya bisa lebih besar. Jangka panjang ≈ uang bersih bila HPP akurat.

### 5.4 Pembanding (seharusnya)
```
omzet_seharusnya = Σ omzet_seh semua menu
selisih          = omzet_nyata − omzet_seharusnya     // negatif = uang hilang
```
- Selisih hanya diketahui **total**, tidak bisa dipisah per menu.

### 5.5 Contoh tampilan laporan
```
Untung jualan periode ini        +3.515
Uang bersih +59.000 · ✅ Uang masuk sesuai hitungan
──────────────────────────────────────────
Untung jualan (perkiraan per item)
☕ Kopi Susu SKM                  +1.000
   5 terjual × (10.000 − 7.000)  +15.000
   2 diminum sendiri × 7.000     −14.000
🍫 Beng Beng                      +2.515
   3 terjual × (3.000 − 2.162)    +2.515
Untung jualan                     +3.515
📦 Belanja lain-lain (bila ada)   −13.798  (masuk balik modal, bukan untung jualan)
──────────────────────────────────────────
Uang bersih
Omzet nyata (dari saldo)          59.000
Belanja (bahan / barang jadi / lain)  −0
Uang bersih                      +59.000
──────────────────────────────────────────
Omzet: seharusnya vs nyata (per menu), lalu Rincian (stok per barang, racikan, uang)
```

## 6. Data Model (SQLite / Turso)

Semua nominal disimpan dalam **integer rupiah**. Semua waktu disimpan dalam epoch ms UTC, ditampilkan dalam **Asia/Jakarta**.
Tidak ada foreign key di level DB; kolom `*_id` hanya rujukan.

```
settings
  key TEXT PK, value TEXT            -- pin_hash, setup_done, pin_gagal, tunda_pengingat

menu
  id, nama, jenis ('racikan' | 'barang_jadi'), aktif BOOL, urutan INTEGER

bahan
  id, nama, satuan ('gr' | 'pcs'), harga_awal REAL (per satuan)

resep                                -- riwayat; berlaku pada t = baris terakhir dengan berlaku_mulai ≤ t
  id, menu_id, berlaku_mulai, isi_json ([{ bahanId, takaran }])

bahan_aktif                          -- pembelian aktif pada t = baris terakhir dengan mulai ≤ t
  id, bahan_id, belanja_id NULL, mulai

harga                                -- harga jual, riwayat
  id, menu_id, nilai INTEGER, berlaku_mulai

tap_event
  id, waktu, menu_id, jenis ('terjual' | 'sendiri'), delta INTEGER (+1 / −1 / N manual), manual BOOL

belanja
  id, waktu, kategori ('bahan' | 'barang' | 'lain'), nama TEXT,
  bahan_id NULL (bahan; NULL = belanja lama belum ditandai), menu_id NULL (barang),
  isi_kemasan REAL NULL, jumlah_kemasan INTEGER NULL, qty_pcs INTEGER NULL (barang = jumlah × isi),
  total INTEGER, sumber ('kantong' | 'pribadi'), catatan TEXT NULL

kas
  id, waktu, jenis ('setor' | 'tarik'), nominal INTEGER, catatan TEXT NULL

tutup_buku
  id, waktu, saldo_kantong INTEGER, cash_belum_disetor INTEGER DEFAULT 0,
  stok_json TEXT                     -- { [menuId]: { sisa, avgModal } } barang jadi
  hasil_json TEXT                    -- snapshot seluruh angka laporan
```
Setup awal disimpan sebagai `tutup_buku` pertama (periode ke-0) berisi saldo awal.

**Migrasi data lama** (`drizzle/0002`, `0003`): menu "Kopi" (racikan, id 1) dan "Beng Beng" (barang jadi, id 2);
harga jual lama dipindah ke `menu_id` (baris HPP dibuang); tap `kopi`/`kopi_sendiri`/`bb_sendiri` → (Kopi, terjual/sendiri),
(Beng Beng, sendiri); belanja `bb` → `barang` (isi = `isi_per_dus`), `kopi` → `bahan` dengan `bahan_id` kosong;
`sisa_bb`/`avg_modal_bb` → `stok_json`. Instalasi baru: tanpa menu. Setelah migrasi pengguna membuat bahan, menandai
belanja lama, mengisi resep, lalu "Hitung ulang semua laporan".

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
- Stok bahan kopi (hanya perkiraan "habis setelah N cup" per kemasan aktif, §4.6)
- Multi-user / multi-cabang
- Mode offline (tap disimpan dulu saat tidak ada sinyal), kandidat fitur berikutnya
- Aplikasi Flutter terpisah

## 10. Pertanyaan Terbuka

- Kopi gratis / tester / terbuang dicatat sebagai **sendiri** (tidak ada tombol terpisah).
- Jika harga jual barang jadi berubah di tengah periode, omzet seharusnya memakai harga saat tutup buku. Sarankan: ubah harga tepat saat tutup buku.
- Perlu ekspor data (CSV) untuk backup?
