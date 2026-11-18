import fs from "node:fs";
import path from "node:path";
import { EVENTO, TEMA } from "@/config";
import { fechaCorta } from "@/config/fechas";
import { aRgb } from "@/config/temas";
import { siluetaDe } from "@/components/effects/siluetas";
import { globoSvg } from "@/lib/globo";

/**
 * Las imágenes de marca, dibujadas con la configuración y el tema: el banner
 * que sale al compartir el sitio, la cabecera y el pie de los correos y el
 * icono. Así una edición nueva no tiene que rehacer ninguna a mano.
 *
 * Son JSX para `ImageResponse` (satori): sólo flexbox y SVG, sin CSS externo.
 */

const publico = (ruta: string) => path.join(/*turbopackIgnore: true*/ process.cwd(), "public", ruta);

// Las fuentes no cambian mientras corre el servidor: se leen una vez.
let cargadas: ReturnType<typeof leerFuentes> | undefined;
function leerFuentes() {
  const leer = (archivo: string) => fs.readFileSync(publico(`fonts/${archivo}`));
  return [
    { name: "Oxanium", data: leer("Oxanium-Medium.woff"), weight: 500 as const, style: "normal" as const },
    { name: "Handjet", data: leer("Handjet-Medium.woff"), weight: 500 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: leer("JetBrainsMono-Bold.ttf"), weight: 700 as const, style: "normal" as const },
  ];
}
export function fuentes() {
  return (cargadas ??= leerFuentes());
}

