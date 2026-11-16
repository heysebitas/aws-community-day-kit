import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { GET as mapa } from "@/app/api/email-map/route";
import { GET as reloj } from "@/app/api/countdown/route";
import { componerGif, estadisticas, gifDeLaVentana, VENTANA_MS } from "@/app/api/countdown/gif";
import { EVENTO } from "@/config";

const pedir = (url: string, ip: string) =>
  new Request(url, { headers: { "x-forwarded-for": ip } });

describe("email-map", () => {
  const fetchOriginal = globalThis.fetch;
  let llamadas: string[];

  beforeEach(() => {
    process.env.GOOGLE_MAPS_KEY = "llave-de-prueba";
    llamadas = [];
    globalThis.fetch = (async (url: string) => {
      llamadas.push(String(url));
      return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    delete process.env.GOOGLE_MAPS_KEY;
  });

  test("`q` arbitrario no cambia el centro del mapa", async () => {
    const { lat, lon } = EVENTO.coordenadas;
    const r = await mapa(pedir("https://x.test/api/email-map?q=otra-cosa", "203.0.113.1"));
    assert.equal(r.status, 200);
    assert.equal(llamadas.length, 1);
    const u = new URL(llamadas[0]);
    assert.equal(u.searchParams.get("center"), `${lat},${lon}`);
    assert.ok(!llamadas[0].includes("otra-cosa"));
  });

  test("devuelve 429 al pasar el límite y deja de llamar a Google", async () => {
    let ultimo = 200;
    for (let i = 0; i < 60; i++) {
      ultimo = (await mapa(pedir("https://x.test/api/email-map", "203.0.113.2"))).status;
      if (ultimo === 429) break;
    }
    assert.equal(ultimo, 429);
    assert.ok(llamadas.length < 60);
  });
});

describe("countdown", () => {
  test("el GIF es idéntico al de antes para el mismo instante", async () => {
    const gif = await componerGif(Date.parse("2026-11-16T12:00:00Z"));
    // Huella del GIF que producía la ruta original en ese instante.
    assert.equal(
      crypto.createHash("sha256").update(gif).digest("hex"),
      "5d52b594fe0f0d175fd8dd83c8aa0307643ef608190801e06925f7bde83dac49",
    );
  });

  test("100 llamadas seguidas generan un solo GIF por ventana", async () => {
    const antes = estadisticas.generados;
    let ok = 0;
    for (let i = 0; i < 100; i++) {
      const r = await reloj(pedir("https://x.test/api/countdown", `198.51.100.${i % 2 ? 7 : 8}`));
      if (r.status === 200) {
        ok++;
        assert.equal(r.headers.get("cache-control"), "public, max-age=5");
      }
    }
    assert.equal(ok, 100);
    assert.ok(estadisticas.generados - antes <= 2, "como mucho uno por ventana (puede cruzarse un borde)");
    const t = Date.now();
    assert.equal(await gifDeLaVentana(t), await gifDeLaVentana(t + 1));
    assert.ok(VENTANA_MS >= 5000);
  });

  test("devuelve 429 al pasar el límite", async () => {
    let ultimo = 200;
    for (let i = 0; i < 200; i++) {
      ultimo = (await reloj(pedir("https://x.test/api/countdown", "192.0.2.50"))).status;
      if (ultimo === 429) break;
    }
    assert.equal(ultimo, 429);
  });
});
