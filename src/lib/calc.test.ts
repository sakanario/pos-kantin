// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { hargaPada, hitungPeriode, type HargaRow } from "./calc.ts";

const harga: HargaRow[] = [
  { produk: "bb", jenis: "jual", nilai: 3000, berlakuMulai: 0 },
  { produk: "kopi", jenis: "jual", nilai: 10000, berlakuMulai: 0 },
  { produk: "kopi", jenis: "hpp", nilai: 6428, berlakuMulai: 0 },
];

const taps = (jenis: "kopi" | "kopi_sendiri" | "bb_sendiri", n: number, waktu = 100) =>
  Array.from({ length: n }, () => ({ jenis, delta: 1, waktu }));

test("periode normal tanpa kebocoran: selisih 0, profit = omzet − HPP barang terjual", () => {
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
  // 340.000 − (30 × 2.191,18) − (35.000 − 2 × 6.428)
  assert.equal(h.profit, 252121);
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
