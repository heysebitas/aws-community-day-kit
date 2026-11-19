import { test, describe } from "node:test";
import assert from "node:assert/strict";

/** El envoltorio de las rutas de la API. */

const silenciar = async <T>(f: () => Promise<T>) => {
  const antes = console.error;
  console.error = () => {};
  try { return await f(); } finally { console.error = antes; }
};

describe("ruta()", () => {
  test("deja pasar la respuesta y los argumentos", async () => {
    const { ruta } = await import("@/lib/api");
    const h = ruta(async (a: number, b: number) => Response.json({ suma: a + b }));
    assert.deepEqual(await (await h(1, 2)).json(), { suma: 3 });
  });

  test("AuthError sale con su código y su texto", async () => {
    const { ruta } = await import("@/lib/api");
    const { AuthError } = await import("@/lib/auth");
    for (const [status, texto] of [[401, "Unauthorized"], [403, "Forbidden"]] as const) {
      const r = await ruta(async () => { throw new AuthError(status); })();
      assert.equal(r.status, status);
      assert.deepEqual(await r.json(), { code: status === 401 ? "no_autenticado" : "sin_permiso", error: texto });
    }
  });

  test("EntradaInvalida da 400 con su mensaje", async () => {
    const { ruta, EntradaInvalida } = await import("@/lib/api");
    const r = await ruta(async () => { throw new EntradaInvalida("Falta el id"); })();
    assert.equal(r.status, 400);
    assert.deepEqual(await r.json(), { code: "entrada_invalida", error: "Falta el id" });
  });

  test("lo demás es un 500 genérico que no filtra el mensaje", async () => {
    const { ruta } = await import("@/lib/api");
    const r = await silenciar(() => ruta(async () => { throw new Error("secreto interno"); })());
    assert.equal(r.status, 500);
    const cuerpo = await r.json();
    assert.equal(cuerpo.code, "error_interno");
    assert.equal(cuerpo.error, "Error interno");
    assert.equal(cuerpo.requestId, r.headers.get("x-request-id"));
  });

  test("un Error con el texto «Unauthorized» ya no es un 401", async () => {
    const { ruta } = await import("@/lib/api");
    const r = await silenciar(() => ruta(async () => { throw new Error("Unauthorized"); })());
    assert.equal(r.status, 500);
  });

  test("el mensaje del 500 se puede fijar por ruta", async () => {
    const { ruta } = await import("@/lib/api");
    const r = await silenciar(() => ruta(async () => { throw new Error("x"); }, { error: "Error al subir" })());
    const c = await r.json();
    assert.equal(c.error, "Error al subir");
  });

  test("pone x-request-id: el que llega, o uno nuevo", async () => {
    const { ruta } = await import("@/lib/api");
    const h = ruta(async (_req: Request) => Response.json({ ok: true }));
    const dado = await h(new Request("http://x/", { headers: { "x-request-id": "abc-12345678" } }));
    assert.equal(dado.headers.get("x-request-id"), "abc-12345678");
    const nuevo = await h(new Request("http://x/"));
    assert.match(nuevo.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
    const raro = await h(new Request("http://x/", { headers: { "x-request-id": "no valido\u00e9" } }));
    assert.notEqual(raro.headers.get("x-request-id"), "no valido\u00e9");
  });

  test("el id sale en la línea del log del error", async () => {
    const { ruta, logError } = await import("@/lib/api");
    const lineas: unknown[][] = [];
    const antes = console.error;
    console.error = (...a: unknown[]) => { lineas.push(a); };
    try {
      const h = ruta(async (_req: Request) => { logError("sub", new Error("a")); throw new Error("b"); }, { etiqueta: "x GET" });
      await h(new Request("http://x/", { headers: { "x-request-id": "id-de-prueba-1" } }));
    } finally { console.error = antes; }
    assert.equal(lineas.length, 2);
    for (const l of lineas) assert.match(String(l[0]), /^\[id-de-prueba-1\]/);
  });
});
