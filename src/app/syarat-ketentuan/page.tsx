import type { Metadata } from "next";
import Link from "next/link";
import { TombolInstagram } from "@/components/footer-pembeli";
import { Bagian, Daftar, HalamanLegal } from "@/components/halaman-legal";
import { JAM_OPERASIONAL, NAMA_KANTIN, PENGELOLA } from "@/lib/katalog";

export const metadata: Metadata = {
  title: `Syarat & Ketentuan · ${NAMA_KANTIN}`,
  description: `Syarat dan ketentuan pemesanan kopi dan camilan di ${NAMA_KANTIN}.`,
};

const tautan = "font-semibold underline underline-offset-4";

/** Halaman publik (tanpa login), dibutuhkan untuk review payment gateway. */
export default function SyaratKetentuanPage() {
  return (
    <HalamanLegal
      judul="Syarat & Ketentuan"
      pembuka={
        <>
          Halaman ini mengatur pemesanan dan pembayaran di {NAMA_KANTIN} lewat website ini. Dengan membuat pesanan, kamu
          dianggap sudah membaca dan setuju dengan ketentuan di bawah, termasuk{" "}
          <Link href="/kebijakan-pengembalian" className={tautan}>
            Kebijakan Pengembalian Dana
          </Link>
          .
        </>
      }
    >
      <Bagian judul="1. Tentang penjual">
        <p>
          {NAMA_KANTIN} adalah usaha kecil perorangan yang dikelola oleh {PENGELOLA}, menjual kopi racikan dan camilan
          kemasan untuk rekan-rekan di lingkungan kantor. Kami tidak melayani pengiriman ke luar kantor.
        </p>
      </Bagian>

      <Bagian judul="2. Produk dan harga">
        <Daftar>
          <li>Produk kami: kopi racikan (dibuat saat dipesan) dan camilan kemasan seperti wafer dan biskuit.</li>
          <li>
            Semua harga ditulis dalam Rupiah (Rp) dan sudah final, tanpa biaya tambahan. Kisaran harga: kopi Rp6.000–Rp10.000
            per gelas, camilan Rp1.500–Rp3.000 per bungkus.
          </li>
          <li>
            Harga dan menu yang tersedia bisa berubah sewaktu-waktu. Harga yang berlaku adalah harga yang tampil saat kamu
            membuat pesanan.
          </li>
          <li>Foto produk hanya ilustrasi; tampilan asli bisa sedikit berbeda.</li>
        </Daftar>
      </Bagian>

      <Bagian judul="3. Cara pesan">
        <Daftar>
          <li>Buka halaman menu dari HP, pilih produk, lalu masuk ke keranjang.</li>
          <li>
            Isi nama, lalu pilih <b>Pickup</b> (ambil sendiri di kantin) atau <b>Delivery</b> (diantar ke mejamu di
            lingkungan kantor). Untuk Delivery, tulis lokasi meja di kolom catatan agar mudah ditemukan.
          </li>
          <li>Pesanan hanya bisa dibuat saat status di halaman menu menunjukkan &ldquo;Buka&rdquo;.</li>
          <li>Status pesanan (dibayar, sedang dibuat, siap, selesai) bisa dipantau di halaman pesanan dan Riwayat pesanan.</li>
        </Daftar>
      </Bagian>

      <Bagian judul="4. Pembayaran">
        <Daftar>
          <li>Pesanan dibayar di muka, sebelum dibuat. Kami tidak menerima bayar di tempat untuk pesanan dari website.</li>
          <li>
            Pembayaran diproses oleh payment gateway pihak ketiga, <b>Midtrans</b>, dengan metode QRIS (bisa dibayar dari
            GoPay, OVO, DANA, ShopeePay, atau m-banking) dan GoPay.
          </li>
          <li>Pesanan baru diproses setelah pembayaran dinyatakan berhasil oleh Midtrans.</li>
        </Daftar>
      </Bagian>

      <Bagian judul="5. Pembatalan pesanan yang belum dibayar">
        <p>
          Pesanan yang belum dibayar dalam <b>15 menit</b> sejak dibuat otomatis dibatalkan (kedaluwarsa), tanpa biaya
          apa pun. Kamu bisa membuat pesanan baru kapan saja selama kantin buka. Pesanan yang sudah dibayar mengikuti{" "}
          <Link href="/kebijakan-pengembalian" className={tautan}>
            Kebijakan Pengembalian Dana
          </Link>
          .
        </p>
      </Bagian>

      <Bagian judul="6. Jam operasional">
        <p>
          {JAM_OPERASIONAL}. Sewaktu-waktu kantin bisa tutup lebih awal (misalnya stok habis); status terkini selalu tampil
          di halaman menu.
        </p>
      </Bagian>

      <Bagian judul="7. Data pribadi">
        <Daftar>
          <li>
            Nama dan catatan (misalnya lokasi meja) yang kamu isi hanya dipakai untuk membuat dan mengantar pesanan, dan tidak dibagikan ke
            pihak lain.
          </li>
          <li>
            Data pembayaran (misalnya akun e-wallet atau rekening) diproses langsung oleh Midtrans. Kami tidak menerima
            maupun menyimpan data tersebut; kami hanya menerima status apakah pembayaran berhasil.
          </li>
          <li>Riwayat pesanan disimpan di HP kamu (cookie) agar bisa dilihat kembali, dan bisa kamu bersihkan sendiri.</li>
        </Daftar>
      </Bagian>

      <Bagian judul="8. Perubahan ketentuan">
        <p>
          Kami dapat memperbarui Syarat &amp; Ketentuan ini sewaktu-waktu. Versi terbaru selalu ada di halaman ini, dengan
          tanggal pembaruan di bagian atas.
        </p>
      </Bagian>

      <Bagian judul="9. Kontak">
        <p>Untuk pertanyaan, komplain, atau pengajuan pengembalian dana, hubungi kami lewat DM Instagram:</p>
        <div className="flex items-center gap-3">
          <TombolInstagram />
          <span>Kirim DM ke Instagram {NAMA_KANTIN}.</span>
        </div>
      </Bagian>
    </HalamanLegal>
  );
}
