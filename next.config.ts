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

// Trusted Types sólo informa (no bloquea): sin endpoint de reportes, las violaciones se ven en la consola del navegador.
// Detalle y plan en docs/csp.md.
const cspSoloInforme = "require-trusted-types-for 'script'";

const seguridad = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Content-Security-Policy-Report-Only", value: cspSoloInforme },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La cámara hace falta para los escáneres del panel; lo demás no se usa.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  // Los popups (Turnstile, enlaces externos) siguen funcionando; el resto queda aislado.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(produccion ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Sólo para la imagen de Docker, que copia `.next/standalone` sin `node_modules`.
  // `next start` (pm2, el despliegue por SSH) no está soportado con standalone.
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["pdfkit", "mongodb-memory-server"],
  // Solo es para pruebas y la demo: no debe entrar al standalone.
  outputFileTracingExcludes: { "*": ["node_modules/mongodb-memory-server/**", "node_modules/mongodb-memory-server-core/**"] },
  poweredByHeader: false,
  // Comprime Node salvo que lo haga el proxy (nginx con gzip): así no se comprime dos
  // veces. Sin proxy (Docker solo) hace falta. Ver docs/despliegue.md.
  compress: process.env.COMPRIMIR_EN_PROXY !== "1",
  // Next pasa `127.x` y `[::1]` a `localhost` en la URL que ve el proxy, pero compara
  // la reescritura con la URL real del servidor: con HOSTNAME=127.0.0.1 la reescritura
  // de next-intl al idioma base parece externa, vuelve a entrar y acaba en un 307 a sí
  // misma. Sin normalizar, el proxy ve la misma URL que el router. Prueba en tests/proxy-host.test.ts.
  skipProxyUrlNormalize: true,
  // `experimental.inlineCss` queda apagado: en la portada el HTML pasaba de 24 a 84 KB gzip (+60 KB, tope 25).
  // Medida y razón en docs/rendimiento.md.
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
    // Sin hash en el nombre: un logo corregido tiene que verse en un día.
    const revalidable = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    // Las fuentes no cambian de nombre entre versiones, por eso pueden ser inmutables.
    const inmutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/:ruta*", headers: seguridad },
      // `marca` y `og` los piden los correos y las redes desde otros orígenes.
      {
        source: "/api/:ruta((?!marca(?:/|$)|og(?:/|$)).*)",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }],
      },
      { source: "/images/:ruta*", headers: revalidable },
      { source: "/evento/:ruta*", headers: revalidable },
      { source: "/fonts/:ruta*", headers: inmutable },
    ];
  },
};

export default withNextIntl(nextConfig);
