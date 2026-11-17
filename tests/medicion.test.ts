import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import {
  comparar,
  extraerLighthouse,
  formatearComparacion,
  jsDePrimeraCarga,
  mediana,
  resumirPasadas,
} from "../scripts/medir-lib.mjs";

describe("medición", () => {
  test("mediana: impar, par, vacío y valores no numéricos", () => {
    assert.equal(mediana([3, 1, 2]), 2);
    assert.equal(mediana([4, 1, 3, 2]), 2.5);
    assert.equal(mediana([null, 5, undefined]), 5);
    assert.equal(mediana([]), null);
  });

  test("extraerLighthouse pasa puntuaciones a 0-100 y el peso a KB", () => {
    const m = extraerLighthouse({
      categories: { performance: { score: 0.84 }, accessibility: { score: 0.96 }, seo: { score: 1 } },
      audits: {
        "first-contentful-paint": { numericValue: 2300 },
        "largest-contentful-paint": { numericValue: 4000 },
        "total-blocking-time": { numericValue: 130 },
        "cumulative-layout-shift": { numericValue: 0.01 },
        "total-byte-weight": { numericValue: 425 * 1024 },
      },
    });
    assert.deepEqual(m, { rendimiento: 84, accesibilidad: 96, seo: 100, fcp: 2300, lcp: 4000, tbt: 130, cls: 0.01, peso: 425 });
  });

  test("resumirPasadas toma la mediana de cada métrica", () => {
    const r = resumirPasadas([
      { lcp: 4000, cls: 0.01 },
      { lcp: 3000, cls: 0.03 },
      { lcp: 9000, cls: 0.02 },
    ]);
    assert.deepEqual(r, { lcp: 4000, cls: 0.02 });
  });

  test("comparar marca regresiones según el sentido de cada métrica", () => {
    const base = { paginas: { "/": { rendimiento: 84, lcp: 4000, js: 300 } } };
    const peor = { paginas: { "/": { rendimiento: 70, lcp: 4100, js: 340 }, "/otra": { rendimiento: 1 } } };
    const filas = comparar(peor, base);
    const por = Object.fromEntries(filas.map((f) => [f.metrica, f]));
    assert.equal(filas.length, 3, "las páginas que no están en la base se ignoran");
    assert.equal(por.rendimiento.regresion, true);
    assert.equal(por.lcp.regresion, false, "100 ms está dentro de la tolerancia");
    assert.equal(por.js.regresion, true);
    const mejor = comparar({ paginas: { "/": { rendimiento: 95, lcp: 2000, js: 200 } } }, base);
    assert.ok(mejor.every((f) => !f.regresion));
  });

  test("formatearComparacion nombra las regresiones", () => {
    const base = { paginas: { "/": { rendimiento: 84 } } };
    assert.match(formatearComparacion(comparar({ paginas: { "/": { rendimiento: 60 } } }, base)), /REGRESIÓN[\s\S]*1 regresión/);
    assert.match(formatearComparacion(comparar(base, base)), /Sin regresiones/);
    assert.match(formatearComparacion([]), /Nada que comparar/);
  });

  test("jsDePrimeraCarga suma el gzip de los scripts de /_next/ y avisa de los que faltan", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "medir-"));
    try {
      mkdirSync(path.join(dir, "static/chunks"), { recursive: true });
      const contenido = "console.log('x');".repeat(500);
      writeFileSync(path.join(dir, "static/chunks/a.js"), contenido);
      const html =
        '<script src="/_next/static/chunks/a.js?dpl=1" async=""></script><script src="/_next/static/chunks/a.js"></script>' +
        '<script src="/_next/static/chunks/falta.js"></script><script src="https://otro.example/x.js"></script>';
      const r = jsDePrimeraCarga(html, dir);
      assert.equal(r.ficheros, 2);
      assert.deepEqual(r.faltan, ["static/chunks/falta.js"]);
      assert.equal(r.kb, gzipSync(contenido).length / 1024);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("el script sale con código distinto de 0 si falta --url", () => {
    const r = spawnSync(process.execPath, ["scripts/medir.mjs"], { encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--url/);
  });
});

describe("fuentes y CSS del build", () => {
  test("el HTML de la portada precarga como mucho las tres fuentes", (t) => {
    const dir = ".next/server/app/es.html";
    let html: string;
    try {
      html = readFileSync(dir, "utf8");
    } catch {
      return t.skip("no hay build (.next/server/app/es.html)");
    }
    // Un build anterior al último cambio de las fuentes daría un falso fallo.
    if (statSync(dir).mtimeMs < statSync("src/lib/fonts.ts").mtimeMs) return t.skip("el build es anterior a src/lib/fonts.ts");
    const precargas = html.match(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/g) ?? [];
    assert.ok(precargas.length <= 3, `hay ${precargas.length} fuentes precargadas`);
  });

  test("Handjet se precarga y las tres fuentes usan display swap", () => {
    const src = readFileSync("src/lib/fonts.ts", "utf8");
    const handjet = src.slice(src.indexOf("Handjet({"));
    assert.doesNotMatch(handjet.slice(0, handjet.indexOf("});")), /preload:\s*false/);
    assert.equal((src.match(/display:\s*"swap"/g) ?? []).length, 3);
  });
});
