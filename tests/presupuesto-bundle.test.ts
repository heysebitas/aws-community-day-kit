import test from "node:test";
import assert from "node:assert/strict";
import { compararBundles, formatearBundles } from "../scripts/presupuesto-bundle.mjs";

test("avisa sólo cuando una ruta supera el umbral", () => {
  const filas = compararBundles({ "/": 111, "/registro": 105, "/speakers": 90 }, { "/": 100, "/registro": 100, "/speakers": 100 }, 10);
  assert.deepEqual(filas.map((f: { sube: boolean }) => f.sube), [true, false, false]);
  assert.ok(Math.abs(filas[0]!.pct - 11) < 1e-9);
});

test("exactamente el umbral no cuenta y las rutas sin base se ignoran", () => {
  const filas = compararBundles({ "/": 110, "/nueva": 500 }, { "/": 100 }, 10);
  assert.equal(filas.length, 1);
  assert.equal(filas[0]!.sube, false);
});

test("una base vacía o en cero no divide por cero", () => {
  assert.deepEqual(compararBundles({ "/": 10 }, { "/": 0 }), []);
  assert.match(formatearBundles([]), /Nada que comparar/);
});

test("el informe marca las rutas que superan el umbral", () => {
  const txt = formatearBundles(compararBundles({ "/": 150 }, { "/": 100 }), 10);
  assert.match(txt, /\+50\.0 %\s+SUPERA 10 %/);
});
