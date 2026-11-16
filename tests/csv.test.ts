import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { csvResponse, csvRow, escapeCsv } from "@/lib/csv";

/** El CSV que sale de los exportes: ni fórmulas que se ejecuten ni acentos rotos. */

describe("neutralizar fórmulas", () => {
  test("una celda que empieza por = no sale como fórmula", () => {
    assert.equal(escapeCsv("=1+1"), "'=1+1");
  });

  test("también con +, - y @", () => {
    assert.equal(escapeCsv("+1+1"), "'+1+1");
    assert.equal(escapeCsv("-1+1"), "'-1+1");
    assert.equal(escapeCsv("@SUM(A1)"), "'@SUM(A1)");
  });

  test("con tabulador o retorno al principio también", () => {
    assert.equal(escapeCsv("\t=1+1"), "'\t=1+1");
    // El retorno obliga a entrecomillar la celda.
    assert.equal(escapeCsv("\r=1+1"), "\"'\r=1+1\"");
  });

  test("una celda normal no cambia", () => {
    assert.equal(escapeCsv("Ana Pérez"), "Ana Pérez");
    assert.equal(escapeCsv(""), "");
  });

  test("el apóstrofo no se cuela donde no toca", () => {
    // Sólo al principio: un texto que lo lleva en medio es inocuo.
    assert.equal(escapeCsv("Ana=María"), "Ana=María");
  });
});

describe("escapar comillas y saltos de línea", () => {
  test("entrecomilla si lleva coma", () => {
    assert.equal(escapeCsv("Madrid, España"), '"Madrid, España"');
  });

  test("duplica las comillas del valor", () => {
    assert.equal(escapeCsv('habló de "IA"'), '"habló de ""IA"""');
  });

  test("entrecomilla si lleva salto de línea", () => {
    assert.equal(escapeCsv("uno\ndos"), '"uno\ndos"');
  });

  test("una fórmula con coma también queda entrecomillada", () => {
    assert.equal(escapeCsv("=1,1"), "\"'=1,1\"");
  });
});

describe("armar una fila", () => {
  test("las celdas van separadas por comas", () => {
    assert.equal(csvRow(["a", "b", "c"]), "a,b,c");
  });

  test("lo que falta sale como celda vacía", () => {
    assert.equal(csvRow(["a", null, undefined, "b"]), "a,,,b");
  });

  test("una celda con coma no rompe la fila", () => {
    assert.equal(csvRow(["Madrid, España", "x"]), '"Madrid, España",x');
  });
});

describe("la respuesta del CSV", () => {
  test("el tipo y el nombre del archivo", () => {
    const res = csvResponse("a,b", "x.csv");
    assert.equal(res.headers.get("Content-Type"), "text/csv; charset=utf-8");
    assert.equal(res.headers.get("Content-Disposition"), 'attachment; filename="x.csv"');
  });

  test("el cuerpo lleva la marca al principio", async () => {
    const res = csvResponse("Ana Pérez", "x.csv");
    // Se mira en bytes: al leer el texto, Node y el navegador se comen la
    // marca y el test no vería lo que Excel recibe.
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "falta la marca de orden de bytes");
    const cuerpo = new TextDecoder().decode(bytes.slice(3));
    assert.equal(cuerpo, "Ana Pérez", "el CSV debería ir después de la marca");
  });
});
