import "./helpers/sin-demo";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "@/app/api/health/route";

const pedir = (query = "", ip = "203.0.113.7") =>
  GET(new Request(`http://localhost/api/health${query}`, { headers: { "x-forwarded-for": ip } }));

describe("GET /api/health", () => {
  test("responde 200 sin datos y sin caché", async () => {
    const r = await pedir();
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await r.json(), { ok: true });
  });

  test("con ?db=1 y sin base responde 503", async () => {
    const previa = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    try {
      const r = await pedir("?db=1", "203.0.113.8");
      assert.equal(r.status, 503);
      assert.equal(r.headers.get("Cache-Control"), "no-store");
      assert.deepEqual(await r.json(), { ok: false });
    } finally {
      if (previa !== undefined) process.env.MONGODB_URI = previa;
    }
  });

  test("pasado el límite responde 429", async () => {
    let ultimo = 200;
    for (let i = 0; i < 130; i++) ultimo = (await pedir("", "203.0.113.9")).status;
    assert.equal(ultimo, 429);
  });
});
