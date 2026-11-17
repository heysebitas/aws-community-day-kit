import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CopyObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  CACHE_INMUTABLE,
  CACHE_REVALIDABLE,
  aplicar,
  cacheControlDe,
  configBucket,
  revisar,
} from "../scripts/cache-control-bucket.mjs";

/**
 * El script que pone Cache-Control a lo que ya está en el bucket.
 *
 * Aquí no hay red: el cliente de S3 es simulado, así que se puede comprobar
 * que en seco no se escribe nada y que con `--aplicar` se copia con la
 * cabecera correcta. Nunca contra un bucket real.
 */

type Objeto = {
  tipo: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
};

type Copia = {
  key: string;
  cacheControl?: string;
  contentType?: string;
  metadataDirective?: string;
  metadata?: Record<string, string>;
};

/** Un cliente de S3 de mentira: sólo sabe(listar, mirar y copiar). */
class ClienteSimulado {
  readonly objetos = new Map<string, Objeto>();
  readonly copias: Copia[] = [];

  constructor(objetos: Record<string, Objeto>) {
    for (const [key, valor] of Object.entries(objetos)) this.objetos.set(key, { ...valor });
  }

  async send(comando: { input: Record<string, unknown>; constructor: { name: string } }): Promise<unknown> {
    const input = comando.input;
    if (comando instanceof ListObjectsV2Command) {
      const prefijo = (input.Prefix as string) || "";
      const Contents = [...this.objetos.keys()].filter((k) => k.startsWith(prefijo)).map((Key) => ({ Key }));
      return { Contents, IsTruncated: false };
    }
    if (comando instanceof HeadObjectCommand) {
      const objeto = this.objetos.get(input.Key as string);
      if (!objeto) throw new Error(`NoSuchKey: ${input.Key}`);
      return { ContentType: objeto.tipo, CacheControl: objeto.cacheControl, Metadata: objeto.metadata };
    }
    if (comando instanceof CopyObjectCommand) {
      const key = input.Key as string;
      const objeto = this.objetos.get(key);
      if (!objeto) throw new Error(`NoSuchKey: ${key}`);
      this.copias.push({
        key,
        cacheControl: input.CacheControl as string,
        contentType: input.ContentType as string,
        metadataDirective: input.MetadataDirective as string,
        metadata: input.Metadata as Record<string, string>,
      });
      this.objetos.set(key, {
        tipo: (input.ContentType as string) || objeto.tipo,
        cacheControl: input.CacheControl as string,
        metadata: (input.Metadata as Record<string, string>) || objeto.metadata,
      });
      return { CopyObjectResult: { ETag: '"etiqueta"' } };
    }
    throw new Error(`Comando desconocido: ${comando.constructor.name}`);
  }
}

const config = configBucket({
  AWS_REGION: "us-east-1",
  AWS_S3_BUCKET: "bucket-de-prueba",
  AWS_S3_PUBLIC_URL: "https://bucket-de-prueba.s3.amazonaws.com",
});

describe("el script del bucket", () => {
  test("en seco: dice qué cambiaría y no escribe nada", async () => {
    const cliente = new ClienteSimulado({
      "cfs/photos/ana.png": { tipo: "image/png" },
      "sponsors/logo.png": { tipo: "image/png" },
    });

    const { total, cambios } = await revisar(cliente as never, config);

    assert.equal(total, 2);
    assert.equal(cambios.length, 2);
    assert.deepEqual(
      cambios.map((c) => c.key).sort(),
      ["cfs/photos/ana.png", "sponsors/logo.png"],
    );
    assert.equal(cliente.copias.length, 0, "no debe copiar nada en seco");
    assert.equal(cliente.objetos.get("cfs/photos/ana.png")?.cacheControl, undefined);
  });

  test("con --aplicar: copia con la cabecera correcta y conserva el tipo", async () => {
    const cliente = new ClienteSimulado({
      "cfs/photos/ana.png": { tipo: "image/jpeg" },
    });

    const { cambios } = await revisar(cliente as never, config);
    const copiados = await aplicar(cliente as never, config, cambios);

    assert.deepEqual(copiados, ["cfs/photos/ana.png"]);
    assert.equal(cliente.copias.length, 1);
    const copia = cliente.copias[0];
    assert.equal(copia!.cacheControl, CACHE_INMUTABLE);
    assert.equal(copia!.contentType, "image/jpeg");
    assert.equal(copia!.metadataDirective, "REPLACE");
    assert.equal(cliente.objetos.get("cfs/photos/ana.png")?.cacheControl, CACHE_INMUTABLE);
  });

  test("los que ya llevan la cabecera no se tocan", async () => {
    const cliente = new ClienteSimulado({
      "cfs/photos/ana.png": { tipo: "image/png", cacheControl: CACHE_INMUTABLE },
      "cfs/photos/beto.jpg": { tipo: "image/jpeg", cacheControl: "public, max-age=60" },
    });

    const { total, cambios } = await revisar(cliente as never, config);

    assert.equal(total, 2);
    assert.deepEqual(cambios.map((c) => c.key), ["cfs/photos/beto.jpg"]);
  });

  test("las tarjetas de los speakers se revalidan: se redibujan con el mismo nombre", () => {
    assert.equal(cacheControlDe("speaker-cards/ana.png"), CACHE_REVALIDABLE);
    assert.equal(cacheControlDe("cfs/photos/ana.png"), CACHE_INMUTABLE);
  });

  test("respeta el prefijo del bucket", async () => {
    const cliente = new ClienteSimulado({
      "2027/cfs/photos/ana.png": { tipo: "image/png" },
      "otra-edicion/cfs/photos/beto.jpg": { tipo: "image/jpeg" },
    });

    const { total, cambios } = await revisar(cliente as never, configBucket({ AWS_S3_BUCKET: "bucket-de-prueba", S3_PREFIX: "2027" }));

    assert.equal(total, 1);
    assert.deepEqual(cambios.map((c) => c.key), ["2027/cfs/photos/ana.png"]);
    assert.equal(cambios[0]!.nueva, CACHE_INMUTABLE);
  });

  test("conserva la metadata que ya tenía el objeto", async () => {
    const cliente = new ClienteSimulado({
      "cfs/photos/ana.png": { tipo: "image/png", metadata: { readonly: "1" } },
    });

    const { cambios } = await revisar(cliente as never, config);
    await aplicar(cliente as never, config, cambios);

    assert.deepEqual(cliente.copias[0]!.metadata, { readonly: "1" });
  });
});
