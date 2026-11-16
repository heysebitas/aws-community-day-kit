import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Almacenamiento de archivos: fotos de speakers, diapositivas, PDF de escarapelas.
 *
 * Amazon S3 por omisión. Con `S3_ENDPOINT` sirve cualquier servicio compatible
 * (Cloudflare R2, MinIO, Backblaze B2).
 */

const BUCKET = process.env.AWS_S3_BUCKET!;
export const S3_PUBLIC_URL = (process.env.AWS_S3_PUBLIC_URL || "").replace(/\/+$/, "");

/** Carpeta bajo la que va todo, por si el bucket se comparte con otra edición. */
const S3_PREFIX = (process.env.S3_PREFIX || "").replace(/^\/+|\/+$/g, "");

export function s3Key(key: string): string {
  const clean = key.replace(/^\/+/, "");
  return S3_PREFIX ? `${S3_PREFIX}/${clean}` : clean;
}

export const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
});

export async function uploadBuffer(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${S3_PUBLIC_URL}/${key}`;
}

/** No falla si el objeto ya no existe. */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * La key que hay detrás de una URL pública del bucket, o `null` si la URL es
 * de otro sitio: hay fotos enlazadas desde fuera y ahí no hay nada que borrar.
 */
export function keyDeUrl(url: string): string | null {
  if (!url || !S3_PUBLIC_URL || !url.startsWith(`${S3_PUBLIC_URL}/`)) return null;
  const key = url.slice(S3_PUBLIC_URL.length + 1).split("?")[0];
  return key || null;
}

/**
 * URL firmada para que el navegador suba directo al bucket. Vale cinco minutos.
 *
 * El tipo y el tamaño van dentro de la firma: el bucket rechaza un archivo que
 * no mida exactamente `tamano` bytes, que es lo único que le pone tope.
 */
export async function presignUpload(key: string, contentType: string, tamano: number): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, ContentLength: tamano });
  return getSignedUrl(s3, cmd, { expiresIn: 300, signableHeaders: new Set(["content-length", "content-type"]) });
}