/** Un archivo de `public/` como data URI, para incrustarlo en la imagen. */
function incrustar(ruta: string): string | null {
  try {
    const mime = ruta.endsWith(".svg") ? "image/svg+xml" : ruta.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${fs.readFileSync(publico(ruta)).toString("base64")}`;
  } catch {
    return null;
  }
}

const FONDO = "#08080C";
const acento = (alfa: number) => `rgba(${aRgb(TEMA.acento).join(",")},${alfa})`;

function Puntos({ ancho, alto }: { ancho: number; alto: number }) {
  return (
    <svg width={ancho} height={alto} style={{ position: "absolute", top: 0, left: 0 }}>
      <defs>
        <pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill={acento(0.14)} />
        </pattern>
      </defs>
      <rect width={ancho} height={alto} fill="url(#p)" />
    </svg>
  );
}

function Globo({ r, cx, cy, ancho, alto }: { r: number; cx: number; cy: number; ancho: number; alto: number }) {
  const g = globoSvg(EVENTO.coordenadas, r, cx, cy);
  return (
    <svg width={ancho} height={alto} style={{ position: "absolute", top: 0, left: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill={acento(0.05)} stroke={acento(0.45)} strokeWidth="1.5" />
      <path d={g.reticula} fill="none" stroke={acento(0.18)} strokeWidth="1" />
      <path d={g.tierra} fill="none" stroke={acento(0.85)} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={g.marcador.x} cy={g.marcador.y} r="26" fill={acento(0.18)} />
      <circle cx={g.marcador.x} cy={g.marcador.y} r="12" fill="none" stroke={TEMA.acento} strokeWidth="2" />
      <circle cx={g.marcador.x} cy={g.marcador.y} r="5" fill="#FFFFFF" />
    </svg>
  );
}

function Nombre({ tamano }: { tamano: number }) {
  const palabras = EVENTO.nombre.toLowerCase().split(/\s+/);
  const corte = Math.ceil(palabras.length / 2);
  const renglones = [palabras.slice(0, corte).join(" "), palabras.slice(corte).join(" ")].filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "Oxanium", fontSize: tamano, lineHeight: 0.92, letterSpacing: "-0.04em", color: "#F5F5FA" }}>
      {renglones.map((r) => (
        <span key={r}>{r}</span>
      ))}
    </div>
  );
}

function Edicion({ tamano }: { tamano: number }) {
  return (
    <span style={{ fontFamily: "Handjet", fontSize: tamano, letterSpacing: "0.22em", color: TEMA.acento, textTransform: "uppercase" }}>
      {EVENTO.edicion} {EVENTO.anio}
    </span>
  );
}

/** 1200×630: lo que se ve al pegar el enlace del sitio en una red o un chat. */
export function Banner() {
  const logo = incrustar(EVENTO.marca.logo);
  return (
    <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: FONDO }}>
      <Puntos ancho={1200} alto={630} />
      <Globo r={330} cx={1010} cy={330} ancho={1200} alto={630} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 60px", width: 820, height: 630 }}>
        {logo ? <img src={logo} alt="" height={64} /> : <span />}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Nombre tamano={104} />
          <Edicion tamano={44} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "JetBrains Mono", fontSize: 22, color: "#E0E0EB", letterSpacing: "0.08em", textTransform: "uppercase", gap: 6 }}>
          {EVENTO.fecha.confirmada && <span>{fechaCorta(EVENTO.inicio)}</span>}
          <span>{EVENTO.sede.nombre} · {EVENTO.ciudad}</span>
        </div>
      </div>
    </div>
  );
}

/** 1192×440: la cabecera de los correos (se muestra a 596 de ancho). */
export function CabeceraCorreo() {
  const logo = incrustar(EVENTO.marca.logo);
  return (
    <div style={{ width: 1192, height: 440, display: "flex", position: "relative", alignItems: "center", background: FONDO }}>
      <Puntos ancho={1192} alto={440} />
      <Globo r={300} cx={1050} cy={250} ancho={1192} alto={440} />
      <div style={{ display: "flex", alignItems: "center", gap: 64, paddingLeft: 90 }}>
        {logo && <img src={logo} alt="" height={104} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Nombre tamano={84} />
          <Edicion tamano={38} />
        </div>
      </div>
    </div>
  );
}

/** 1192×560: el pie de los correos, con la silueta de la sede sobre una rejilla. */
export function PieCorreo() {
  const ANCHO = 1192;
  const ALTO = 560;
  const silueta = EVENTO.sede.silueta === "santiago" ? "santiago" : "auto";
  const { verts, edges, tipos } = siluetaDe(silueta, EVENTO.ciudad);

  const angulo = 0.38;
  const cabeceo = 0.1;
  const escala = 62;
  const cx = ANCHO / 2;
  const cy = ALTO * 0.56;
  const p = verts.map(([x, y, z]) => {
    const x1 = x * Math.cos(angulo) - z * Math.sin(angulo);
    const z1 = x * Math.sin(angulo) + z * Math.cos(angulo);
    const y2 = y * Math.cos(cabeceo) - z1 * Math.sin(cabeceo);
    const z2 = y * Math.sin(cabeceo) + z1 * Math.cos(cabeceo);
    const f = 6 / (7.5 + z2);
    return { x: cx + x1 * f * escala * 2.1, y: cy - y2 * f * escala, z: z2 };
  });
  // A menos profundidad, más cerca de la cámara. La cordillera del fondo y el
  // suelo van finos para que no compitan con los edificios.
  const trazo = (cerca: boolean) =>
    edges
      .filter(([a, b], i) => ((p[a]!.z + p[b]!.z) / 2 < 1.4 && tipos[i] !== "suelo") === cerca)
      .map(([a, b]) => `M${p[a]!.x.toFixed(1)} ${p[a]!.y.toFixed(1)}L${p[b]!.x.toFixed(1)} ${p[b]!.y.toFixed(1)}`)
      .join("");

  const cuadros = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div style={{ width: ANCHO, height: ALTO, display: "flex", position: "relative", background: FONDO }}>
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: ANCHO, height: 12 }}>
        {cuadros.map((i) => (
          <div key={i} style={{ width: ANCHO / 48, height: 12, marginRight: ANCHO / 48, background: TEMA.acento }} />
        ))}
      </div>
      <svg width={ANCHO} height={ALTO} style={{ position: "absolute", top: 0, left: 0 }}>
        <path d={trazo(false)} fill="none" stroke={acento(0.35)} strokeWidth="1.5" />
        <path d={trazo(true)} fill="none" stroke={acento(0.9)} strokeWidth="2.5" />
      </svg>
    </div>
  );
}

/** El icono del sitio: las siglas sobre el color del tema. */
export function Icono({ lado }: { lado: number }) {
  const siglas = EVENTO.siglas.slice(0, 3).toUpperCase();
  return (
    <div style={{ width: lado, height: lado, display: "flex", alignItems: "center", justifyContent: "center", background: TEMA.acento }}>
      <span style={{ fontFamily: "Handjet", fontSize: lado * (siglas.length > 2 ? 0.5 : 0.62), color: "#000000", letterSpacing: "0.02em", lineHeight: 1 }}>
        {siglas}
      </span>
    </div>
  );
}
