import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const leer = (p: string) => readFileSync(p, "utf8");

test("la FAQ usa details/summary y no desmonta las respuestas", () => {
  const src = leer("src/components/ui/accordion.tsx");
  assert.match(src, /<details/);
  assert.match(src, /<summary/);
  assert.doesNotMatch(src, /AnimatePresence/);
});

test("la barra de progreso usa animation-timeline con respaldo", () => {
  const src = leer("src/components/ui/scroll-progress.tsx");
  assert.match(src, /CSS\.supports\("animation-timeline/);
  assert.match(src, /addEventListener\("scroll"/);
  assert.doesNotMatch(src, /from "motion/);
});

test("el globo cancela el rAF al salir de pantalla", () => {
  const src = leer("src/components/effects/wire-globe.tsx");
  assert.match(src, /if \(!visible\) \{\s*cancelAnimationFrame\(raf\)/);
});

test("el lienzo del panel escucha pointercancel", () => {
  const src = leer("src/app/[locale]/admin/speakers/canvas/_lienzo.tsx");
  assert.match(src, /addEventListener\("pointercancel", soltar\)/);
  assert.match(src, /removeEventListener\("pointercancel", soltar\)/);
});

test("el manifest tiene id y scope, y ningún maskable sin zona segura", () => {
  const src = leer("src/app/manifest.ts");
  assert.match(src, /id: "\/"/);
  assert.match(src, /scope: "\/"/);
  // El icono de 512 no deja zona segura: como maskable se recortaría.
  assert.doesNotMatch(src, /purpose: "maskable"/);
});
