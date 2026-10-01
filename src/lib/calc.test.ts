// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hargaBahanPada,
  hargaPada,
  hitungBep,
  hitungPeriode,
  hppPada,
  pemakaianBahan,
  untungDariTap,
  type HargaRow,
  type HppCtx,
  type MenuDef,
  type PeriodeData,
  type TapData,
} from "./calc.ts";

const KOPI = 1;
const BB = 2;
const menu: MenuDef[] = [
  { id: KOPI, nama: "Kopi", jenis: "racikan", aktif: true, urutan: 1 },
  { id: BB, nama: "Beng Beng", jenis: "barang_jadi", aktif: true, urutan: 2 },
];
const harga: HargaRow[] = [
  { menuId: BB, nilai: 3000, berlakuMulai: 0 },
  { menuId: KOPI, nilai: 10000, berlakuMulai: 0 },
];

/** HPP kopi tetap: satu bahan "paket" 1 pcs per cup dengan harga awal `hpp`. */
const hppTetap = (hpp: number): HppCtx => ({
  bahan: [{ id: 1, hargaAwal: hpp }],
  resep: [{ menuId: KOPI, berlakuMulai: 0, isi: [{ bahanId: 1, takaran: 1 }] }],
  aktif: [],
  belanja: [],
});

const taps = (menuId: number, jenis: "terjual" | "sendiri", n: number, waktu = 100): TapData[] =>
  Array.from({ length: n }, () => ({ menuId, jenis, delta: 1, waktu }));

const data = (d: Partial<PeriodeData>): PeriodeData => ({
  belanja: [],
  kas: [],
  taps: [],
  harga,
  menu,
  hpp: hppTetap(6428),
  ...d,
});

const m = (h: ReturnType<typeof hitungPeriode>, id: number) => h.menu.find((x) => x.id === id)!;

test("periode normal tanpa kebocoran: selisih 0, uang bersih & untung jualan", () => {
  const h = hitungPeriode(
    { saldoKantong: 0, cashBelumDisetor: 0, stok: { [BB]: { sisa: 17, avgModal: 36500 / 17 } } },
    { waktu: 1000, saldoKantong: 582000, cashBelumDisetor: 0, sisa: { [BB]: 3 } },
    data({
      belanja: [
        { kategori: "barang", menuId: BB, qtyPcs: 17, total: 38000, sumber: "kantong" },
        { kategori: "bahan", menuId: null, qtyPcs: null, total: 20000, sumber: "kantong" },
        { kategori: "bahan", menuId: null, qtyPcs: null, total: 15000, sumber: "pribadi" },
      ],
      kas: [{ jenis: "setor", nominal: 300000 }],
      taps: [...taps(KOPI, "terjual", 25), ...taps(KOPI, "sendiri", 2), ...taps(BB, "sendiri", 1)],
    }),
  );

  assert.equal(m(h, BB).terjual, 30);
  assert.equal(m(h, KOPI).terjual, 25);
  assert.equal(h.omzetNyata, 340000);
  assert.equal(h.omzetSeharusnya, 340000);
  assert.equal(h.selisih, 0);
  assert.equal(h.belanjaTotal, 73000);
  assert.equal(h.uangBersih, 340000 - 73000);
  // kopi: 25 × (10.000 − 6.428) − 2 × 6.428
  assert.equal(m(h, KOPI).untung, 89300 - 12856);
  // bb: avg modal = (17 × 36.500/17 + 38.000) / 34; 30 × (3.000 − avg) − 1 × avg
  assert.equal(m(h, BB).untung, Math.round(30 * 3000 - 31 * (74500 / 34)));
  assert.equal(h.untungJualan, m(h, KOPI).untung + m(h, BB).untung);
  assert.equal(h.stok[BB].sisa, 3);
  assert.equal(h.stok[BB].avgModal, 74500 / 34);
  assert.deepEqual(h.peringatan, []);
});

test("uang hilang muncul sebagai selisih negatif", () => {
  const h = hitungPeriode(
    { saldoKantong: 100000, cashBelumDisetor: 0, stok: { [BB]: { sisa: 10, avgModal: 2000 } } },
    { waktu: 1000, saldoKantong: 125000, cashBelumDisetor: 0, sisa: { [BB]: 5 } },
    data({ taps: taps(KOPI, "terjual", 2) }),
  );
  // seharusnya 2×10.000 + 5×3.000 = 35.000, nyata 25.000
  assert.equal(h.omzetSeharusnya, 35000);
  assert.equal(h.selisih, -10000);
});

