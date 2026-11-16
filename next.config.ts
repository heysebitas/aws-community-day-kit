import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const produccion = process.env.NODE_ENV === "production";

// El host del bucket, para que `next/image` pueda optimizar las fotos de speakers.
let bucket: URL | undefined;
try {
  bucket = process.env.AWS_S3_PUBLIC_URL ? new URL(process.env.AWS_S3_PUBLIC_URL) : undefined;
} catch {
  bucket = undefined;
}

/**
 * Política de contenido.
 *
 * No usa nonces, así que los scripts en línea quedan permitidos: es el precio
 * de poder prerenderizar las páginas. Lo que sí cierra es de dónde se cargan
 * scripts, quién puede enmarcar el sitio y a dónde pueden enviar los
 * formularios. Las imágenes y las conexiones aceptan cualquier `https:` porque
 * las fotos y las subidas van a un bucket cuyo host depende del despliegue.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${produccion ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // El origen del bucket va aparte por si no es https (un Garage o MinIO local).
  `img-src 'self' data: blob: https:${bucket && bucket.protocol !== "https:" ? ` ${bucket.origin}` : ""}`,
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const seguridad = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La cámara hace falta para los escáneres del panel; lo demás no se usa.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(produccion ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "mongodb-memory-server"],
  poweredByHeader: false,
  images: {
    remotePatterns: bucket
      ? [{ protocol: bucket.protocol === "http:" ? "http" : "https", hostname: bucket.hostname, port: bucket.port }]
      : [],
    formats: ["image/avif", "image/webp"],
    // Cada subida lleva un UUID en la key: la misma URL nunca cambia de contenido.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Un bucket local (Garage, MinIO) para probar; Next bloquea las IP locales por defecto.
    dangerouslyAllowLocalIP: !!bucket && /(^|\.)localhost$|^127\./.test(bucket.hostname),
  },
  // Para que `Foto` sepa en el cliente qué URLs puede optimizar.
  env: { NEXT_PUBLIC_BUCKET_HOST: bucket?.host ?? "" },

  async headers() {
    const inmutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/:ruta*", headers: seguridad },
      // Los estáticos cambian con el despliegue, no entre visitas.
      { source: "/images/:ruta*", headers: inmutable },
      { source: "/evento/:ruta*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/fonts/:ruta*", headers: inmutable },
    ];
  },
};

export default withNextIntl(nextConfig);
