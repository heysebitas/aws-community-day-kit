import "server-only";
import { EVENTO } from "@/config";
import {
  COLORS, MARGIN, PAGE_W,
  createDoc, drawAccentLine, drawEventDetails, drawFooter, drawHeader, hardBox, mono, pdfToBuffer,
} from "./common";

/** La carta de aceptación que se adjunta al aprobar a un speaker o a un voluntario. */

type Rol = "speaker" | "volunteer";

const TEXTOS: Record<Rol, { titulo: string; sello: string; cuerpo: string }> = {
  speaker: {
    titulo: "Aceptado como Speaker",
    sello: "SPEAKER OFICIAL",
    cuerpo: `Eres parte oficial del programa de speakers del ${EVENTO.nombreCompleto}. Te contactaremos pronto con los detalles de tu charla.`,
  },
  volunteer: {
    titulo: "Aceptado como Voluntario",
    sello: "VOLUNTARIO OFICIAL",
    cuerpo: `Eres parte del equipo de voluntarios del ${EVENTO.nombreCompleto}. Pronto te contactaremos para contarte tu rol.`,
  },
};

/** Cabecera, saludo, nombre y título: lo que comparten todas las cartas. Devuelve dónde seguir. */
export function encabezadoDeCarta(doc: ReturnType<typeof createDoc>, saludo: string, nombre: string, titulo: string): number {
  const ancho = PAGE_W - MARGIN * 2;
  let y = drawHeader(doc) + 30;

  doc.font("Helvetica").fontSize(13).fillColor(COLORS.muted).text(saludo, MARGIN, y, { width: ancho });
  y += 22;

  doc.font("Helvetica-Bold").fontSize(24).fillColor(COLORS.ink);
  const texto = nombre || "Participante";
  const alto = Math.min(doc.heightOfString(texto, { width: ancho }), 60);
  doc.text(texto, MARGIN, y, { width: ancho, height: 60, ellipsis: true, lineGap: -2 });
  y += alto + 12;

  y = drawAccentLine(doc, y);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.deep).text(titulo, MARGIN, y, { width: ancho });
  return y + 28;
}

/** Sello: caja negra con el texto en el color del tema. */
export function sello(doc: ReturnType<typeof createDoc>, y: number, texto: string): number {
  mono(doc).fontSize(10);
  const w = doc.widthOfString(texto) + 32;
  hardBox(doc, MARGIN, y, w, 32, { fill: COLORS.ink, shadow: 0 });
  mono(doc).fontSize(10).fillColor(COLORS.block).text(texto, MARGIN + 16, y + 10, { lineBreak: false });
  return y + 32;
}

async function carta(nombre: string, rol: Rol): Promise<Buffer> {
  const doc = createDoc();
  const t = TEXTOS[rol];
  const ancho = PAGE_W - MARGIN * 2;

  let y = encabezadoDeCarta(doc, "¡Felicitaciones!", nombre, t.titulo);

  doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.ink).text(t.cuerpo, MARGIN, y, { width: ancho, lineGap: 4 });
  y += doc.heightOfString(t.cuerpo, { width: ancho, lineGap: 4 }) + 22;

  y = sello(doc, y, t.sello) + 30;

  drawEventDetails(doc, y);
  drawFooter(doc);
  return pdfToBuffer(doc);
}

export const generateSpeakerPDF = (nombre: string) => carta(nombre, "speaker");
export const generateVolunteerPDF = (nombre: string) => carta(nombre, "volunteer");