test("tarik dan cash belum disetor ikut dihitung sebagai omzet", () => {
  const h = hitungPeriode(
    { saldoKantong: 50000, cashBelumDisetor: 5000, stok: {} },
    { waktu: 1000, saldoKantong: 40000, cashBelumDisetor: 20000, sisa: {} },
    data({ kas: [{ jenis: "tarik", nominal: 30000 }], taps: taps(KOPI, "terjual", 3) }),
  );
  // (40.000 − 50.000) + (20.000 − 5.000) + 30.000 = 35.000
  assert.equal(h.omzetNyata, 35000);
  assert.equal(h.selisih, 5000);
});

test("harga jual mengikuti waktu tap", () => {
  const h2: HargaRow[] = [...harga, { menuId: KOPI, nilai: 12000, berlakuMulai: 500 }];
  assert.equal(hargaPada(h2, KOPI, 499), 10000);
  assert.equal(hargaPada(h2, KOPI, 500), 12000);

  const h = hitungPeriode(
    { saldoKantong: 0, cashBelumDisetor: 0, stok: {} },
    { waktu: 1000, saldoKantong: 0, cashBelumDisetor: 0, sisa: {} },
    data({ taps: [...taps(KOPI, "terjual", 15, 100), ...taps(KOPI, "terjual", 10, 600)], harga: h2 }),
  );
  assert.equal(m(h, KOPI).omzetSeharusnya, 270000);
});

test("sisa lebih banyak dari stok memunculkan peringatan", () => {
  const h = hitungPeriode(
    { saldoKantong: 0, cashBelumDisetor: 0, stok: { [BB]: { sisa: 5, avgModal: 2000 } } },
    { waktu: 1000, saldoKantong: 0, cashBelumDisetor: 0, sisa: { [BB]: 8 } },
    data({}),
  );
  assert.equal(m(h, BB).terjual, -3);
  assert.equal(h.peringatan.length, 1);
});

test("contoh pengguna: jual 3 kopi, minum 1 → untung kopi 2.000", () => {
  const h = hitungPeriode(
    { saldoKantong: 0, cashBelumDisetor: 0, stok: {} },
    { waktu: 1000, saldoKantong: 30000, cashBelumDisetor: 0, sisa: {} },
    data({ taps: [...taps(KOPI, "terjual", 3), ...taps(KOPI, "sendiri", 1)], hpp: hppTetap(7000) }),
  );
  assert.equal(m(h, KOPI).untung, 2000);
  assert.equal(h.untungJualan, 2000);
  // konsumsi sendiri tidak menambah uang bersih
  assert.equal(h.uangBersih, 30000);
});

test("untung dari tap: HPP per waktu tap, barang jadi sendiri dikurangi modal", () => {
  const ctx: HppCtx = { ...hppTetap(6428), aktif: [{ bahanId: 1, belanjaId: 9, mulai: 500 }], belanja: [{ id: 9, total: 7000, isiKemasan: 1, jumlahKemasan: 1 }] };
  const t = [...taps(KOPI, "terjual", 1, 100), ...taps(KOPI, "terjual", 1, 600), ...taps(BB, "sendiri", 2, 600)];
  // (10.000 − 6.428) + (10.000 − 7.000) − 2 × 2.000
  assert.equal(untungDariTap(t, { harga, menu, hpp: ctx }, { [BB]: { sisa: 5, avgModal: 2000 } }), 3572 + 3000 - 4000);
});

test("belanja lain masuk uang bersih, tidak masuk untung jualan", () => {
  const h = hitungPeriode(
    { saldoKantong: 50000, cashBelumDisetor: 0, stok: {} },
    { waktu: 1000, saldoKantong: 70000, cashBelumDisetor: 0, sisa: {} },
    data({ belanja: [{ kategori: "lain", menuId: null, qtyPcs: null, total: 13798, sumber: "pribadi" }], taps: taps(KOPI, "terjual", 2) }),
  );
  assert.equal(h.untungJualan, 2 * (10000 - 6428));
  assert.equal(h.uangBersih, 20000 - 13798);
});

// ─── HPP dari resep + pembelian aktif ──────────────────────────────

