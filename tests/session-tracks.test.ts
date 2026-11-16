import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SIN_TRACK, TRACKS, TRACKS_CON_VACIO, esTrack,
  trackCorto, trackDe, trackHex, trackLabel, trackPublico,
} from "@/data/session-tracks";
import { tracks } from "@evento/tracks";

describe("los tracks de la edición", () => {
  test("hay al menos uno y salen todos", () => {
    assert.ok(tracks.length > 0);
    assert.equal(TRACKS.length, tracks.length);
  });

  test("ninguna clave ni etiqueta se repite", () => {
    for (const campo of ["value", "label", "corto"] as const) {
      const vals = TRACKS.map((t) => t[campo]);
      assert.equal(new Set(vals).size, vals.length, `se repite ${campo}`);
    }
  });

  test("las claves sirven de identificador", () => {
    for (const t of tracks) {
      assert.match(t.id, /^[a-z0-9-]+$/, `«${t.id}» lleva algo más que minúsculas, números y guiones`);
    }
  });

  test("todos traen color de panel, de sitio y hexadecimal", () => {
    for (const t of TRACKS) {
      assert.ok(t.color.trim(), `${t.value} sin color de panel`);
      assert.ok(t.publico.trim(), `${t.value} sin color de sitio`);
      assert.match(t.hex, /^#[0-9A-Fa-f]{6}$/);
    }
  });

  test("el nombre corto cabe en un distintivo", () => {
    for (const t of TRACKS) assert.ok(t.corto.length <= 12, `«${t.corto}» es largo para un distintivo`);
  });

  test("«general» no es un track", () => {
    assert.ok(!TRACKS.some((t) => t.value === SIN_TRACK));
    assert.equal(esTrack(SIN_TRACK), false);
    assert.equal(trackDe(SIN_TRACK), null);
  });
});

describe("resolver un valor guardado", () => {
  test("todos se resuelven", () => {
    for (const t of TRACKS) {
      assert.equal(trackLabel(t.value), t.label);
      assert.equal(trackCorto(t.value), t.corto);
      assert.equal(trackHex(t.value), t.hex);
      assert.equal(trackPublico(t.value), t.publico);
    }
  });

  test("vacío, nulo o inventado no son track", () => {
    for (const v of ["", null, undefined, "inventado"]) {
      assert.equal(esTrack(v), false, `${JSON.stringify(v)} no debería serlo`);
      assert.equal(trackLabel(v), "");
      assert.equal(trackCorto(v), "");
    }
  });

  test("sin track hay color de reserva", () => {
    assert.ok(trackPublico(null).trim());
    assert.match(trackHex(null), /^#[0-9A-Fa-f]{6}$/);
    assert.equal(trackHex(null, "#ABCDEF"), "#ABCDEF");
  });
});

describe("el desplegable del panel", () => {
  test("ofrece «sin track» primero y luego los demás", () => {
    assert.equal(TRACKS_CON_VACIO.length, TRACKS.length + 1);
    assert.equal(TRACKS_CON_VACIO[0].value, SIN_TRACK);
  });
});
