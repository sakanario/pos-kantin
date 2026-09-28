# POS Kantin

Pencatatan profit Beng Beng & Kopi Susu Gula Aren. Desain lengkap ada di [spec.md](spec.md).

## Jalan di laptop

```bash
npm install
cp .env.example .env.local   # lalu isi SESSION_SECRET dengan string acak
npm run db:migrate           # buat tabel di local.db
npm run dev
```

Buka http://localhost:3000. Pertama kali akan diarahkan ke halaman **Setup awal**.

Buka dari HP (satu WiFi): pakai alamat `Network` yang muncul di terminal, misal `http://192.168.x.x:3000`.
IP laptop otomatis diizinkan lewat `allowedDevOrigins` di `next.config.ts`. Kalau IP laptop berubah (pindah WiFi), restart `npm run dev`.

## Data dummy (untuk mencoba)

```bash
npm run seed:dummy   # buat ulang dummy.db: simulasi jualan 27 Jul – hari ini, tutup buku tiap Senin
npm run dev:dummy    # jalankan aplikasi dengan dummy.db (matikan `npm run dev` dulu)
```

`local.db` tidak tersentuh. PIN untuk dummy.db ada di `scripts/seed-dummy.ts`.

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm test` | Tes perhitungan (`src/lib/calc.ts`) |
| `npm run db:generate` | Buat file migrasi setelah mengubah `src/db/schema.ts` |
| `npm run db:migrate` | Terapkan migrasi ke database di `DATABASE_URL` |

## Deploy (Vercel + Turso)

1. Buat database di [Turso](https://turso.tech), lalu ambil URL (`libsql://...`) dan auth token.
2. Terapkan migrasi ke Turso dari laptop:
   ```bash
   DATABASE_URL=libsql://xxx.turso.io DATABASE_AUTH_TOKEN=xxx npm run db:migrate
   ```
3. Import repo ini di Vercel, lalu isi Environment Variables: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`.
4. Setelah deploy, **langsung buka aplikasinya dan selesaikan Setup awal**. Halaman setup terbuka untuk siapa saja sampai setup selesai.
5. Di HP: buka URL-nya → menu browser → **Add to Home Screen**.

## Struktur

```
src/
  lib/calc.ts        rumus tutup buku (fungsi murni, ada tesnya)
  lib/data.ts        query database
  app/actions.ts     semua server action (simpan/hapus/tutup buku)
  app/(app)/         halaman setelah login: beranda, catat, tutup-buku, laporan, setelan
  app/login, setup   halaman tanpa login
  db/schema.ts       skema tabel
```
