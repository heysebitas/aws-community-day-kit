import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TEMAS, contraste, derivarTema, resolverTema } from "@/config/temas";

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
