/**
 * Preparar una imagen en el navegador antes de pedir la URL firmada: las fotos
 * del móvil miden 2000-4000 px y pesan megas, y se pintan a unos cientos.
 */

/** Lado mayor de lo que se guarda. */
export const LADO_MAXIMO = 1600;
/** Calidad del WebP que sale (0-1). */
export const CALIDAD_WEBP = 0.85;

/** Las que se redimensionan: el GIF puede estar animado y el SVG/PDF no son mapa de bits. */
const REDIMENSIONABLES = ["image/jpeg", "image/png", "image/webp"];

/** Tamaño de salida: el lado mayor no pasa de `maximo` y nunca se agranda. */
export function dimensionesAjustadas(ancho: number, alto: number, maximo = LADO_MAXIMO) {
  const mayor = Math.max(ancho, alto);
  if (!(mayor > 0) || mayor <= maximo) return { ancho, alto };
  const f = maximo / mayor;
  return { ancho: Math.max(1, Math.round(ancho * f)), alto: Math.max(1, Math.round(alto * f)) };
}

/** Si vale la pena tocar este archivo: es un mapa de bits que pasa del lado máximo o pesa demasiado. */
export function conviene(tipo: string, ancho: number, alto: number, maximo = LADO_MAXIMO): boolean {
  if (!REDIMENSIONABLES.includes(tipo)) return false;
  return Math.max(ancho, alto) > maximo;
}

/** El nombre con la extensión del tipo nuevo. */
export function nombreWebp(nombre: string): string {
  return `${nombre.replace(/\.[^.]+$/, "") || "foto"}.webp`;
}

/**
 * Devuelve la imagen redimensionada a WebP, respetando la orientación EXIF y la
 * transparencia. Si el navegador no puede o el resultado no mejora, devuelve
 * el original.
 */
export async function prepararImagen(file: File): Promise<File> {
  if (!REDIMENSIONABLES.includes(file.type)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    // "from-image" aplica la orientación EXIF al decodificar.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (!conviene(file.type, bitmap.width, bitmap.height)) return file;
    const { ancho, alto } = dimensionesAjustadas(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", CALIDAD_WEBP));
    // Sin soporte de WebP el navegador devuelve PNG: se queda el original.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], nombreWebp(file.name), { type: "image/webp" });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

/** Manda al PUT las cabeceras que firmó el servidor, sin escribirlas a mano. */
export function ponerCabeceras(xhr: XMLHttpRequest, headers: Record<string, string>) {
  for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
}
