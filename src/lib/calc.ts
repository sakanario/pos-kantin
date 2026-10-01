// Perhitungan satu periode tutup buku. Lihat spec.md §5.
// Fungsi murni: tidak menyentuh database, supaya mudah dites.

export type JenisMenu = "racikan" | "barang_jadi";
export type MenuDef = { id: number; nama: string; jenis: JenisMenu; aktif: boolean; urutan: number };

export type HargaRow = { menuId: number; nilai: number; berlakuMulai: number };

/** Bahan baku, resep, dan pembelian aktif: cukup untuk menghitung HPP racikan pada waktu t. */
export type HppCtx = {
  bahan: { id: number; hargaAwal: number }[];
  resep: { menuId: number; berlakuMulai: number; isi: { bahanId: number; takaran: number }[] }[];
  aktif: { bahanId: number; belanjaId: number | null; mulai: number }[];
  belanja: { id: number; total: number; isiKemasan: number | null; jumlahKemasan: number | null }[];
};

export type Stok = Record<number, { sisa: number; avgModal: number }>;

export type PeriodeAwal = {
  saldoKantong: number;
  cashBelumDisetor: number;
  stok: Stok;
};

export type PeriodeAkhir = {
  waktu: number;
  saldoKantong: number;
  cashBelumDisetor: number;
  /** Sisa per barang jadi (input tutup buku). Barang yang tidak diisi dianggap 0. */
  sisa: Record<number, number>;
};

export type TapData = { menuId: number; jenis: "terjual" | "sendiri"; delta: number; waktu: number };

export type PeriodeData = {
  belanja: {
    kategori: "bahan" | "barang" | "lain";
    menuId: number | null;
    qtyPcs: number | null;
    total: number;
    sumber: "kantong" | "pribadi";
  }[];
  kas: { jenis: "setor" | "tarik"; nominal: number }[];
  taps: TapData[];
  harga: HargaRow[];
  menu: MenuDef[];
  hpp: HppCtx;
};

export type HasilMenu = {
  id: number;
  nama: string;
  jenis: JenisMenu;
  terjual: number;
  sendiri: number;
  omzetSeharusnya: number;
  /** Modal barang terjual: racikan Σ terjual × HPP(t), barang jadi terjual × modal rata-rata. */
  modalTerjual: number;
  /** Modal yang dikonsumsi sendiri (mengurangi untung). */
  nilaiSendiri: number;
  untung: number;
  /** Barang jadi saja */
  stokAwal?: number;
  beli?: number;
  sisa?: number;
  avgModalLalu?: number;
  avgModal?: number;
  hargaJual?: number;
  belanja?: number;
  nilaiStokAwal?: number;
  nilaiStokAkhir?: number;
};

