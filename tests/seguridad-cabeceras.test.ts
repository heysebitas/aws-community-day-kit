import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nombreCookieSesion, leerTokenSesion, COOKIE_SESION_VIEJA } from "@/lib/sesion";

const leer = (ruta: string) => readFileSync(ruta, "utf8");

test("la vista previa usa srcdoc y un sandbox sin allow-scripts", () => {
  const src = leer("src/app/[locale]/admin/correos/_vista.tsx");
  const iframe = /<iframe[\s\S]*?\/>/.exec(src)?.[0] ?? "";
  assert.match(iframe, /srcDoc=\{html\}/);
  const sandbox = /sandbox="([^"]*)"/.exec(iframe);
  assert.ok(sandbox, "el iframe lleva sandbox");
  assert.doesNotMatch(sandbox[1], /allow-scripts/);
  assert.doesNotMatch(src, /doc\.write|document\.write/);
});

test("next.config declara COOP en todo y CORP en /api salvo marca y og", async () => {
  const mod = await import("../next.config");
  const reglas = await (mod.default as { headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> }).headers();
  const todo = reglas.find((r) => r.source === "/:ruta*");
  assert.equal(todo?.headers.find((h) => h.key === "Cross-Origin-Opener-Policy")?.value, "same-origin-allow-popups");

  const api = reglas.find((r) => r.headers.some((h) => h.key === "Cross-Origin-Resource-Policy"));
  assert.ok(api);
  assert.equal(api.headers[0].value, "same-origin");
  const m = /^(\/api\/):ruta\((.*)\)$/.exec(api.source);
  assert.ok(m, "patrón de /api");
  const re = new RegExp(`^${m[2]}$`);
  assert.ok(re.test("agenda"));
  assert.ok(re.test("auth/logout"));
  assert.ok(re.test("marcador"), "un nombre que solo empieza igual sí lleva CORP");
  assert.ok(!re.test("marca"));
  assert.ok(!re.test("marca/logo.png"));
  assert.ok(!re.test("og"));
  assert.ok(!re.test("og/portada"));
});

test("el logout manda Clear-Site-Data en todas sus respuestas", () => {
  const src = leer("src/app/api/auth/logout/route.ts");
  assert.match(src, /"Clear-Site-Data": '"cookies", "storage"'/);
  assert.equal(src.match(/Response\.json\(/g)?.length, src.match(/headers: CABECERAS/g)?.length);
});

test("en producción la cookie es __Host- y se sigue leyendo la vieja", () => {
  assert.equal(nombreCookieSesion(true), "__Host-cd-sesion");
  assert.equal(nombreCookieSesion(false), "cd-sesion");
  const solo = (nombre: string) => (n: string) => (n === nombre ? { value: "t" } : undefined);
  assert.equal(leerTokenSesion(solo(COOKIE_SESION_VIEJA)), "t");
  assert.equal(leerTokenSesion(() => undefined), undefined);
});

test("la cookie se fija con Secure, Path=/ y sin Domain en producción", () => {
  const src = leer("src/lib/auth.ts");
  assert.match(src, /secure: PRODUCCION/);
  assert.match(src, /path: "\/"/);
  assert.doesNotMatch(src, /domain:/i);
});
