import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CacheImagenes } from "@/lib/cache-imagen";

const png = (bytes: number) => new Response(new Uint8Array(bytes));

describe("caché de imágenes generadas", () => {
  test("dibuja una vez aunque lleguen varias peticiones a la vez", async () => {
    const cache = new CacheImagenes(4, 1024);
    let dibujos = 0;
    const dibujar = async () => {
      dibujos += 1;
      return png(10);
    };
    const [a, b] = await Promise.all([cache.obtener("x", dibujar), cache.obtener("x", dibujar)]);
    await cache.obtener("x", dibujar);
    assert.equal(dibujos, 1);
    assert.equal(a, b);
  });

  test("respeta el tope de entradas y de bytes, y descarta la menos usada", async () => {
    const cache = new CacheImagenes(2, 25);
    await cache.obtener("a", () => png(10));
    await cache.obtener("b", () => png(10));
    cache.leer("a");
    await cache.obtener("c", () => png(10));
    assert.ok(cache.leer("a"));
    assert.equal(cache.leer("b"), undefined);
    assert.deepEqual(cache.tamano, { entradas: 2, bytes: 20 });
    await cache.obtener("d", () => png(20));
    assert.ok(cache.tamano.bytes <= 25);
  });

  test("un dibujo que falla no se queda guardado", async () => {
    const cache = new CacheImagenes(2, 100);
    await assert.rejects(cache.obtener("x", () => Promise.reject(new Error("falla"))));
    assert.equal(cache.leer("x"), undefined);
  });

  test("olvidar quita las versiones viejas de una imagen", async () => {
    const cache = new CacheImagenes(8, 1000);
    await cache.obtener("ana:1", () => png(10));
    await cache.obtener("ana-b:1", () => png(10));
    cache.olvidar("ana:");
    assert.equal(cache.leer("ana:1"), undefined);
    assert.ok(cache.leer("ana-b:1"));
    assert.equal(cache.tamano.bytes, 10);
  });
});