export type HasilPeriode = {
  menu: HasilMenu[];
  /** Stok barang jadi di akhir periode (berantai ke periode berikutnya). */
  stok: Stok;

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
  belanjaBahan: number;
  belanjaBarang: number;
  belanjaLain: number;

  // Hasil
  omzetNyata: number;
  /** Uang nyata: omzet nyata − belanja. Dijumlah semua periode = posisi BEP. */
  uangBersih: number;
  /** Untung jualan (perkiraan per cup, pakai HPP). Belanja "lain" tidak masuk. */
  untungJualan: number;
  nilaiPribadi: number;

  // Pembanding
  omzetSeharusnya: number;
  selisih: number;

  peringatan: string[];
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Baris terakhir dengan `mulai(x) <= t` (seri dipecah oleh urutan di array: yang belakangan menang). */
function terakhirPada<T>(rows: T[], mulai: (x: T) => number, t: number): T | undefined {
  let best: T | undefined;
  for (const r of rows) {
    if (mulai(r) > t) continue;
    if (!best || mulai(r) >= mulai(best)) best = r;
  }
  return best;
}

/** Harga jual menu pada waktu `t`. */
export function hargaPada(harga: HargaRow[], menuId: number, t: number): number {
  return terakhirPada(harga.filter((h) => h.menuId === menuId), (h) => h.berlakuMulai, t)?.nilai ?? 0;
}

/** Harga per satuan (gr/pcs) dari satu belanja bahan. */
export function hargaSatuanBelanja(b: { total: number; isiKemasan: number | null; jumlahKemasan: number | null }): number | null {
  const isi = (b.isiKemasan ?? 0) * (b.jumlahKemasan ?? 0);
  return isi > 0 ? b.total / isi : null;
}

/** Harga bahan per satuan pada waktu `t`: dari pembelian aktif, atau harga awal bila belum ada. */
export function hargaBahanPada(ctx: HppCtx, bahanId: number, t: number): number {
  const aktif = terakhirPada(ctx.aktif.filter((a) => a.bahanId === bahanId), (a) => a.mulai, t);
  const b = aktif?.belanjaId != null ? ctx.belanja.find((x) => x.id === aktif.belanjaId) : undefined;
  const dariBelanja = b ? hargaSatuanBelanja(b) : null;
  return dariBelanja ?? ctx.bahan.find((x) => x.id === bahanId)?.hargaAwal ?? 0;
}

/** Resep yang berlaku untuk menu pada waktu `t` (kosong bila belum ada). */
export function resepPada(ctx: HppCtx, menuId: number, t: number) {
  return terakhirPada(ctx.resep.filter((r) => r.menuId === menuId), (r) => r.berlakuMulai, t)?.isi ?? [];
}

/** HPP racikan pada waktu `t` = Σ takaran × harga bahan. */
export function hppPada(ctx: HppCtx, menuId: number, t: number): number {
  return sum(resepPada(ctx, menuId, t).map((r) => r.takaran * hargaBahanPada(ctx, r.bahanId, t)));
}

/** Menu yang ikut dihitung: aktif, atau punya catatan/stok di periode ini. */
function menuTerlibat(data: PeriodeData, awal: PeriodeAwal, akhir: PeriodeAkhir): MenuDef[] {
  const ada = new Set<number>([
    ...data.taps.map((t) => t.menuId),
    ...data.belanja.flatMap((b) => (b.kategori === "barang" && b.menuId != null ? [b.menuId] : [])),
    ...Object.entries(awal.stok)
      .filter(([, s]) => s.sisa !== 0)
      .map(([id]) => Number(id)),
    ...Object.entries(akhir.sisa)
      .filter(([, n]) => n !== 0)
      .map(([id]) => Number(id)),
  ]);
  return data.menu.filter((m) => m.aktif || ada.has(m.id)).sort((a, b) => a.urutan - b.urutan || a.id - b.id);
}

export function hitungPeriode(awal: PeriodeAwal, akhir: PeriodeAkhir, data: PeriodeData): HasilPeriode {
  const peringatan: string[] = [];

  // Belanja
  const belanjaKantong = sum(data.belanja.filter((b) => b.sumber === "kantong").map((b) => b.total));
  const belanjaPribadi = sum(data.belanja.filter((b) => b.sumber === "pribadi").map((b) => b.total));
  const belanjaTotal = belanjaKantong + belanjaPribadi;
  const belanjaKategori = (k: string) => sum(data.belanja.filter((b) => b.kategori === k).map((b) => b.total));

  // Kas
  const setorModal = sum(data.kas.filter((k) => k.jenis === "setor").map((k) => k.nominal));
  const tarik = sum(data.kas.filter((k) => k.jenis === "tarik").map((k) => k.nominal));

  const r = Math.round;
  const stok: Stok = {};
  const menu: HasilMenu[] = menuTerlibat(data, awal, akhir).map((m) => {
    const taps = data.taps.filter((t) => t.menuId === m.id);
    const terjualTap = taps.filter((t) => t.jenis === "terjual");
    const sendiriTap = taps.filter((t) => t.jenis === "sendiri");
    const sendiri = sum(sendiriTap.map((t) => t.delta));

    if (m.jenis === "racikan") {
      const terjual = sum(terjualTap.map((t) => t.delta));
      if (terjual < 0) peringatan.push(`Jumlah ${m.nama} terjual negatif. Cek tombol −1.`);
      const omzetSeharusnya = sum(terjualTap.map((t) => t.delta * hargaPada(data.harga, m.id, t.waktu)));
      const modalTerjual = sum(terjualTap.map((t) => t.delta * hppPada(data.hpp, m.id, t.waktu)));
      const nilaiSendiri = sum(sendiriTap.map((t) => t.delta * hppPada(data.hpp, m.id, t.waktu)));
      return {
        id: m.id,
        nama: m.nama,
        jenis: m.jenis,
        terjual,
        sendiri,
        omzetSeharusnya,
        modalTerjual: r(modalTerjual),
        nilaiSendiri: r(nilaiSendiri),
        untung: r(omzetSeharusnya - modalTerjual - nilaiSendiri),
      };
    }

    // Barang jadi: terjual = stok awal + beli − sendiri − sisa; modal rata-rata tertimbang
    const lalu = awal.stok[m.id] ?? { sisa: 0, avgModal: 0 };
    const belanjaMenu = data.belanja.filter((b) => b.kategori === "barang" && b.menuId === m.id);
    const beli = sum(belanjaMenu.map((b) => b.qtyPcs ?? 0));
    const belanja = sum(belanjaMenu.map((b) => b.total));
    const sisa = akhir.sisa[m.id] ?? 0;
    const terjual = lalu.sisa + beli - sendiri - sisa;
    const totalUnit = lalu.sisa + beli;
    const avgModal = totalUnit > 0 ? (lalu.sisa * lalu.avgModal + belanja) / totalUnit : lalu.avgModal;
    const hargaJual = hargaPada(data.harga, m.id, akhir.waktu);
    stok[m.id] = { sisa, avgModal };

    if (terjual < 0) {
      peringatan.push(
        `${m.nama} terjual negatif (${terjual}). Sisa yang diinput lebih banyak dari stok awal + pembelian. Cek lagi sisa stok atau catatan belanja.`,
      );
    }
    const omzetSeharusnya = terjual * hargaJual;
    const modalTerjual = terjual * avgModal;
    const nilaiSendiri = sendiri * avgModal;
    return {
      id: m.id,
      nama: m.nama,
      jenis: m.jenis,
      terjual,
      sendiri,
      omzetSeharusnya,
      modalTerjual: r(modalTerjual),
      nilaiSendiri: r(nilaiSendiri),
      untung: r(omzetSeharusnya - modalTerjual - nilaiSendiri),
      stokAwal: lalu.sisa,
      beli,
      sisa,
      avgModalLalu: lalu.avgModal,
      avgModal,
      hargaJual,
      belanja,
      nilaiStokAwal: r(lalu.sisa * lalu.avgModal),
      nilaiStokAkhir: r(sisa * avgModal),
    };
  });
  // Barang jadi yang tidak terlibat tetap dibawa ke periode berikutnya
  for (const [id, s] of Object.entries(awal.stok)) if (!(Number(id) in stok)) stok[Number(id)] = s;

  // Angka utama (uang nyata)
  const omzetNyata =
    akhir.saldoKantong - awal.saldoKantong + (akhir.cashBelumDisetor - awal.cashBelumDisetor) - setorModal + tarik + belanjaKantong;
  // Konsumsi pribadi tidak dikembalikan: bahannya habis, uangnya tidak kembali.
  const uangBersih = omzetNyata - belanjaTotal;

  // Pembanding
  const omzetSeharusnya = sum(menu.map((m) => m.omzetSeharusnya));

  return {
    menu,
    stok,
    saldoAwal: awal.saldoKantong,
    saldoAkhir: akhir.saldoKantong,
    cashAwal: awal.cashBelumDisetor,
    cashAkhir: akhir.cashBelumDisetor,
    setorModal,
    tarik,
    belanjaKantong,
    belanjaPribadi,
    belanjaTotal,
    belanjaBahan: belanjaKategori("bahan"),
    belanjaBarang: belanjaKategori("barang"),
    belanjaLain: belanjaKategori("lain"),
    omzetNyata,
    uangBersih,
    untungJualan: sum(menu.map((m) => m.untung)),
    nilaiPribadi: sum(menu.map((m) => m.nilaiSendiri)),
    omzetSeharusnya,
    selisih: omzetNyata - omzetSeharusnya,
    peringatan,
  };
}

/**
 * Untung dari tap (tanpa barang jadi terjual, yang baru diketahui saat tutup buku):
 * racikan terjual × (jual − HPP) − racikan sendiri × HPP − barang jadi sendiri × modal rata-rata.
 * Harga & HPP mengikuti waktu tap, sama seperti tutup buku.
 */
export function untungDariTap(
  taps: TapData[],
  data: { harga: HargaRow[]; menu: MenuDef[]; hpp: HppCtx },
  stok: Stok,
): number {
  let untung = 0;
  for (const t of taps) {
    const m = data.menu.find((x) => x.id === t.menuId);
    if (!m) continue;
    if (m.jenis === "barang_jadi") {
      untung -= t.delta * (stok[m.id]?.avgModal ?? 0);
      continue;
    }
    const hpp = hppPada(data.hpp, m.id, t.waktu);
    untung += t.jenis === "terjual" ? t.delta * (hargaPada(data.harga, m.id, t.waktu) - hpp) : -t.delta * hpp;
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

/**
 * Pemakaian satu bahan: jumlah cup (terjual + sendiri) semua racikan yang resepnya memakai bahan itu
 * pada waktu tap, dan jumlah satuan yang terpakai menurut resep. Untuk perkiraan "habis setelah N cup".
 */
export function pemakaianBahan(ctx: HppCtx, taps: TapData[], bahanId: number) {
  let cup = 0;
  let satuan = 0;
  for (const t of taps) {
    const takaran = resepPada(ctx, t.menuId, t.waktu).find((x) => x.bahanId === bahanId)?.takaran ?? 0;
    if (takaran <= 0) continue;
    cup += t.delta;
    satuan += t.delta * takaran;
  }
  return { cup, satuan };
}
