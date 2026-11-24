import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

/**
 * Los scripts que se importan en las pruebas y también se corren a mano tienen
 * que ejecutarse cuando se llaman directamente, en cualquier sistema. Si la
 * comprobación falla (en Windows, `file://` + ruta nunca coincide con
 * `import.meta.url`), terminan con éxito sin haber hecho nada.
 */
const RAIZ = path.resolve(__dirname, "..");

// Una dirección que no responde: el script tiene que intentar conectarse y fallar.
const ENTORNO = { ...process.env, MONGODB_URI: "mongodb://127.0.0.1:1/prueba?serverSelectionTimeoutMS=500" };

for (const script of ["migrar-pasaporte.mjs", "rellenar-busqueda.mjs"]) {
  test(`${script} se ejecuta al llamarlo directamente`, () => {
    const r = spawnSync(process.execPath, [path.join(RAIZ, "scripts", script), "--dry-run"], {
      cwd: RAIZ, env: ENTORNO, encoding: "utf8", timeout: 30_000,
    });
    assert.notEqual(r.status, 0, "terminó sin error y sin base: no se ejecutó");
    assert.match(r.stderr, /ECONNREFUSED|ServerSelection|connect/i);
  });
}
