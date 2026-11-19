import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { estadoDeHttp, esTransitorio, esRepeticionPropia, configCamara } from "../src/lib/escaneo-cliente";

describe("mapeo de estados del escáner", () => {
  const casos: [number, string][] = [
    [200, "ok"], [409, "ya"], [401, "sesion"], [403, "permiso"], [404, "no_encontrado"],
    [429, "reintenta"], [500, "reintenta"], [502, "reintenta"], [503, "reintenta"], [0, "reintenta"], [400, "reintenta"],
  ];
  for (const [status, esperado] of casos) {
    test(`${status} → ${esperado}`, () => assert.equal(estadoDeHttp(status), esperado));
  }

  test("solo lo transitorio se reintenta solo", () => {
    for (const s of [0, 429, 500, 503]) assert.equal(esTransitorio(s), true, String(s));
    for (const s of [200, 401, 403, 404, 409]) assert.equal(esTransitorio(s), false, String(s));
  });

  test("un 409 propio de hace menos de 30 s cuenta como éxito", () => {
    const ahora = Date.parse("2026-11-20T10:00:30Z");
    const hace = (s: number) => new Date(ahora - s * 1000).toISOString();
    assert.equal(esRepeticionPropia({ checkedInBy: "u1", checkedInAt: hace(10) }, "u1", ahora), true);
    assert.equal(esRepeticionPropia({ checkedInBy: "u1", checkedInAt: hace(31) }, "u1", ahora), false);
    assert.equal(esRepeticionPropia({ checkedInBy: "u2", checkedInAt: hace(10) }, "u1", ahora), false);
    assert.equal(esRepeticionPropia({ checkedInAt: hace(10) }, "u1", ahora), false);
    assert.equal(esRepeticionPropia({ checkedInBy: "u1", checkedInAt: hace(10) }, undefined, ahora), false);
  });

  test("la cámara es ligera: 10 fps, qrbox 70 % del lado menor y solo QR", () => {
    const c = configCamara();
    assert.equal(c.fps, 10);
    assert.deepEqual(c.qrbox(400, 300), { width: 210, height: 210 });
    assert.deepEqual(c.formatsToSupport, [0]);
  });
});
