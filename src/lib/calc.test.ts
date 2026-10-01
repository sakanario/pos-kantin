// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { hargaPada, hitungBep, hitungPeriode, untungDariTap, type HargaRow } from "./calc.ts";

const harga: HargaRow[] = [
  { produk: "bb", jenis: "jual", nilai: 3000, berlakuMulai: 0 },
  { produk: "kopi", jenis: "jual", nilai: 10000, berlakuMulai: 0 },
  { produk: "kopi", jenis: "hpp", nilai: 6428, berlakuMulai: 0 },
];

const taps = (jenis: "kopi" | "kopi_sendiri" | "bb_sendiri", n: number, waktu = 100) =>
  Array.from({ length: n }, () => ({ jenis, delta: 1, waktu }));

test("periode normal tanpa kebocoran: selisih 0, uang bersih & untung jualan", () => {
  const h = hitungPeriode(
    { saldoKantong: 0, sisaBb: 17, cashBelumDisetor: 0, avgModalBb: 36500 / 17 },
    { waktu: 1000, saldoKantong: 582000, sisaBb: 3, cashBelumDisetor: 0 },
    {
      belanja: [
        { kategori: "bb", qtyPcs: 17, total: 38000, sumber: "kantong" },
        { kategori: "kopi", qtyPcs: null, total: 20000, sumber: "kantong" },
        { kategori: "kopi", qtyPcs: null, total: 15000, sumber: "pribadi" },
      ],
      kas: [{ jenis: "setor", nominal: 300000 }],
      taps: [...taps("kopi", 25), ...taps("kopi_sendiri", 2), ...taps("bb_sendiri", 1)],
      harga,
    },
  );

  assert.equal(h.bbTerjual, 30);
  assert.equal(h.kopiTerjual, 25);
  assert.equal(h.omzetNyata, 340000);
  assert.equal(h.omzetSeharusnya, 340000);
  assert.equal(h.selisih, 0);
  assert.equal(h.belanjaTotal, 73000);
  assert.equal(h.uangBersih, 340000 - 73000);
  // kopi: 25 × (10.000 − 6.428) − 2 × 6.428
  assert.equal(h.untungKopi, 89300 - 12856);
  // bb: avg modal = (17 × 36.500/17 + 38.000) / 34 = 2.191,18; 30 × (3.000 − avg) − 1 × avg
  assert.equal(h.untungBb, Math.round(30 * 3000 - 31 * (74500 / 34)));
  assert.equal(h.untungJualan, h.untungKopi + h.untungBb);
  assert.deepEqual(h.peringatan, []);
});

test("uang hilang muncul sebagai selisih negatif", () => {
  const h = hitungPeriode(
    { saldoKantong: 100000, sisaBb: 10, cashBelumDisetor: 0, avgModalBb: 2000 },
    { waktu: 1000, saldoKantong: 125000, sisaBb: 5, cashBelumDisetor: 0 },
    { belanja: [], kas: [], taps: taps("kopi", 2), harga },
  );
  // seharusnya 2×10.000 + 5×3.000 = 35.000, nyata 25.000
  assert.equal(h.omzetSeharusnya, 35000);
  assert.equal(h.selisih, -10000);
});

test("tarik dan cash belum disetor ikut dihitung sebagai omzet", () => {
  const h = hitungPeriode(
    { saldoKantong: 50000, sisaBb: 0, cashBelumDisetor: 5000, avgModalBb: 2000 },
    { waktu: 1000, saldoKantong: 40000, sisaBb: 0, cashBelumDisetor: 20000 },
    { belanja: [], kas: [{ jenis: "tarik", nominal: 30000 }], taps: taps("kopi", 3), harga },
  );
  // (40.000 − 50.000) + (20.000 − 5.000) + 30.000 = 35.000
  assert.equal(h.omzetNyata, 35000);
  assert.equal(h.selisih, 5000);
});

test("harga kopi mengikuti waktu tap", () => {
  const h2 = [...harga, { produk: "kopi" as const, jenis: "jual" as const, nilai: 12000, berlakuMulai: 500 }];
  assert.equal(hargaPada(h2, "kopi", "jual", 499), 10000);
  assert.equal(hargaPada(h2, "kopi", "jual", 500), 12000);

  const h = hitungPeriode(
    { saldoKantong: 0, sisaBb: 0, cashBelumDisetor: 0, avgModalBb: 0 },
    { waktu: 1000, saldoKantong: 0, sisaBb: 0, cashBelumDisetor: 0 },
    { belanja: [], kas: [], taps: [...taps("kopi", 15, 100), ...taps("kopi", 10, 600)], harga: h2 },
  );
  assert.equal(h.omzetKopiSeharusnya, 270000);
});

