import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { MENSAJES_COMUN, MENSAJES_RUTA } from "../src/i18n/mensajes-cliente";

const RAIZ = path.resolve(import.meta.dirname, "..");
const SRC = path.join(RAIZ, "src");
const LOCALE = path.join(SRC, "app", "[locale]");

function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? ficheros(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

function resolver(desde: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(desde), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Todo lo que se alcanza importando desde `entradas`. */
function alcanzables(entradas: string[]): Set<string> {
  const vistos = new Set<string>();
  const pila = [...entradas];
  while (pila.length) {
    const f = pila.pop()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const r = resolver(f, m[1]!);
      if (r) pila.push(r);
    }
  }
  return vistos;
}

/** Namespaces que piden los componentes cliente de un conjunto de ficheros. */
function usadosEnCliente(fs: Iterable<string>): Map<string, string[]> {
  const usados = new Map<string, string[]>();
  for (const f of fs) {
    const src = readFileSync(f, "utf8");
    if (!/^\s*["']use client["']/.test(src)) continue;
    for (const m of src.matchAll(/useTranslations\(\s*(?:["']([^"']+)["'])?\s*\)/g)) {
      // Sin namespace pediría el catálogo entero: no es verificable.
      const ns = (m[1] ?? "").split(".")[0]!;
      usados.set(ns, [...(usados.get(ns) ?? []), path.relative(RAIZ, f)]);
    }
  }
  return usados;
}

function comprobar(nombre: string, fs: Iterable<string>, cubiertos: readonly string[]) {
  const faltan = [...usadosEnCliente(fs)].filter(([ns]) => !cubiertos.includes(ns));
  assert.deepEqual(
    faltan.map(([ns, donde]) => `${ns} (${[...new Set(donde)].join(", ")})`),
    [],
    `${nombre}: namespaces de componentes cliente que su provider no lleva`,
  );
}

const rutasPropias = Object.keys(MENSAJES_RUTA);
const delLocale = ficheros(LOCALE);
const enRuta = (f: string, r: string) => path.relative(LOCALE, f).split(path.sep)[0] === r;

test("el layout raíz lleva los namespaces de los componentes cliente comunes", () => {
  const entradas = delLocale.filter((f) => !rutasPropias.some((r) => enRuta(f, r)));
  comprobar("layout raíz", alcanzables(entradas), MENSAJES_COMUN);
});

for (const [ruta, lista] of Object.entries(MENSAJES_RUTA)) {
  test(`la ruta ${ruta} monta su provider y cubre sus componentes cliente`, () => {
    const layout = readFileSync(path.join(LOCALE, ruta, "layout.tsx"), "utf8");
    assert.ok(layout.includes(`ruta="${ruta}"`), `${ruta}/layout.tsx no monta <MensajesDeRuta ruta="${ruta}">`);
    if (lista === "todo") return;
    comprobar(`ruta ${ruta}`, alcanzables(delLocale.filter((f) => enRuta(f, ruta))), lista);
  });
}
