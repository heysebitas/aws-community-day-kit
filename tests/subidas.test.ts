import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

/** Las subidas directas al bucket. */

before(() => {
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_S3_BUCKET = "bucket-de-prueba";
  process.env.AWS_S3_PUBLIC_URL = "https://bucket-de-prueba.s3.amazonaws.com";
  process.env.AWS_ACCESS_KEY_ID = "AKIAEJEMPLOEJEMPLO00";
  process.env.AWS_SECRET_ACCESS_KEY = "secreto-de-prueba-que-no-abre-nada-000000";
});

describe("la URL firmada de subida", () => {
  test("lleva el tamaño dentro de la firma", async () => {
    const { presignUpload } = await import("@/lib/s3");
    const url = new URL(await presignUpload("fotos/x.png", "image/png", 12345));
    const firmadas = (url.searchParams.get("X-Amz-SignedHeaders") ?? "").split(";");
    assert.ok(firmadas.includes("content-length"), `content-length no está firmada: ${firmadas.join(", ")}`);
  });

  test("caduca en cinco minutos", async () => {
    const { presignUpload } = await import("@/lib/s3");
    const url = new URL(await presignUpload("fotos/x.png", "image/png", 10));
    assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  });
});

describe("lo que se acepta subir", () => {
  test("sólo los tipos permitidos y hasta el tope", async () => {
    const { validarSubida } = await import("@/lib/subidas");
    assert.equal(validarSubida("image/png", 1000, "foto").ok, true);
    assert.equal(validarSubida("image/svg+xml", 1000, "foto").ok, false);
    assert.equal(validarSubida("image/png", 50 * 1024 * 1024, "foto").ok, false);
    assert.equal(validarSubida("image/png", 0, "foto").ok, false);
    assert.equal(validarSubida("image/png", Number.NaN, "foto").ok, false);
    assert.equal(validarSubida("application/pdf", 1000, "foto").ok, false);
    assert.equal(validarSubida("application/pdf", 1000, "documento").ok, true);
  });
});

describe("las URL que se guardan", () => {
  test("una foto tiene que estar en nuestro bucket", async () => {
    const { esDelBucket } = await import("@/lib/subidas");
    assert.equal(esDelBucket("https://bucket-de-prueba.s3.amazonaws.com/cfs/photos/a.png"), true);
    assert.equal(esDelBucket("https://bucket-de-prueba.s3.amazonaws.com.evil.example/a.png"), false);
    assert.equal(esDelBucket("http://169.254.169.254/latest/meta-data/"), false);
    assert.equal(esDelBucket("javascript:alert(1)"), false);
    assert.equal(esDelBucket(""), false);
  });
});
