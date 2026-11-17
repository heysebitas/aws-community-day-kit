import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CALIDAD_WEBP, LADO_MAXIMO, conviene, dimensionesAjustadas, nombreWebp } from "@/lib/imagen-cliente";
import es from "@/messages/es.json";
import en from "@/messages/en.json";

const leer = (ruta: string) => readFileSync(ruta, "utf8");
const INMUTABLE = "public, max-age=31536000, immutable";

before(() => {
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_S3_BUCKET = "bucket-de-prueba";
  process.env.AWS_S3_PUBLIC_URL = "https://bucket-de-prueba.s3.amazonaws.com";
  process.env.AWS_ACCESS_KEY_ID = "AKIAEJEMPLOEJEMPLO00";
  process.env.AWS_SECRET_ACCESS_KEY = "secreto-de-prueba-que-no-abre-nada-000000";
});

describe("#46 Cache-Control en las subidas", () => {
  test("la política: inmutable salvo las tarjetas, que se redibujan", async () => {
    const { cacheControlDe } = await import("@/lib/s3");
    assert.equal(cacheControlDe("speakers/photos/a.webp"), INMUTABLE);
    assert.equal(cacheControlDe("pdfs/pdf_local-x.pdf"), INMUTABLE);
    assert.match(cacheControlDe("speaker-cards/ana.png"), /stale-while-revalidate/);
  });

  test("la URL firmada lleva cache-control en la firma y devuelve las cabeceras a mandar", async () => {
    const { presignSubida } = await import("@/lib/s3");
    const r = await presignSubida("speakers/photos/a.webp", "image/webp", 1000);
    const firmadas = (new URL(r.uploadUrl).searchParams.get("X-Amz-SignedHeaders") ?? "").split(";");
    assert.ok(firmadas.includes("cache-control"), firmadas.join(","));
    assert.deepEqual(r.headers, { "Content-Type": "image/webp", "Cache-Control": INMUTABLE });
    // Todo lo firmado (salvo host y content-length, que pone el navegador) viene en `headers`.
    const mandadas = Object.keys(r.headers).map((h) => h.toLowerCase());
    for (const h of firmadas) if (!["host", "content-length"].includes(h)) assert.ok(mandadas.includes(h), `falta ${h}`);
  });

  test("uploadBuffer sube con CacheControl", async () => {
    const { uploadBuffer, s3 } = await import("@/lib/s3");
    const enviados: PutObjectCommand[] = [];
    const original = s3.send.bind(s3);
    (s3 as unknown as { send: unknown }).send = async (c: PutObjectCommand) => { enviados.push(c); return {}; };
    try {
      await uploadBuffer("templates/x.pdf", Buffer.from("x"), "application/pdf");
      await uploadBuffer("speaker-cards/ana.png", Buffer.from("x"), "image/png");
    } finally {
      (s3 as unknown as { send: unknown }).send = original;
    }
    assert.equal(enviados[0]!.input.CacheControl, INMUTABLE);
    assert.match(enviados[1]!.input.CacheControl ?? "", /max-age=86400/);
  });

  test("los PUT del cliente usan las cabeceras del servidor, no las suyas", () => {
    for (const f of [
      "src/components/ui/image-upload.tsx",
      "src/app/[locale]/speakers/_components.tsx",
      "src/app/[locale]/admin/speakers/canvas/_use-canvas.tsx",
      "src/app/[locale]/admin/speakers/ajustes/page.tsx",
    ]) {
      const src = leer(f);
      assert.doesNotMatch(src, /setRequestHeader\("Content-Type"/, f);
      assert.doesNotMatch(src, /headers: \{ "Content-Type": (f\.type|"application\/pdf") \}/, f);
      assert.match(src, /headers/, f);
    }
  });

  test("las tres rutas de presign devuelven headers", () => {
    for (const r of ["presign", "public-presign", "pdf-presign"]) {
      assert.match(leer(`src/app/api/upload/${r}/route.ts`), /presignSubida/, r);
    }
  });

  test("reemplazar una foto cambia la clave (UUID nuevo en cada subida)", () => {
    for (const r of ["presign", "public-presign"]) assert.match(leer(`src/app/api/upload/${r}/route.ts`), /randomUUID\(\)/);
  });
});

describe("#47 redimensionar en el cliente", () => {
  test("4000×3000 sale a 1600×1200", () => {
    assert.deepEqual(dimensionesAjustadas(4000, 3000), { ancho: LADO_MAXIMO, alto: 1200 });
  });
  test("vertical: el lado mayor es el alto", () => {
    assert.deepEqual(dimensionesAjustadas(3000, 4000), { ancho: 1200, alto: LADO_MAXIMO });
  });
  test("no agranda lo pequeño ni toca dimensiones inválidas", () => {
    assert.deepEqual(dimensionesAjustadas(800, 600), { ancho: 800, alto: 600 });
    assert.deepEqual(dimensionesAjustadas(0, 0), { ancho: 0, alto: 0 });
  });
  test("nunca sale un lado de 0 px", () => {
    const r = dimensionesAjustadas(100000, 10);
    assert.equal(r.ancho, LADO_MAXIMO);
    assert.ok(r.alto >= 1);
  });
  test("sólo se tocan JPG/PNG/WebP grandes: GIF y PDF no", () => {
    assert.equal(conviene("image/jpeg", 4000, 3000), true);
    assert.equal(conviene("image/png", 4000, 3000), true);
    assert.equal(conviene("image/jpeg", 1000, 800), false);
    assert.equal(conviene("image/gif", 4000, 3000), false);
    assert.equal(conviene("application/pdf", 4000, 3000), false);
  });
  test("el nombre sale .webp y la calidad es la de la issue", () => {
    assert.equal(nombreWebp("IMG_1234.JPG"), "IMG_1234.webp");
    assert.equal(nombreWebp(""), "foto.webp");
    assert.equal(CALIDAD_WEBP, 0.85);
  });
  test("los formularios de foto pasan por prepararImagen antes de pedir la URL", () => {
    for (const f of [
      "src/components/ui/image-upload.tsx",
      "src/app/[locale]/speakers/_components.tsx",
      "src/app/[locale]/admin/speakers/canvas/_use-canvas.tsx",
    ]) {
      const src = leer(f);
      assert.ok(src.indexOf("prepararImagen(") > -1 && src.indexOf("prepararImagen(") < src.indexOf("/api/upload/"), f);
    }
  });
});

describe("#48 y CLS: imágenes por Foto o con tamaño", () => {
  test("logos del pasaporte, del panel y SpeakerCard usan Foto", () => {
    for (const f of [
      "src/app/[locale]/pasaporte/[shortId]/_piezas.tsx",
      "src/app/[locale]/admin/pasaportes/page.tsx",
      "src/components/sections/speakers.tsx",
    ]) {
      assert.match(leer(f), /<Foto\b/, f);
    }
    assert.doesNotMatch(leer("src/components/sections/speakers.tsx"), /<img\b|<Image\b/);
  });
  test("las <img> que quedan en directorio y en la marca llevan width y height", () => {
    for (const f of ["src/app/[locale]/directorio/_components.tsx", "src/app/[locale]/directorio/_screen.tsx", "src/components/layout/marca.tsx"]) {
      const imgs = leer(f).match(/<img\b[^>]*?(?:\/>|>)/g) ?? [];
      for (const i of imgs) assert.match(i, /width=/, `${f}: ${i.slice(0, 60)}`);
    }
  });
  test("«Invitados Especiales» y «Keynotes» están en todos los idiomas y no en el código", () => {
    for (const m of [es, en]) {
      const d = (m as unknown as Record<string, Record<string, string>>).Directorio;
      assert.ok(d?.invitados && d?.keynotes);
    }
    assert.doesNotMatch(leer("src/app/[locale]/directorio/_screen.tsx"), /Invitados Especiales|>Keynotes</);
  });
});

describe("#20 directorio en servidor y canvas que no repintan a ciegas", () => {
  test("page.tsx es de servidor y lee con las funciones cacheadas", () => {
    const src = leer("src/app/[locale]/directorio/page.tsx");
    assert.doesNotMatch(src, /use client/);
    assert.match(src, /getAgendaEvents/);
    assert.match(src, /getPublicSpeakers/);
    const pantalla = leer("src/app/[locale]/directorio/_screen.tsx");
    assert.match(pantalla, /^"use client"/);
    assert.doesNotMatch(pantalla, /fetch\(["'`]\/api\/(speaker-profiles|agenda)/);
  });

  describe("bucleVisible", () => {
    type G = Record<string, unknown>;
    const g = globalThis as unknown as G;
    let cola: Array<() => void>;
    let io: ((e: { isIntersecting: boolean }[]) => void) | null;
    let ro: (() => void) | null;
    const previos: G = {};

    before(() => {
      for (const k of ["IntersectionObserver", "ResizeObserver", "requestAnimationFrame", "cancelAnimationFrame"]) previos[k] = g[k];
      g.IntersectionObserver = class { constructor(cb: typeof io) { io = cb; } observe() {} disconnect() {} };
      g.ResizeObserver = class { constructor(cb: () => void) { ro = cb; } observe() {} disconnect() {} };
      g.requestAnimationFrame = (f: () => void) => cola.push(f);
      g.cancelAnimationFrame = () => { cola = []; };
    });

    const preparar = (ancho: number) => {
      cola = [];
      const el = { clientWidth: ancho, clientHeight: ancho } as unknown as Element;
      let pintados = 0;
      return { el, pintados: () => pintados, f: () => { pintados++; } };
    };
    const correr = (n: number) => { for (let i = 0; i < n && cola.length; i++) cola.shift()!(); };

    test("oculto o fuera de pantalla no pide fotogramas", async () => {
      const { bucleVisible } = await import("@/components/effects/bucle-visible");
      const c = preparar(100);
      bucleVisible(c.el, c.f);
      assert.equal(cola.length, 0);
      io!([{ isIntersecting: false }]);
      assert.equal(cola.length, 0);
    });

    test("visible pinta en bucle y al salir de pantalla se para", async () => {
      const { bucleVisible } = await import("@/components/effects/bucle-visible");
      const c = preparar(100);
      bucleVisible(c.el, c.f);
      io!([{ isIntersecting: true }]);
      correr(3);
      assert.equal(c.pintados(), 3);
      io!([{ isIntersecting: false }]);
      correr(2);
      assert.equal(c.pintados(), 3);
      assert.equal(cola.length, 0);
    });

    test("de ancho 0 espera al ResizeObserver en vez de pedir fotogramas", async () => {
      const { bucleVisible } = await import("@/components/effects/bucle-visible");
      const c = preparar(0);
      bucleVisible(c.el, c.f);
      io!([{ isIntersecting: true }]);
      assert.equal(cola.length, 0);
      (c.el as unknown as { clientWidth: number }).clientWidth = 50;
      (c.el as unknown as { clientHeight: number }).clientHeight = 50;
      ro!();
      correr(1);
      assert.equal(c.pintados(), 1);
    });

    test("con movimiento reducido pinta una sola vez", async () => {
      const { bucleVisible } = await import("@/components/effects/bucle-visible");
      const c = preparar(100);
      bucleVisible(c.el, c.f, true);
      io!([{ isIntersecting: true }]);
      correr(10);
      assert.equal(c.pintados(), 1);
      assert.equal(cola.length, 0);
    });

    test("restaura los globales", () => {
      for (const k of Object.keys(previos)) { if (previos[k] === undefined) delete g[k]; else g[k] = previos[k]; }
    });
  });
});
