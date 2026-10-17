// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ATUR_BAWAAN, bacaAtur, gayaFoto, geserAtur, jenisFoto, rapikanAtur, ruangGeser } from "./foto.ts";

test("bingkai foto: nilai di luar batas dirapikan, JSON rusak = tengah", () => {
  assert.deepEqual(rapikanAtur({ x: -20, y: 140, z: 9 }), { x: 0, y: 100, z: 3 });
  assert.deepEqual(rapikanAtur({ x: "abc", z: 0.2 }), { x: 50, y: 50, z: 1 });
  assert.deepEqual(bacaAtur(null), ATUR_BAWAAN);
  assert.deepEqual(bacaAtur("{rusak"), ATUR_BAWAAN);
  assert.deepEqual(bacaAtur('{"x":30,"y":70,"z":1.5}'), { x: 30, y: 70, z: 1.5 });
});

test("gaya foto: titik fokus jadi object-position & pusat zoom", () => {
  const g = gayaFoto({ x: 30, y: 70, z: 2 });
  assert.equal(g.objectPosition, "30% 70%");
  assert.equal(g.transformOrigin, "30% 70%");
  assert.equal(g.transform, "scale(2)");
  assert.equal(gayaFoto(ATUR_BAWAAN).transform, undefined);
});

test("jenis foto dari byte awal", () => {
  assert.equal(jenisFoto(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
  assert.equal(jenisFoto(webp), "image/webp");
  assert.equal(jenisFoto(new TextEncoder().encode("<svg></svg>")), null);
});

test("ruang geser: foto tegak 3:4 di kotak 280 px hanya bisa digeser atas-bawah sampai di-zoom", () => {
  const u = { w: 600, h: 800 };
  const r1 = ruangGeser(u, 280, 1);
  assert.equal(r1.x, 0);
  assert.ok(Math.abs(r1.y - 93.33) < 0.01); // 800 × 0,4667 − 280
  const r2 = ruangGeser(u, 280, 2);
  assert.equal(r2.x, 280); // 600 × 0,9333 − 280
  assert.equal(ruangGeser(null, 280, 2).x, 0);
});

test("geser: foto bergerak tepat sejauh jari (kiri foto = −x% × ruang)", () => {
  const r = ruangGeser({ w: 600, h: 800 }, 280, 2); // x: 280, y: ~466,7
  const kiri = (x: number) => -(x / 100) * r.x;
  const awal = { x: 50, y: 50 };
  const baru = geserAtur(awal, r, 70, 0);
  assert.ok(Math.abs(kiri(baru.x) - kiri(awal.x) - 70) < 1e-9); // seret 70 px ke kanan → foto 70 px ke kanan
  assert.equal(baru.y, 50);
  assert.equal(geserAtur(awal, { x: 0, y: 10 }, 70, 0).x, 50); // tidak ada ruang ke samping → diam
});
