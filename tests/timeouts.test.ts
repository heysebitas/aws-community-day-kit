import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

// Un servidor que acepta la petición y nunca contesta.
let servidor: http.Server;
let puerto: number;
const fetchOriginal = globalThis.fetch;

before(async () => {
  servidor = http.createServer(() => {});
  await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
  puerto = (servidor.address() as AddressInfo).port;
  // Redirige las llamadas externas al servidor mudo, conservando el signal.
  globalThis.fetch = ((_: unknown, init?: RequestInit) =>
    fetchOriginal(`http://127.0.0.1:${puerto}/`, init)) as typeof fetch;
});

after(() => {
  globalThis.fetch = fetchOriginal;
  servidor.closeAllConnections();
  servidor.close();
});

describe("timeouts de servicios externos", () => {
  test("connectDB falla en ≤ 6 s con una URI inalcanzable", async () => {
    process.env.MONGODB_URI = "mongodb://10.255.255.1:27017/x";
    const { connectDB } = await import("@/lib/db");
    const t = Date.now();
    await assert.rejects(connectDB());
    assert.ok(Date.now() - t <= 6000, `tardó ${Date.now() - t} ms`);
  });

  test("el envío a Resend falla cuando el servidor no responde", async () => {
    process.env.RESEND_API_KEY = "re_prueba";
    process.env.HTTP_TIMEOUT_MS = "500";
    const { sendEmail } = await import("@/lib/correo");
    const t = Date.now();
    const r = await sendEmail({ from: "a@example.com", to: "b@example.com", subject: "x", html: "<p>x</p>" });
    assert.ok(Date.now() - t < 10_000);
    assert.equal(r.id, null);
    assert.ok(r.error);
  });

  test("el captcha falla cerrado cuando el servidor no responde", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secreto-de-prueba";
    process.env.HTTP_TIMEOUT_MS = "500";
    const { verifyCaptcha } = await import("@/lib/captcha");
    const t = Date.now();
    assert.equal(await verifyCaptcha("token-colgado"), false);
    assert.ok(Date.now() - t < 10_000);
  });
});
