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
      assert.deepEqual(await r.json(), { error: texto });
    }
  });

  test("EntradaInvalida da 400 con su mensaje", async () => {
    const { ruta, EntradaInvalida } = await import("@/lib/api");
    const r = await ruta(async () => { throw new EntradaInvalida("Falta el id"); })();
    assert.equal(r.status, 400);
    assert.deepEqual(await r.json(), { error: "Falta el id" });
  });

  test("lo demás es un 500 genérico que no filtra el mensaje", async () => {
    const { ruta } = await import("@/lib/api");
    const r = await silenciar(() => ruta(async () => { throw new Error("secreto interno"); })());
    assert.equal(r.status, 500);
    assert.deepEqual(await r.json(), { error: "Error interno" });
  });

  test("un Error con el texto «Unauthorized» ya no es un 401", async () => {
    const { ruta } = await import("@/lib/api");
    const r = await silenciar(() => ruta(async () => { throw new Error("Unauthorized"); })());
    assert.equal(r.status, 500);
  });

  test("el mensaje del 500 se puede fijar por ruta", async () => {
    const { ruta } = await import("@/lib/api");
    const r = await silenciar(() => ruta(async () => { throw new Error("x"); }, { error: "Error al subir" })());
    assert.deepEqual(await r.json(), { error: "Error al subir" });
  });
});
