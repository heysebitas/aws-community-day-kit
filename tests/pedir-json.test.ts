import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { pedirJson } from "@/lib/pedir-json";

const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });

test("devuelve los datos y manda el cuerpo como JSON", async () => {
  let init: RequestInit | undefined;
  globalThis.fetch = (async (_u: string, i: RequestInit) => { init = i; return Response.json({ a: 1 }); }) as typeof fetch;
  const r = await pedirJson("/x", { method: "POST", body: { b: 2 } });
  assert.deepEqual([r.ok, r.data], [true, { a: 1 }]);
  assert.equal(init?.body, '{"b":2}');
});

test("avisa con el error de la respuesta o con el de por defecto", async () => {
  const avisos: string[] = [];
  globalThis.fetch = (async () => Response.json({ error: "PIN incorrecto" }, { status: 400 })) as typeof fetch;
  const r = await pedirJson("/x", { avisar: (m) => avisos.push(m) });
  assert.deepEqual([r.ok, r.status, r.error], [false, 400, "PIN incorrecto"]);
  globalThis.fetch = (async () => new Response("no json", { status: 500 })) as typeof fetch;
  await pedirJson("/x", { avisar: (m) => avisos.push(m), errorPorDefecto: "falló" });
  assert.deepEqual(avisos, ["PIN incorrecto", "falló"]);
});

test("un corte de red no lanza", async () => {
  globalThis.fetch = (async () => { throw new Error("red"); }) as typeof fetch;
  const r = await pedirJson("/x", { errorDeRed: "sin red" });
  assert.deepEqual([r.ok, r.status, r.error], [false, 0, "sin red"]);
});
