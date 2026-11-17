import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEMAS, aRgb, variablesDeTema, contraste, derivarTema, resolverTema } from "@/config/temas";

const HEX = /^#[0-9A-F]{6}$/i;

describe("los temas", () => {
  for (const [nombre, tema] of Object.entries(TEMAS)) {
    it(`${nombre}: el acento aguanta texto negro y el profundo se lee encima`, () => {
      for (const color of Object.values(tema)) assert.match(color, HEX);
      assert.ok(contraste(tema.acento, "#000000") >= 7, `acento ${contraste(tema.acento, "#000000").toFixed(2)}:1`);
      assert.ok(contraste(tema.profundo, tema.acento) >= 4.5, `profundo ${contraste(tema.profundo, tema.acento).toFixed(2)}:1`);
    });
  }
});

describe("un tema a partir de un color", () => {
  // Del más oscuro al más claro: ninguno puede dejar texto ilegible.
  for (const color of ["#000080", "#12AB34", "#8B0000", "#FF9900", "#FFFFFF", "#333"]) {
    it(`${color} cumple los dos contrastes`, () => {
      const tema = derivarTema(color);
      for (const c of Object.values(tema)) assert.match(c, HEX);
      assert.ok(contraste(tema.acento, "#000000") >= 7);
      assert.ok(contraste(tema.profundo, tema.acento) >= 4.5);
    });
  }

  it("un color que ya sirve no se toca", () => {
    assert.equal(derivarTema("#FF9900").acento, "#FF9900");
  });
});

describe("resolverTema", () => {
  it("acepta un nombre, un color o los cuatro a mano", () => {
    assert.equal(resolverTema("naranja"), TEMAS.naranja);
    assert.equal(resolverTema("#FF9900").acento, "#FF9900");
    const propio = { acento: "#7CF2B0", claro: "#B8F8D4", fuerte: "#3DDC84", profundo: "#0B5D36" };
    assert.equal(resolverTema(propio), propio);
  });

  it("un nombre que no existe dice cuáles hay", () => {
    assert.throws(() => resolverTema("fucsia" as never), /naranja/);
  });
});

// Lo que pinta el bloque claro encima del acento (ver `.form-block` en globals.css):
// texto secundario al 70 %, borde de los controles al 75 % y el rojo de error.
describe("el bloque claro se lee con cualquier tema", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const error = css.match(/--color-error:\s*(#[0-9A-F]{6})/i)?.[1] ?? "";
  const sobre = (acento: string, alfa: number) => {
    const [r, g, b] = aRgb(acento).map((v) => Math.round(v * (1 - alfa)));
    return "#" + [r, g, b].map((v) => v!.toString(16).padStart(2, "0")).join("");
  };
  const temas = [
    ...Object.entries(TEMAS),
    ...["#000080", "#12AB34", "#8B0000", "#333"].map((c) => [c, derivarTema(c)] as const),
  ];

  it("globals.css usa los valores que aquí se comprueban", () => {
    assert.match(error, HEX);
    assert.match(css, /\.form-block \.text-surface-600 \{ color: rgb\(var\(--tinta-rgb\) \/ 0\.7\)/);
    assert.match(css, /border: 2px solid rgb\(var\(--tinta-rgb\) \/ 0\.75\)/);
  });

  for (const [nombre, tema] of temas) {
    it(`${nombre}: secundario, borde de control y error`, () => {
      assert.ok(contraste(sobre(tema.acento, 0.7), tema.acento) >= 4.5, "tinta al 70 %");
      assert.ok(contraste(sobre(tema.acento, 0.75), tema.acento) >= 3, "borde al 75 %");
      assert.ok(contraste(error, tema.acento) >= 4.5, `error ${contraste(error, tema.acento).toFixed(2)}:1`);
    });
  }
});

describe("variables -rgb del tema", () => {
  it("todos los temas definen tinta y papel para rgb(var(--x-rgb) / a)", () => {
    for (const t of [...Object.values(TEMAS), derivarTema("#12AB34")]) {
      const v = variablesDeTema(t);
      assert.match(v["--tema-acento-rgb"]!, /^\d+ \d+ \d+$/);
      assert.equal(v["--tinta-rgb"], "0 0 0");
      assert.equal(v["--papel-rgb"], "255 255 255");
    }
  });
});
