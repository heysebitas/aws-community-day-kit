import { test } from "node:test";
import assert from "node:assert/strict";
import { cfpAbierto } from "../src/hooks/cfp-abierto";

const ahora = Date.parse("2026-11-16T12:00:00Z");

test("CFP abierto si el cierre está en el futuro", () => {
  assert.equal(cfpAbierto("2026-12-01T00:00:00Z", ahora), true);
});

test("CFP cerrado si el cierre está en el pasado", () => {
  assert.equal(cfpAbierto("2026-11-01T00:00:00Z", ahora), false);
});

test("CFP sigue abierto justo en el instante del cierre", () => {
  assert.equal(cfpAbierto("2026-11-16T12:00:00Z", ahora), true);
});
