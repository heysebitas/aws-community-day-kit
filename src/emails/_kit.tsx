import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { DOMINIO, EVENTO, SITIO, TEMA } from "@/config";
import { fechaCorta } from "@/config/fechas";
import { valoresDelEvento } from "./valores-evento";

/**
 * El kit de los correos: el estilo del sitio dentro de lo que un cliente de
 * correo aguanta.
 */

export const APP_URL = SITIO;

export const C = {
  ink: "#000000",
  paper: "#0A0A0F",
  block: TEMA.acento,
  blockDeep: TEMA.fuerte,
  line: "#2A2A38",
  text: "#E8E8F0",
  muted: "#9A9AAE",
  white: "#FFFFFF",
} as const;

/** Pila monoespaciada que existe en todos los clientes. */
export const MONO =
  "'JetBrains Mono', 'Courier New', Courier, ui-monospace, monospace";
/** Para titulares: sans pesada con fallbacks reales en Outlook. */
export const DISPLAY =
  "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ── Bloques ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  margin: 0,
  padding: "24px 0",
  backgroundColor: C.ink,
  fontFamily: MONO,
};

const container: React.CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: C.paper,
  border: `2px solid ${C.block}`,
};

/**
 * Cinta con el texto repetido, como las marquesinas del sitio pero quieta.
 * Que se corte por los lados es la idea.
 */
function Strip({ text }: { text: string }) {
  const trozo: React.CSSProperties = {
    display: "inline-block",
    padding: "8px 10px",
    fontFamily: MONO,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
  };

  return (
    <div style={{ overflow: "hidden" }}>
      <table
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        role="presentation"
        /** `fixed` es lo que impide que la tabla pida el ancho de las tres copias sin cortar y arrastre al correo entero fuera de la pantalla. */
        style={{ tableLayout: "fixed", width: "100%" }}
      >
        <tbody>
          <tr>
            {/* Una sola celda: con tres y ancho fijo el texto de cada una se derramaría sobre las vecinas. */}
            <td style={{ whiteSpace: "nowrap", lineHeight: 1, fontSize: 0 }}>
              <span style={{ ...trozo, color: C.block }}>{text}</span>
              <span style={{ ...trozo, backgroundColor: C.block, color: C.ink }}>{text}</span>
              <span style={{ ...trozo, color: C.block }}>{text}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function EmailLayout({
  preview,
  strip = `${EVENTO.ciudad.toUpperCase()} · ${fechaCorta(EVENTO.inicio)} · GRATIS`,
  children,
  lang = "es",
}: {
  /** Texto de vista previa en la bandeja (no se ve en el cuerpo). */
  preview?: string;
  strip?: string;
  children: React.ReactNode;
  lang?: string;
}) {
  return (
    <Html lang={lang} dir="ltr">
      <Head>
        {/* Sin esto algunos clientes de móvil dibujan el correo a 980 px y lo alejan. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Body style={body}>
        {preview && (
          <div
            style={{
              display: "none",
              overflow: "hidden",
              lineHeight: "1px",
              opacity: 0,
              maxHeight: 0,
              maxWidth: 0,
            }}
          >
            {preview}
          </div>
        )}

        <Container style={container}>
          <Section style={{ borderBottom: `2px solid ${C.block}` }}>
            <Img
              src={`${APP_URL}/api/marca/correo-cabecera`}
              alt={EVENTO.nombreCompleto}
              width="596"
              style={{ display: "block", width: "100%", maxWidth: "596px" }}
            />
          </Section>

          <Strip text={strip} />

          <Section style={{ padding: "32px 28px 8px" }}>{children}</Section>

          <Strip text={strip} />

          <Section>
            <Img
              src={`${APP_URL}/api/marca/correo-pie`}
              alt=""
              width="596"
              style={{ display: "block", width: "100%", maxWidth: "596px" }}
            />
          </Section>

          <Section style={{ padding: "20px 28px 28px", textAlign: "center" }}>
            <Text
              style={{
                margin: "0 0 8px",
                fontFamily: MONO,
                fontSize: "11px",
                color: C.muted,
                letterSpacing: "0.06em",
              }}
            >
              {`${EVENTO.sede.nombre} · ${EVENTO.ciudad} · ${fechaCorta(EVENTO.inicio)}`.toUpperCase()}
            </Text>
            <Text style={{ margin: 0, fontFamily: MONO, fontSize: "11px", color: C.muted }}>
              <Link href={APP_URL} style={{ color: C.block, textDecoration: "none" }}>
                {DOMINIO}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Tipografía ───────────────────────────────────────────────────────────────

/** Etiqueta chica en mayúsculas, el equivalente al dot-matrix del sitio. */
export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 10px",
        fontFamily: MONO,
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.block,
      }}
    >
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 14px",
        fontFamily: DISPLAY,
        fontSize: "30px",
        lineHeight: "1.1",
        letterSpacing: "-0.02em",
        color: C.white,
      }}
    >
      {children}
    </Text>
  );
}

export function Paragraph({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontFamily: MONO,
        fontSize: "14px",
        lineHeight: "1.7",
        color: muted ? C.muted : C.text,
      }}
    >
      {children}
    </Text>
  );
}

