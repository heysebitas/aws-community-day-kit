/**
 * Cache-Control para lo que ya está subido al bucket.
 *
 *   node scripts/cache-control-bucket.mjs           # en seco: lista lo que cambiaría
 *   node scripts/cache-control-bucket.mjs --aplicar
 *
 * Lee las mismas variables que `src/lib/s3.ts`: AWS_REGION, AWS_S3_BUCKET,
 * S3_ENDPOINT y S3_PREFIX. Sólo toca el bucket de la edición.
 *
 * Lo que ya está subido no trae ninguna cabecera: se le pone copiando el objeto
 * sobre sí mismo (`CopyObject` con `MetadataDirective: REPLACE`), que es la
 * única forma de cambiar los metadatos sin volver a subir el archivo.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { CopyObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

/** Un año: las fotos y los logos llevan un UUID en la key, su URL no cambia. */
export const CACHE_INMUTABLE = "public, max-age=31536000, immutable";

/** Un día y una semana: las tarjetas de los speakers se vuelven a dibujar. */
export const CACHE_REVALIDABLE = "public, max-age=86400, stale-while-revalidate=604800";

/**
 * La regla de cada objeto.
 *
 * Casi todo lleva un UUID en la key, así que su contenido nunca cambia bajo la
 * misma URL. Las tarjetas de los speakers son la excepción: se redibujan con el
 * mismo nombre y pueden cambiar, así que no pueden ser inmutables.
 */
export function cacheControlDe(key) {
  return key.includes("speaker-cards/") ? CACHE_REVALIDABLE : CACHE_INMUTABLE;
}

/**
 * La configuración del bucket, con las mismas variables que `src/lib/s3.ts`.
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function configBucket(env = process.env) {
  return {
    bucket: (env.AWS_S3_BUCKET || "").trim(),
    region: (env.AWS_REGION || "us-east-1").trim(),
    endpoint: (env.S3_ENDPOINT || "").trim(),
    prefix: (env.S3_PREFIX || "").trim().replace(/^\/+|\/+$/g, ""),
    publicUrl: (env.AWS_S3_PUBLIC_URL || "").trim().replace(/\/+$/, ""),
  };
}

/** El cliente del bucket; con `S3_ENDPOINT` sirve Garage, R2 o MinIO. */
export function crearCliente(config) {
  return new S3Client({
    region: config.region,
    ...(config.endpoint && { endpoint: config.endpoint, forcePathStyle: true }),
  });
}

/**
 * Si hay credenciales para hablar con el bucket.
 *
 * Es una heurística: el rol de la instancia o el perfil de `~/.aws` no se ven
 * desde aquí, así que sólo se puede mirar lo que está en el entorno.
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function hayCredenciales(env = process.env) {
  if ((env.AWS_ACCESS_KEY_ID || "").trim() && (env.AWS_SECRET_ACCESS_KEY || "").trim()) return true;
  if ((env.AWS_PROFILE || "").trim()) return true;
  if ((env.AWS_WEB_IDENTITY_TOKEN_FILE || "").trim()) return true;
  if ((env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || "").trim()) return true;
  return false;
}

const codificar = (key) => key.split("/").map(encodeURIComponent).join("/");

/** La key sin el prefijo del bucket: es donde se busca la regla. */
function relativa(config, key) {
  return config.prefix && key.startsWith(`${config.prefix}/`) ? key.slice(config.prefix.length + 1) : key;
}

/** Todas las keys del bucket, con el prefijo de la edición si lo hay. */
export async function listarObjetos(client, config) {
  const claves = [];
  let token;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        ...(config.prefix && { Prefix: `${config.prefix}/` }),
        ...(token && { ContinuationToken: token }),
      }),
    );
    for (const o of res.Contents ?? []) if (o.Key) claves.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return claves;
}

/** Las cabeceras de un objeto: lo que hace falta para saber y para copiar. */
export async function revisarObjeto(client, config, key) {
  const res = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
  return {
    key,
    cacheControl: res.CacheControl || "",
    contentType: res.ContentType || "",
    contentEncoding: res.ContentEncoding || "",
    contentDisposition: res.ContentDisposition || "",
    metadata: res.Metadata || {},
  };
}

/**
 * Qué habría que cambiar: los objetos cuya cabecera no es la que les toca.
 *
 * Los que ya la tienen quedan fuera, así que el script se puede repetir sin
 * miedo.
 */
export async function revisar(client, config) {
  const claves = await listarObjetos(client, config);
  const cambios = [];
  for (const key of claves) {
    const objeto = await revisarObjeto(client, config, key);
    const nueva = cacheControlDe(relativa(config, key));
    if (objeto.cacheControl === nueva) continue;
    cambios.push({ ...objeto, actual: objeto.cacheControl, nueva });
  }
  return { total: claves.length, cambios };
}

/**
 * Aplica el plan copiando cada objeto sobre sí mismo.
 *
 * `MetadataDirective: REPLACE` borra los metadatos del objeto, así que se
 * vuelven a mandar: el tipo de contenido y la metadata que tenía.
 */
export async function aplicar(client, config, cambios) {
  const copiados = [];
  for (const c of cambios) {
    await client.send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        Key: c.key,
        CopySource: `${config.bucket}/${codificar(c.key)}`,
        MetadataDirective: "REPLACE",
        CacheControl: c.nueva,
        ...(c.contentType && { ContentType: c.contentType }),
        ...(c.contentEncoding && { ContentEncoding: c.contentEncoding }),
        ...(c.contentDisposition && { ContentDisposition: c.contentDisposition }),
        ...(Object.keys(c.metadata).length && { Metadata: c.metadata }),
      }),
    );
    copiados.push(c.key);
  }
  return copiados;
}

async function main() {
  const aplicarAhora = process.argv.includes("--aplicar");
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

  const config = configBucket();
  if (!config.bucket) {
    console.error("Falta AWS_S3_BUCKET: no se sabe a qué bucket aplicarle la cabecera.");
    process.exit(1);
  }

  const client = crearCliente(config);
  const { total, cambios } = await revisar(client, config);
  console.log(`Bucket: ${config.bucket}${config.prefix ? ` (prefijo ${config.prefix})` : ""} · ${total} objeto(s)`);

  if (!cambios.length) {
    console.log("Todos los objetos llevan ya la cabecera que les toca.");
    return;
  }
  for (const c of cambios) {
    console.log(`  ${c.key}`);
    console.log(`    actual: ${c.actual || "(sin cabecera)"}`);
    console.log(`    nueva:  ${c.nueva}`);
  }

  if (!aplicarAhora) {
    console.log(`\nEn seco: no se cambió nada. ${cambios.length} objeto(s) cambiarían. Añade --aplicar para aplicarlo.`);
    return;
  }

  const copiados = await aplicar(client, config, cambios);
  console.log(`\n${copiados.length} objeto(s) actualizados.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`No se pudo completar: ${e.message}`);
    process.exit(1);
  });
}