// Data rujukan pengguna (CR-003)
const SUSU = 1, KOPIB = 2, CREAMER = 3, SKM = 4, AREN = 5, CUP = 6;
const rujukan: HppCtx = {
  bahan: [SUSU, KOPIB, CREAMER, SKM, AREN, CUP].map((id) => ({ id, hargaAwal: 1 })),
  resep: [
    { menuId: 10, berlakuMulai: 0, isi: [{ bahanId: SUSU, takaran: 100 }, { bahanId: KOPIB, takaran: 4 }, { bahanId: CREAMER, takaran: 10 }, { bahanId: SKM, takaran: 20 }, { bahanId: CUP, takaran: 1 }] },
    { menuId: 11, berlakuMulai: 0, isi: [{ bahanId: SUSU, takaran: 100 }, { bahanId: KOPIB, takaran: 4 }, { bahanId: CREAMER, takaran: 10 }, { bahanId: AREN, takaran: 20 }, { bahanId: CUP, takaran: 1 }] },
  ],
  belanja: [
    { id: 2, total: 21500, isiKemasan: 1030, jumlahKemasan: 1 },
    { id: 3, total: 15000, isiKemasan: 20, jumlahKemasan: 1 }, // nescafe, tidak aktif
    { id: 6, total: 48400, isiKemasan: 100, jumlahKemasan: 1 },
    { id: 9, total: 48000, isiKemasan: 500, jumlahKemasan: 1 },
    { id: 10, total: 20000, isiKemasan: 535, jumlahKemasan: 1 },
    { id: 4, total: 18199, isiKemasan: 325, jumlahKemasan: 1 },
    { id: 8, total: 22100, isiKemasan: 50, jumlahKemasan: 1 },
  ],
  aktif: [
    { bahanId: SUSU, belanjaId: 2, mulai: 0 },
    { bahanId: KOPIB, belanjaId: 6, mulai: 0 },
    { bahanId: CREAMER, belanjaId: 9, mulai: 0 },
    { bahanId: SKM, belanjaId: 10, mulai: 0 },
    { bahanId: AREN, belanjaId: 4, mulai: 0 },
    { bahanId: CUP, belanjaId: 8, mulai: 0 },
  ],
};

test("HPP data rujukan pengguna: SKM 6.173, gula aren 6.545", () => {
  assert.equal(Math.round(hppPada(rujukan, 10, 5000)), 6173);
  assert.equal(Math.round(hppPada(rujukan, 11, 5000)), 6545);
});

test("pembelian aktif: beli kopi B tidak mengubah HPP sampai 'Pakai ini', lalu hanya untuk tap sesudahnya", () => {
  // Kopi B dibeli (Rp750/gr) tapi belum dipakai
  const beliB = { ...rujukan, belanja: [...rujukan.belanja, { id: 20, total: 15000, isiKemasan: 20, jumlahKemasan: 1 }] };
  assert.equal(hargaBahanPada(beliB, KOPIB, 5000), 484);
  assert.equal(Math.round(hppPada(beliB, 10, 5000)), 6173);

  // "Pakai ini" mulai waktu 3000
  const pakai = { ...beliB, aktif: [...beliB.aktif, { bahanId: KOPIB, belanjaId: 20, mulai: 3000 }] };
  assert.equal(Math.round(hppPada(pakai, 10, 2999)), 6173);
  assert.equal(Math.round(hppPada(pakai, 10, 3000)), 6173 - 1936 + 3000);

  // Ganti di tengah periode: tap sebelum & sesudah memakai HPP masing-masing
  const h = hitungPeriode(
    { saldoKantong: 0, cashBelumDisetor: 0, stok: {} },
    { waktu: 9000, saldoKantong: 0, cashBelumDisetor: 0, sisa: {} },
    data({
      menu: [{ id: 10, nama: "Kopi Susu SKM", jenis: "racikan", aktif: true, urutan: 1 }],
      harga: [{ menuId: 10, nilai: 10000, berlakuMulai: 0 }],
      hpp: pakai,
      taps: [...taps(10, "terjual", 2, 1000), ...taps(10, "terjual", 1, 4000)],
    }),
  );
  const hpp1 = hppPada(pakai, 10, 1000);
  const hpp2 = hppPada(pakai, 10, 4000);
  assert.equal(h.menu[0].modalTerjual, Math.round(2 * hpp1 + hpp2));
  assert.equal(h.untungJualan, Math.round(30000 - 2 * hpp1 - hpp2));
});

test("harga awal dipakai bila belum ada pembelian aktif", () => {
  const ctx: HppCtx = { bahan: [{ id: 1, hargaAwal: 750 }], resep: [{ menuId: 1, berlakuMulai: 0, isi: [{ bahanId: 1, takaran: 4 }] }], aktif: [], belanja: [] };
  assert.equal(hppPada(ctx, 1, 100), 3000);
});

test("perubahan resep berlaku sejak waktu diubah", () => {
  const ctx: HppCtx = {
    bahan: [{ id: 1, hargaAwal: 20 }],
    resep: [
      { menuId: 1, berlakuMulai: 0, isi: [{ bahanId: 1, takaran: 100 }] },
      { menuId: 1, berlakuMulai: 500, isi: [{ bahanId: 1, takaran: 120 }] },
    ],
    aktif: [],
    belanja: [],
  };
  assert.equal(hppPada(ctx, 1, 499), 2000);
  assert.equal(hppPada(ctx, 1, 500), 2400);
  assert.equal(hppPada(ctx, 2, 500), 0); // menu tanpa resep
});