export function Divider() {
  return <Hr style={{ border: "none", borderTop: `1px solid ${C.line}`, margin: "24px 0" }} />;
}

// ── Botón "bulletproof" ──────────────────────────────────────────────────────

/** Botón de caja dura. Es una tabla: un <a> con padding se rompe en Outlook. */
export function HardButton({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline";
}) {
  const solid = variant === "solid";
  return (
    <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: "8px 0 20px" }}>
      <tbody>
        <tr>
          <td
            bgcolor={solid ? C.block : undefined}
            style={{
              backgroundColor: solid ? C.block : "transparent",
              border: `2px solid ${C.block}`,
              padding: "14px 28px",
            }}
          >
            <Link
              href={href}
              style={{
                fontFamily: MONO,
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: solid ? C.ink : C.block,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {children}
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ── Caja de datos ────────────────────────────────────────────────────────────

export type Detail = { label: string; value: React.ReactNode };

/** Ficha de datos con hairlines, como las filas del sitio. */
export function DetailBox({ rows }: { rows: Detail[] }) {
  return (
    <table
      width="100%"
      cellPadding="0"
      cellSpacing="0"
      role="presentation"
      style={{ border: `2px solid ${C.line}`, margin: "8px 0 20px" }}
    >
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label}>
            <td
              style={{
                width: "38%",
                padding: "12px 14px",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
                fontFamily: MONO,
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.muted,
                verticalAlign: "top",
              }}
            >
              {r.label}
            </td>
            <td
              style={{
                padding: "12px 14px",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
                fontFamily: MONO,
                fontSize: "13px",
                lineHeight: "1.5",
                color: C.text,
                whiteSpace: "pre-wrap",
              }}
            >
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Aviso destacado: caja con borde de acento. */
export function Callout({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <table
      width="100%"
      cellPadding="0"
      cellSpacing="0"
      role="presentation"
      style={{ border: `2px solid ${C.block}`, margin: "8px 0 20px" }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "16px 18px" }}>
            {title && (
              <Text
                style={{
                  margin: "0 0 6px",
                  fontFamily: MONO,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.block,
                }}
              >
                {title}
              </Text>
            )}
            <Text
              style={{
                margin: 0,
                fontFamily: MONO,
                fontSize: "13px",
                lineHeight: "1.65",
                color: C.text,
              }}
            >
              {children}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ── Piezas adicionales ───────────────────────────────────────────────────────

/** Los datos del evento ya escritos, para los correos que siguen en TSX. */
const V = valoresDelEvento();
export const EVT = {
  venue: V.sede,
  address: V.direccion,
  mapsUrl: EVENTO.sede.mapa,
  dateLong: V.fechaDia,
  dateShort: V.fechaCorta,
  time: V.horaPuertas,
} as const;

/** Lista numerada en dot-matrix: pasos, requisitos, tips. */
export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: "4px 0 20px" }}>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td
              style={{
                width: "34px",
                padding: "10px 0",
                verticalAlign: "top",
                fontFamily: MONO,
                fontSize: "12px",
                fontWeight: 700,
                color: C.block,
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </td>
            <td
              style={{
                padding: "10px 0",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
                fontFamily: MONO,
                fontSize: "13px",
                lineHeight: "1.65",
                color: C.text,
              }}
            >
              {item}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Cifra grande con etiqueta — el eco de los contadores del sitio. */
export function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: "4px 0 20px" }}>
      <tbody>
        <tr>
          <td style={{ border: `2px solid ${C.block}`, padding: "14px 22px", textAlign: "center" }}>
            <Text
              style={{
                margin: 0,
                fontFamily: DISPLAY,
                fontSize: "40px",
                lineHeight: "1",
                color: C.block,
              }}
            >
              {value}
            </Text>
            <Text
              style={{
                margin: "6px 0 0",
                fontFamily: MONO,
                fontSize: "10px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              {label}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Bloque de imagen con marco, para QR, mapas y GIFs de cuenta regresiva. */
export function Framed({
  src,
  alt = "",
  href,
  caption,
  width = 520,
}: {
  src: string;
  alt?: string;
  href?: string;
  caption?: string;
  width?: number;
}) {
  const img = (
    <Img
      src={src}
      alt={alt}
      width={String(width)}
      style={{
        display: "block",
        width: "100%",
        maxWidth: `${width}px`,
        border: `2px solid ${C.line}`,
      }}
    />
  );
  return (
    <Section style={{ margin: "0 0 16px" }}>
      {href ? <Link href={href}>{img}</Link> : img}
      {caption && (
        <Text
          style={{
            margin: "8px 0 0",
            fontFamily: MONO,
            fontSize: "11px",
            color: C.muted,
            textAlign: "center",
          }}
        >
          {caption}
        </Text>
      )}
    </Section>
  );
}

/** Ficha estándar del evento — la usan casi todas las plantillas. */
export function EventDetails({ extra }: { extra?: Detail[] }) {
  return (
    <DetailBox
      rows={[
        { label: "Fecha", value: EVT.dateLong },
        { label: "Hora", value: EVT.time },
        { label: "Lugar", value: EVT.venue },
        { label: "Dirección", value: EVT.address },
        ...(extra ?? []),
      ]}
    />
  );
}
