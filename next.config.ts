import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const produccion = process.env.NODE_ENV === "production";

// El host del bucket, para que `next/image` pueda optimizar las fotos de speakers.
let bucket: string | undefined;
try {
  bucket = process.env.AWS_S3_PUBLIC_URL ? new URL(process.env.AWS_S3_PUBLIC_URL).hostname : undefined;
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
  "img-src 'self' data: blob: https:",
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
    remotePatterns: bucket ? [{ protocol: "https", hostname: bucket }] : [],
  },

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
