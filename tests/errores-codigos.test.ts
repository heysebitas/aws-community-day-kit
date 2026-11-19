import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { textoDeError } from "@/lib/errores-cliente";

/** Los códigos de error de la API y su traducción en `Errores`. */

const RAIZ = path.resolve(__dirname, "..");
const mensajes = (l: string) => JSON.parse(fs.readFileSync(path.join(RAIZ, "src/messages", `${l}.json`), "utf8")).Errores as Record<string, string>;

function rutas(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? rutas(p) : /^route\.tsx?$/.test(d.name) ? [p] : [];
  });
}

describe("códigos de error", () => {
  test("todo `code` que devuelve una ruta tiene texto en es y en en", () => {
    const usados = new Set<string>();
    for (const f of rutas(path.join(RAIZ, "src/app/api"))) {
      for (const m of fs.readFileSync(f, "utf8").matchAll(/\bcode: "([a-z_]+)"/g)) usados.add(m[1]!);
    }
    const api = fs.readFileSync(path.join(RAIZ, "src/lib/api.ts"), "utf8");
    for (const m of api.matchAll(/"([a-z_]+)"/g)) if (/^(no_autenticado|sin_permiso|entrada_invalida|error_interno)$/.test(m[1]!)) usados.add(m[1]!);
    assert.ok(usados.size > 20, "no se encontraron los códigos");
    for (const l of ["es", "en"]) {
      const t = mensajes(l);
      assert.deepEqual([...usados].filter((c) => !t[c]), [], `faltan en Errores (${l})`);
    }
  });

  test("es y en tienen las mismas claves", () => {
    assert.deepEqual(Object.keys(mensajes("es")).sort(), Object.keys(mensajes("en")).sort());
  });
});

describe("textoDeError", () => {
  const t = Object.assign(
    (k: string, v?: Record<string, string | number>) => (mensajes("en")[k] ?? k).replace("{id}", String(v?.id ?? "")),
    { has: (k: string) => k in mensajes("en") },
  );

  test("traduce el código y deja el texto en español como respaldo", () => {
    assert.equal(textoDeError(t, { code: "pin_incorrecto", error: "PIN incorrecto" }, "x"), "Wrong PIN.");
    assert.equal(textoDeError(t, { error: "Algo en español" }, "x"), "Algo en español");
    assert.equal(textoDeError(t, { code: "inventado" }, "respaldo"), "respaldo");
    assert.equal(textoDeError(t, null, "respaldo"), "respaldo");
  });

  test("un 500 lleva la referencia de la petición", () => {
    const r = textoDeError(t, { code: "error_interno", error: "Error interno", requestId: "abc-123" }, "x");
    assert.match(r, /abc-123/);
  });

  test("datos_invalidos conserva el detalle del servidor", () => {
    assert.equal(textoDeError(t, { code: "datos_invalidos", error: "El teléfono no es válido" }, "x"), "El teléfono no es válido");
    assert.equal(textoDeError(t, { code: "datos_invalidos" }, "x"), "Check the form data.");
  });
});
