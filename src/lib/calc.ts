// Perhitungan satu periode tutup buku. Lihat spec.md §5.
// Fungsi murni: tidak menyentuh database, supaya mudah dites.

export type HargaRow = {
  produk: "bb" | "kopi";
  jenis: "jual" | "hpp";
  nilai: number;
  berlakuMulai: number;
};

export type PeriodeAwal = {
  saldoKantong: number;
  sisaBb: number;
  cashBelumDisetor: number;
  avgModalBb: number;
};

export type PeriodeAkhir = {
  waktu: number;
  saldoKantong: number;
  sisaBb: number;
  cashBelumDisetor: number;
};

export type PeriodeData = {
  belanja: { kategori: "bb" | "kopi" | "lain"; qtyPcs: number | null; total: number; sumber: "kantong" | "pribadi" }[];
  kas: { jenis: "setor" | "tarik"; nominal: number }[];
  taps: { jenis: "kopi" | "kopi_sendiri" | "bb_sendiri"; delta: number; waktu: number }[];
  harga: HargaRow[];
};

export type HasilPeriode = {
  // Beng Beng
  stokAwalBb: number;
  beliBb: number;
  bbSendiri: number;
  sisaBb: number;
  bbTerjual: number;
  avgModalBbLalu: number;
  avgModalBb: number;
  nilaiStokAwal: number;
  nilaiStokAkhir: number;
  hargaJualBb: number;

  // Kopi
  kopiTerjual: number;
  kopiSendiri: number;

  // Uang
  saldoAwal: number;
  saldoAkhir: number;
  cashAwal: number;
  cashAkhir: number;
  setorModal: number;
  tarik: number;
  belanjaKantong: number;
  belanjaPribadi: number;
  belanjaTotal: number;
  belanjaBb: number;
  belanjaKopi: number;
  belanjaLain: number;

  // Hasil
  omzetNyata: number;
  nilaiPribadiKopi: number;
  nilaiPribadiBb: number;
  nilaiPribadi: number;
  /** Uang nyata: omzet nyata − belanja. Dijumlah semua periode = posisi BEP. */
  uangBersih: number;

  // Untung jualan (perkiraan per cup, pakai HPP). Belanja "lain" tidak masuk.
  hppKopiTerjual: number;
  untungKopi: number;
  untungBb: number;
  untungJualan: number;

  // Pembanding
  omzetKopiSeharusnya: number;
  omzetBbSeharusnya: number;
  omzetSeharusnya: number;
  selisih: number;

  peringatan: string[];
};

/** Harga yang berlaku pada waktu `t`: baris terakhir dengan berlakuMulai <= t. */
export function hargaPada(harga: HargaRow[], produk: HargaRow["produk"], jenis: HargaRow["jenis"], t: number): number {
  let best: HargaRow | undefined;
  for (const h of harga) {
    if (h.produk !== produk || h.jenis !== jenis || h.berlakuMulai > t) continue;
    if (!best || h.berlakuMulai >= best.berlakuMulai) best = h;
  }
  return best?.nilai ?? 0;
}

