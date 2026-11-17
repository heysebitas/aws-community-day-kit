import { test } from "node:test";
import assert from "node:assert/strict";
import { toSlug } from "@/lib/slug";

test("toSlug quita tildes, signos y bordes, y recorta a 60", () => {
  assert.equal(toSlug("  Ána Pérez!! "), "ana-perez");
  assert.equal(toSlug("a_b  c"), "a-b-c");
  assert.equal(toSlug("---"), "");
  assert.equal(toSlug("x".repeat(80)).length, 60);
});
