import type { Metadata } from "next";
import Link from "next/link";
import { KontakPenjual } from "@/components/footer-pembeli";
import { Bagian, Daftar, HalamanLegal } from "@/components/halaman-legal";
import { HARI_REFUND, NAMA_KANTIN } from "@/lib/katalog";

export const metadata: Metadata = {
  title: `Kebijakan Pengembalian Dana · ${NAMA_KANTIN}`,
  description: `Kapan dan bagaimana dana pesanan di ${NAMA_KANTIN} dikembalikan.`,
};

const tautan = "font-semibold underline underline-offset-4";

/** Halaman publik (tanpa login), dibutuhkan untuk review payment gateway. */
export default function KebijakanPengembalianPage() {
  return (
    <HalamanLegal
      judul="Kebijakan Pengembalian Dana"
      pembuka={
        <>
          Halaman ini menjelaskan kapan uang pesananmu dikembalikan (refund) dan bagaimana caranya. Kebijakan ini bagian
          dari{" "}
          <Link href="/syarat-ketentuan" className={tautan}>
            Syarat &amp; Ketentuan
          </Link>{" "}
          {NAMA_KANTIN}.
        </>
      }
    >
      <Bagian judul="1. Refund penuh (100%)">
        <p>Uang yang sudah kamu bayar dikembalikan seluruhnya jika:</p>
        <Daftar>
          <li>pesanan tidak bisa kami penuhi, misalnya stok habis atau kantin tutup setelah kamu membayar;</li>
          <li>pembayaran terpotong dua kali (ganda) untuk pesanan yang sama; kelebihannya kami kembalikan;</li>
          <li>saldo atau rekeningmu terpotong tetapi pesanan tidak tercatat lunas.</li>
        </Daftar>
        <p>Untuk pesanan yang tidak bisa dipenuhi, kami yang akan menghubungi kamu lebih dulu.</p>
      </Bagian>

      <Bagian judul="2. Produk salah atau rusak">
        <Daftar>
          <li>
            Jika produk yang kamu terima salah, kurang, atau rusak (misalnya kopi tumpah, kemasan camilan rusak), sampaikan
            komplain <b>paling lambat di hari yang sama</b> lewat kontak di bawah.
          </li>
          <li>Sertakan nomor pesanan dan, jika bisa, foto produknya.</li>
          <li>Kami akan mengganti produknya, atau mengembalikan dana sebesar harga produk tersebut jika penggantian tidak memungkinkan.</li>
        </Daftar>
      </Bagian>

      <Bagian judul="3. Yang tidak bisa direfund">
        <Daftar>
          <li>Pesanan yang sudah diterima dan dikonsumsi (diminum atau dimakan).</li>
          <li>Komplain yang disampaikan setelah lewat dari hari pesanan diterima.</li>
          <li>Perubahan selera setelah pesanan selesai dibuat sesuai pilihanmu.</li>
        </Daftar>
      </Bagian>

      <Bagian judul="4. Pesanan yang belum dibayar">
        <p>
          Pesanan yang belum dibayar dalam 15 menit otomatis batal. Karena belum ada uang yang masuk, tidak ada dana yang
          perlu dikembalikan.
        </p>
      </Bagian>

      <Bagian judul="5. Cara dan waktu pengembalian">
        <Daftar>
          <li>Hubungi kami lewat kontak di bawah dengan menyebut nomor pesanan dan alasannya.</li>
          <li>
            Jika disetujui, dana dikembalikan dalam <b>{HARI_REFUND}</b> ke metode pembayaran asal (lewat Midtrans) atau
            ditransfer ke rekening/e-wallet atas nama pembeli.
          </li>
          <li>Jumlah yang dikembalikan sama dengan yang kamu bayar untuk pesanan atau produk tersebut, tanpa potongan.</li>
        </Daftar>
      </Bagian>

      <Bagian judul="6. Kontak">
        <KontakPenjual />
      </Bagian>
    </HalamanLegal>
  );
}