export function hitungPeriode(awal: PeriodeAwal, akhir: PeriodeAkhir, data: PeriodeData): HasilPeriode {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const peringatan: string[] = [];

  // Belanja
  const belanjaKantong = sum(data.belanja.filter((b) => b.sumber === "kantong").map((b) => b.total));
  const belanjaPribadi = sum(data.belanja.filter((b) => b.sumber === "pribadi").map((b) => b.total));
  const belanjaTotal = belanjaKantong + belanjaPribadi;
  const belanjaBb = sum(data.belanja.filter((b) => b.kategori === "bb").map((b) => b.total));
  const belanjaKopi = sum(data.belanja.filter((b) => b.kategori === "kopi").map((b) => b.total));
  const belanjaLain = sum(data.belanja.filter((b) => b.kategori === "lain").map((b) => b.total));

  // Kas
  const setorModal = sum(data.kas.filter((k) => k.jenis === "setor").map((k) => k.nominal));
  const tarik = sum(data.kas.filter((k) => k.jenis === "tarik").map((k) => k.nominal));

  // Tap
  const tapsOf = (j: string) => data.taps.filter((t) => t.jenis === j);
  const kopiTerjual = sum(tapsOf("kopi").map((t) => t.delta));
  const kopiSendiri = sum(tapsOf("kopi_sendiri").map((t) => t.delta));
  const bbSendiri = sum(tapsOf("bb_sendiri").map((t) => t.delta));

  // Beng Beng
  const stokAwalBb = awal.sisaBb;
  const beliBb = sum(data.belanja.filter((b) => b.kategori === "bb").map((b) => b.qtyPcs ?? 0));
  const bbTerjual = stokAwalBb + beliBb - bbSendiri - akhir.sisaBb;
  const totalUnit = stokAwalBb + beliBb;
  const avgModalBb = totalUnit > 0 ? (stokAwalBb * awal.avgModalBb + belanjaBb) / totalUnit : awal.avgModalBb;
  const nilaiStokAwal = stokAwalBb * awal.avgModalBb;
  const nilaiStokAkhir = akhir.sisaBb * avgModalBb;

  if (bbTerjual < 0) {
    peringatan.push(
      `Beng Beng terjual negatif (${bbTerjual}). Sisa yang diinput lebih banyak dari stok awal + pembelian. Cek lagi sisa stok atau catatan belanja.`,
    );
  }
  if (kopiTerjual < 0) peringatan.push("Jumlah kopi terjual negatif. Cek tombol −1.");

  // Angka utama (uang nyata)
  const omzetNyata =
    akhir.saldoKantong - awal.saldoKantong + (akhir.cashBelumDisetor - awal.cashBelumDisetor) - setorModal + tarik + belanjaKantong;

  const nilaiPribadiKopi = sum(
    tapsOf("kopi_sendiri").map((t) => t.delta * hargaPada(data.harga, "kopi", "hpp", t.waktu)),
  );
  const nilaiPribadiBb = bbSendiri * avgModalBb;
  const nilaiPribadi = nilaiPribadiKopi + nilaiPribadiBb;

  // Konsumsi pribadi tidak dikembalikan: bahannya habis, uangnya tidak kembali.
  const uangBersih = omzetNyata - belanjaTotal;

  // Pembanding
  const omzetKopiSeharusnya = sum(
    tapsOf("kopi").map((t) => t.delta * hargaPada(data.harga, "kopi", "jual", t.waktu)),
  );
  const hargaJualBb = hargaPada(data.harga, "bb", "jual", akhir.waktu);
  const omzetBbSeharusnya = bbTerjual * hargaJualBb;
  const omzetSeharusnya = omzetKopiSeharusnya + omzetBbSeharusnya;
  const selisih = omzetNyata - omzetSeharusnya;

  // Untung jualan: tiap item terjual (harga jual − modal), tiap item dikonsumsi sendiri (− modal)
  const hppKopiTerjual = sum(tapsOf("kopi").map((t) => t.delta * hargaPada(data.harga, "kopi", "hpp", t.waktu)));
  const untungKopi = omzetKopiSeharusnya - hppKopiTerjual - nilaiPribadiKopi;
  const untungBb = omzetBbSeharusnya - bbTerjual * avgModalBb - nilaiPribadiBb;

  const r = Math.round;
  return {
    stokAwalBb,
    beliBb,
    bbSendiri,
    sisaBb: akhir.sisaBb,
    bbTerjual,
    avgModalBbLalu: awal.avgModalBb,
    avgModalBb,
    nilaiStokAwal: r(nilaiStokAwal),
    nilaiStokAkhir: r(nilaiStokAkhir),
    hargaJualBb,
    kopiTerjual,
    kopiSendiri,
    saldoAwal: awal.saldoKantong,
    saldoAkhir: akhir.saldoKantong,
    cashAwal: awal.cashBelumDisetor,
    cashAkhir: akhir.cashBelumDisetor,
    setorModal,
    tarik,
    belanjaKantong,
    belanjaPribadi,
    belanjaTotal,
    belanjaBb,
    belanjaKopi,
    belanjaLain,
    omzetNyata,
    nilaiPribadiKopi: r(nilaiPribadiKopi),
    nilaiPribadiBb: r(nilaiPribadiBb),
    nilaiPribadi: r(nilaiPribadi),
    uangBersih,
    hppKopiTerjual,
    untungKopi: r(untungKopi),
    untungBb: r(untungBb),
    untungJualan: r(untungKopi) + r(untungBb),
    omzetKopiSeharusnya,
    omzetBbSeharusnya,
    omzetSeharusnya,
    selisih,
    peringatan,
  };
}

/**
 * Untung dari tap (tanpa Beng Beng terjual, yang baru diketahui saat tutup buku):
 * kopi terjual × (jual − HPP) − kopi sendiri × HPP − Beng Beng sendiri × modal rata-rata.
 * Harga & HPP kopi mengikuti waktu tap, sama seperti tutup buku.
 */
export function untungDariTap(taps: PeriodeData["taps"], harga: HargaRow[], avgModalBb: number): number {
  let untung = 0;
  for (const t of taps) {
    const hpp = hargaPada(harga, "kopi", "hpp", t.waktu);
    if (t.jenis === "kopi") untung += t.delta * (hargaPada(harga, "kopi", "jual", t.waktu) - hpp);
    else if (t.jenis === "kopi_sendiri") untung -= t.delta * hpp;
    else untung -= t.delta * avgModalBb;
  }
  return Math.round(untung);
}

export type BepInput = {
  saldoAwal: number;
  cashAwal: number;
  setor: number;
  belanjaPribadi: number;
  saldoTerakhir: number;
  cashTerakhir: number;
  tarik: number;
};

/**
 * Balik modal (uang nyata saja, stok tidak dihitung). Sama dengan Σ uangBersih semua periode.
 * posisi < 0 = sisa modal belum kembali; posisi ≥ 0 = untung bersih sejak mulai.
 */
export function hitungBep(i: BepInput) {
  const modalMasuk = i.saldoAwal + i.cashAwal + i.setor + i.belanjaPribadi;
  const uangKembali = i.saldoTerakhir + i.cashTerakhir + i.tarik;
  return { modalMasuk, uangKembali, posisi: uangKembali - modalMasuk };
}