test("dua barang jadi dengan stok masing-masing", () => {
  const CHIKI = 3;
  const menu3: MenuDef[] = [...menu, { id: CHIKI, nama: "Chiki", jenis: "barang_jadi", aktif: true, urutan: 3 }];
  const h = hitungPeriode(
    { saldoKantong: 0, cashBelumDisetor: 0, stok: { [BB]: { sisa: 10, avgModal: 2000 } } },
    { waktu: 1000, saldoKantong: 0, cashBelumDisetor: 0, sisa: { [BB]: 4, [CHIKI]: 5 } },
    data({
      menu: menu3,
      harga: [...harga, { menuId: CHIKI, nilai: 2000, berlakuMulai: 0 }],
      belanja: [{ kategori: "barang", menuId: CHIKI, qtyPcs: 20, total: 24000, sumber: "kantong" }],
      taps: taps(CHIKI, "sendiri", 1),
    }),
  );
  assert.equal(m(h, BB).terjual, 6);
  assert.equal(m(h, BB).untung, 6 * 1000);
  assert.equal(m(h, CHIKI).terjual, 14);
  assert.equal(m(h, CHIKI).avgModal, 1200);
  assert.equal(m(h, CHIKI).untung, 14 * 800 - 1200);
  assert.deepEqual(h.stok, { [BB]: { sisa: 4, avgModal: 2000 }, [CHIKI]: { sisa: 5, avgModal: 1200 } });
  assert.equal(h.omzetSeharusnya, 6 * 3000 + 14 * 2000);
});

test("menu nonaktif tanpa catatan tidak ikut; stok barangnya tetap dibawa", () => {
  const nonaktif: MenuDef[] = menu.map((x) => ({ ...x, aktif: false }));
  const h = hitungPeriode(
    { saldoKantong: 0, cashBelumDisetor: 0, stok: { [BB]: { sisa: 0, avgModal: 2000 } } },
    { waktu: 1000, saldoKantong: 0, cashBelumDisetor: 0, sisa: {} },
    data({ menu: nonaktif }),
  );
  assert.deepEqual(h.menu, []);
  assert.deepEqual(h.stok, { [BB]: { sisa: 0, avgModal: 2000 } });
});

test("pemakaian bahan: hanya menu yang resepnya memakai bahan itu", () => {
  const t = [...taps(10, "terjual", 3, 100), ...taps(11, "sendiri", 2, 100), ...taps(BB, "sendiri", 4, 100)];
  assert.deepEqual(pemakaianBahan(rujukan, t, SKM), { cup: 3, satuan: 60 });
  assert.deepEqual(pemakaianBahan(rujukan, t, SUSU), { cup: 5, satuan: 500 });
});

// ─── Balik modal ───────────────────────────────────────────────────

test("posisi BEP = Σ uang bersih semua periode", () => {
  const p1 = hitungPeriode(
    { saldoKantong: 10000, cashBelumDisetor: 0, stok: {} },
    { waktu: 1000, saldoKantong: 45000, cashBelumDisetor: 0, sisa: { [BB]: 10 } },
    data({
      belanja: [
        { kategori: "barang", menuId: BB, qtyPcs: 20, total: 40000, sumber: "pribadi" },
        { kategori: "bahan", menuId: null, qtyPcs: null, total: 25000, sumber: "kantong" },
      ],
      kas: [{ jenis: "setor", nominal: 20000 }],
      taps: taps(KOPI, "terjual", 4),
    }),
  );
  const p2 = hitungPeriode(
    { saldoKantong: 45000, cashBelumDisetor: 0, stok: p1.stok },
    { waktu: 2000, saldoKantong: 60000, cashBelumDisetor: 0, sisa: { [BB]: 2 } },
    data({ kas: [{ jenis: "tarik", nominal: 10000 }], taps: taps(KOPI, "terjual", 1) }),
  );
  const bep = hitungBep({ saldoAwal: 10000, cashAwal: 0, setor: 20000, belanjaPribadi: 40000, saldoTerakhir: 60000, cashTerakhir: 0, tarik: 10000 });
  assert.equal(bep.modalMasuk, 70000);
  assert.equal(bep.uangKembali, 70000);
  assert.equal(bep.posisi, p1.uangBersih + p2.uangBersih);
});

test("posisi BEP data pengguna 1 Okt 2026", () => {
  const bep = hitungBep({ saldoAwal: 0, cashAwal: 0, setor: 0, belanjaPribadi: 339259, saldoTerakhir: 125000, cashTerakhir: 0, tarik: 0 });
  assert.equal(bep.posisi, -216159 - 46100 - 11000 + 59000);
  assert.equal(bep.posisi, -214259);
});