test("sisa lebih banyak dari stok memunculkan peringatan", () => {
  const h = hitungPeriode(
    { saldoKantong: 0, sisaBb: 5, cashBelumDisetor: 0, avgModalBb: 2000 },
    { waktu: 1000, saldoKantong: 0, sisaBb: 8, cashBelumDisetor: 0 },
    { belanja: [], kas: [], taps: [], harga },
  );
  assert.equal(h.bbTerjual, -3);
  assert.equal(h.peringatan.length, 1);
});

test("contoh pengguna: jual 3 kopi, minum 1 → untung kopi 2.000", () => {
  const h7: HargaRow[] = [
    { produk: "kopi", jenis: "jual", nilai: 10000, berlakuMulai: 0 },
    { produk: "kopi", jenis: "hpp", nilai: 7000, berlakuMulai: 0 },
  ];
  const h = hitungPeriode(
    { saldoKantong: 0, sisaBb: 0, cashBelumDisetor: 0, avgModalBb: 0 },
    { waktu: 1000, saldoKantong: 30000, sisaBb: 0, cashBelumDisetor: 0 },
    { belanja: [], kas: [], taps: [...taps("kopi", 3), ...taps("kopi_sendiri", 1)], harga: h7 },
  );
  assert.equal(h.untungKopi, 2000);
  assert.equal(h.untungJualan, 2000);
  // konsumsi sendiri tidak menambah uang bersih
  assert.equal(h.uangBersih, 30000);
  assert.equal(untungDariTap([...taps("kopi", 3), ...taps("kopi_sendiri", 1)], h7, 0), 2000);
});

test("untung dari tap: HPP per waktu tap, Beng Beng sendiri dikurangi modal", () => {
  const h2: HargaRow[] = [...harga, { produk: "kopi", jenis: "hpp", nilai: 7000, berlakuMulai: 500 }];
  const t = [...taps("kopi", 1, 100), ...taps("kopi", 1, 600), ...taps("bb_sendiri", 2, 600)];
  // (10.000 − 6.428) + (10.000 − 7.000) − 2 × 2.000
  assert.equal(untungDariTap(t, h2, 2000), 3572 + 3000 - 4000);
});

test("belanja lain masuk uang bersih, tidak masuk untung jualan", () => {
  const h = hitungPeriode(
    { saldoKantong: 50000, sisaBb: 0, cashBelumDisetor: 0, avgModalBb: 0 },
    { waktu: 1000, saldoKantong: 70000, sisaBb: 0, cashBelumDisetor: 0 },
    { belanja: [{ kategori: "lain", qtyPcs: null, total: 13798, sumber: "pribadi" }], kas: [], taps: taps("kopi", 2), harga },
  );
  assert.equal(h.untungJualan, 2 * (10000 - 6428));
  assert.equal(h.uangBersih, 20000 - 13798);
});

test("posisi BEP = Σ uang bersih semua periode", () => {
  // setup: saldo 10.000; periode 1 belanja pribadi + setor; periode 2 tarik
  const p1 = hitungPeriode(
    { saldoKantong: 10000, sisaBb: 0, cashBelumDisetor: 0, avgModalBb: 0 },
    { waktu: 1000, saldoKantong: 45000, sisaBb: 10, cashBelumDisetor: 0 },
    {
      belanja: [
        { kategori: "bb", qtyPcs: 20, total: 40000, sumber: "pribadi" },
        { kategori: "kopi", qtyPcs: null, total: 25000, sumber: "kantong" },
      ],
      kas: [{ jenis: "setor", nominal: 20000 }],
      taps: taps("kopi", 4),
      harga,
    },
  );
  const p2 = hitungPeriode(
    { saldoKantong: 45000, sisaBb: 10, cashBelumDisetor: 0, avgModalBb: p1.avgModalBb },
    { waktu: 2000, saldoKantong: 60000, sisaBb: 2, cashBelumDisetor: 0 },
    { belanja: [], kas: [{ jenis: "tarik", nominal: 10000 }], taps: taps("kopi", 1), harga },
  );
  const bep = hitungBep({
    saldoAwal: 10000,
    cashAwal: 0,
    setor: 20000,
    belanjaPribadi: 40000,
    saldoTerakhir: 60000,
    cashTerakhir: 0,
    tarik: 10000,
  });
  assert.equal(bep.modalMasuk, 70000);
  assert.equal(bep.uangKembali, 70000);
  assert.equal(bep.posisi, p1.uangBersih + p2.uangBersih);
});

test("posisi BEP data pengguna 1 Okt 2026", () => {
  const bep = hitungBep({ saldoAwal: 0, cashAwal: 0, setor: 0, belanjaPribadi: 339259, saldoTerakhir: 125000, cashTerakhir: 0, tarik: 0 });
  assert.equal(bep.posisi, -216159 - 46100 - 11000 + 59000);
  assert.equal(bep.posisi, -214259);
});
