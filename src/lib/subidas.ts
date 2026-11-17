import { S3_PUBLIC_URL } from "@/lib/s3";

/**
 * Las reglas de lo que se puede subir al bucket.
 *
 * El archivo va directo del navegador al bucket con una URL firmada, así que
 * todo lo que se quiera exigir —tipo y tamaño— tiene que quedar dentro de la
 * firma. Por eso quien sube declara el tamaño antes de recibir la URL.
 */

const MB = 1024 * 1024;

export const CLASES = {
  /** Fotos de personas y logos. */
  foto: { tipos: ["image/jpeg", "image/png", "image/webp"], maximo: 8 * MB },
  /** Imágenes del panel: agenda, patrocinadores, correos. */
  imagen: { tipos: ["image/jpeg", "image/png", "image/webp", "image/gif"], maximo: 8 * MB },
  /** Diapositivas y PDF que sube el equipo. */
  documento: {
    tipos: [
      "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maximo: 50 * MB,
  },
} as const;

export type ClaseDeSubida = keyof typeof CLASES;

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

export const extensionDe = (tipo: string) => EXTENSION[tipo] ?? "bin";

export function validarSubida(
  tipo: unknown,
  tamano: unknown,
  clase: ClaseDeSubida,
): { ok: true; tipo: string; tamano: number } | { ok: false; error: string } {
  const regla = CLASES[clase];
  if (typeof tipo !== "string" || !(regla.tipos as readonly string[]).includes(tipo)) {
    return { ok: false, error: "Tipo de archivo no permitido" };
  }
  const n = Number(tamano);
  if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "Falta el tamaño del archivo" };
  if (n > regla.maximo) return { ok: false, error: `El archivo pasa de ${regla.maximo / MB} MB` };
  return { ok: true, tipo, tamano: n };
}

/**
 * Si una URL apunta a un archivo de nuestro bucket.
 *
 * Lo que llega de un formulario público y se guarda como foto tiene que pasar
 * por acá: una URL cualquiera acabaría pedida por el servidor al dibujar la
 * tarjeta del speaker, y mostrada a quien abra su perfil.
 */
export function esDelBucket(url: unknown): url is string {
  if (typeof url !== "string" || !S3_PUBLIC_URL) return false;
  if (!url.startsWith(`${S3_PUBLIC_URL}/`)) return false;
  // El traversal puede venir codificado: `%2e%2e` es «..». Se decodifica dos
  // veces porque el doble codificado también traversa; si la segunda vuelta
  // falla se deja la anterior, que ya está revisada.
  let ruta = url;
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    if (!ruta.includes("%")) break;
    let siguiente: string;
    try {
      siguiente = decodeURIComponent(ruta);
    } catch {
      if (vuelta === 0) return false;
      break;
    }
    if (siguiente === ruta) break;
    ruta = siguiente;
  }
  return !ruta.includes("..");
}
