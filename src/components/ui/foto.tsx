import Image, { type ImageProps } from "next/image";

/** El host del bucket, que `next.config.ts` deja en el cliente. */
const BUCKET = process.env.NEXT_PUBLIC_BUCKET_HOST || "";

/**
 * Si `next/image` puede optimizar esta URL: las rutas del sitio y las del
 * bucket. Una foto enlazada desde otro dominio no está en `remotePatterns` y
 * rompería el render, así que va tal cual.
 */
export function optimizable(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return !!BUCKET && new URL(src).host === BUCKET;
  } catch {
    return false;
  }
}

/**
 * `next/image` para fotos y logos que suben las personas: el original pesa
 * megas y se pinta a unos cientos de píxeles, así que pasa por el optimizador.
 */
export function Foto({ src, unoptimized, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  return <Image src={src} unoptimized={unoptimized ?? !optimizable(src)} {...props} />;
}
