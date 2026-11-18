import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

// Con HOSTNAME=127.0.0.1 el router compara la reescritura con `http://127.0.0.1:PUERTO`.
// Si el proxy viera `localhost` (lo que hace Next al normalizar), la reescritura al
// idioma base saldría con otro origen, Next la trataría como externa y el sitio
// acabaría en un 307 a sí mismo.

test("next.config no normaliza la URL que ve el proxy", async () => {
  const mod = await import("../next.config");
  const config = mod.default as { skipProxyUrlNormalize?: boolean };
  assert.equal(config.skipProxyUrlNormalize, true);
});

test("la reescritura al idioma base conserva el origen del servidor", async () => {
  // Es lo que Next deja escrito en el build con `skipProxyUrlNormalize`.
  process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZE = "true";
  const { default: proxy } = await import("../src/proxy");
  const { IDIOMA_BASE } = await import("../src/config");

  for (const origen of ["http://127.0.0.1:3000", "http://[::1]:3000", "http://0.0.0.0:3000"]) {
    const res = proxy(new NextRequest(`${origen}/speakers`));
    const destino = res.headers.get("x-middleware-rewrite");
    assert.ok(destino, `sin reescritura para ${origen}`);
    assert.equal(new URL(destino).origin, origen);
    assert.equal(new URL(destino).pathname, `/${IDIOMA_BASE}/speakers`);
  }
});

test("sin la opción, Next cambia 127.0.0.1 por localhost (la causa del bucle)", () => {
  // Si una versión de Next deja de hacerlo, la opción de next.config sobra.
  const antes = process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZE;
  delete process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZE;
  try {
    assert.equal(new URL(new NextRequest("http://127.0.0.1:3000/speakers").url).host, "localhost:3000");
  } finally {
    process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZE = antes;
  }
});
