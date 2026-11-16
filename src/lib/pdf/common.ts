import path from "node:path";
import fs from "node:fs";
import PDFDocument from "pdfkit";
import { DOMINIO, EVENTO, TEMA } from "@/config";
import { fechaConDia, fechaCorta, hora, zonaDe } from "@/config/fechas";

/**
 * Las primitivas de los PDF, en el lenguaje del sitio: bloque de color a
 * sangre, tinta negra, esquinas rectas y sombras duras.
 *
 * PDFKit no lee woff2, así que la única tipografía del sitio que se puede
 * incrustar es JetBrains Mono Bold; el peso regular sale de Helvetica.
 */

export const COLORS = {
  /** Fondo de página. */
  block: TEMA.acento,
  ink: "#000000",
  /** Acento para usar sobre el bloque. */
  deep: TEMA.profundo,
  white: "#FFFFFF",
  /** Letra chica sobre blanco. */
  muted: "#44403C",
};

export const PAGE_W = 420;
export const PAGE_H = 595;
export const MARGIN = 36;

export type Doc = InstanceType<typeof PDFDocument>;

const publico = (ruta: string) => path.join(/*turbopackIgnore: true*/ process.cwd(), "public", ruta);

let logo: Buffer | null | undefined;
let fuente: Buffer | null | undefined;

/** El logo de la cabecera. PDFKit no dibuja SVG: hace falta `marca.logoPng`. */
function cargarLogo(): Buffer | null {
  if (logo === undefined) {
    const ruta = EVENTO.marca.logoPng;
    logo = ruta && fs.existsSync(publico(ruta)) ? fs.readFileSync(publico(ruta)) : null;
  }
  return logo;
}

function cargarFuente(): Buffer | null {
  if (fuente === undefined) {
    const ruta = publico("fonts/JetBrainsMono-Bold.ttf");
    fuente = fs.existsSync(ruta) ? fs.readFileSync(ruta) : null;
  }
  return fuente;
}

/** La mono del sitio si se pudo cargar; si no, la de PDFKit. */
export function mono(doc: Doc): Doc {
  return doc.font(cargarFuente() ? "JetBrains" : "Courier-Bold");
}

export function pdfToBuffer(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

/** Documento nuevo, con el fondo ya pintado. */
export function createDoc(tamano: [number, number] = [PAGE_W, PAGE_H]): Doc {
  const doc = new PDFDocument({
    size: tamano,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: { Title: EVENTO.nombreCompleto, Author: EVENTO.organiza },
  });
  const f = cargarFuente();
  if (f) doc.registerFont("JetBrains", f);
  doc.rect(0, 0, tamano[0], tamano[1]).fill(COLORS.block);
  return doc;
}

/** Caja dura: un rectángulo con otro detrás, corrido en diagonal, como sombra. */
export function hardBox(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: string; stroke?: string; shadow?: number } = {},
) {
  const { fill, stroke = COLORS.ink, shadow = 5 } = opts;
  if (shadow > 0) doc.rect(x + shadow, y + shadow, w, h).fill(COLORS.ink);
  if (fill) doc.rect(x, y, w, h).fill(fill);
  doc.rect(x, y, w, h).lineWidth(2).stroke(stroke);
}

/** Cinta invertida: barra negra con el texto repetido hasta llenar. */
export function strip(doc: Doc, y: number, text: string, h = 26, ancho = PAGE_W) {
  doc.rect(0, y, ancho, h).fill(COLORS.ink);

  mono(doc).fontSize(8).fillColor(COLORS.block);
  const piece = `${text}   ·   `;
  const repeats = Math.ceil(ancho / Math.max(doc.widthOfString(piece), 1)) + 1;

  // Se recorta y se dibuja sin `width`: con ancho, PDFKit parte el texto en
  // varias líneas aunque se le pida `lineBreak: false`.
  doc.save();
  doc.rect(0, y, ancho, h).clip();
  doc.text(piece.repeat(repeats), 4, y + (h - doc.currentLineHeight()) / 2, { lineBreak: false });
  doc.restore();

  return y + h;
}

/**
 * Cabecera: cinta negra con el logotipo del evento, centrado. Se mide antes de
 * dibujar porque el ancho depende de la tipografía que se haya podido cargar.
 */
export function drawHeader(doc: Doc, ancho = PAGE_W): number {
  const headerH = 84;
  doc.rect(0, 0, ancho, headerH).fill(COLORS.ink);

  const imagen = cargarLogo();
  const logoW = imagen ? 46 : 0;
  const logoH = 28;
  const gap = imagen ? 9 : 0;
  const { lineas } = EVENTO.marca;
  const edicion = `${EVENTO.edicion} ${EVENTO.anio}`;

  mono(doc).fontSize(9);
  const textW = Math.max(...lineas.map((l) => doc.widthOfString(l)), doc.widthOfString(edicion));
  const x = (ancho - (logoW + gap + textW)) / 2;

  if (imagen) doc.image(imagen, x, (headerH - logoH) / 2, { fit: [logoW, logoH], valign: "center" });

  const lineH = 11;
  let ty = (headerH - lineH * (lineas.length + 1)) / 2;
  const tx = x + logoW + gap;

  mono(doc).fontSize(9).fillColor(COLORS.white);
  for (const l of lineas) {
    doc.text(l, tx, ty, { lineBreak: false });
    ty += lineH;
  }
  mono(doc).fontSize(7.5).fillColor(COLORS.block);
  doc.text(edicion, tx, ty + 1, { lineBreak: false, characterSpacing: 0.8 });

  doc.rect(0, headerH, ancho, 4).fill(COLORS.deep);
  return headerH + 4;
}

/** Regla gruesa corta, para separar bloques de texto. */
export function drawAccentLine(doc: Doc, y: number, x = MARGIN): number {
  doc.rect(x, y, 56, 5).fill(COLORS.ink);
  return y + 18;
}

/** Los datos del evento en una caja blanca, en filas etiqueta / valor. */
export function drawEventDetails(doc: Doc, y: number): number {
  const boxX = MARGIN;
  const boxW = PAGE_W - MARGIN * 2;
  const dia = fechaConDia(EVENTO.inicio, "es");
  const rows = [
    ["FECHA", `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${EVENTO.anio}`],
    ["HORA", `${hora(EVENTO.inicio, "es")} (${zonaDe(EVENTO.inicio, "es")})`],
    ["LUGAR", EVENTO.sede.nombre],
    ["DIRECCIÓN", `${EVENTO.sede.direccion}, ${EVENTO.sede.localidad}`],
    ["ENTRADA", "Gratuita"],
  ];
  const pad = 12;
  const rowH = 15;
  const boxH = pad * 2 + rows.length * rowH;

  hardBox(doc, boxX, y, boxW, boxH, { fill: COLORS.white, shadow: 4 });

  let rowY = y + pad;
  for (const [label, value] of rows) {
    mono(doc).fontSize(7).fillColor(COLORS.deep).text(label, boxX + pad, rowY, { lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLORS.ink)
      .text(value, boxX + pad + 74, rowY - 1, { width: boxW - pad * 2 - 74, height: rowH, lineBreak: false, ellipsis: true });
    rowY += rowH;
  }

  return y + boxH + 6;
}

/** Pie: dos cintas invertidas a ras del borde inferior. */
export function drawFooter(doc: Doc): void {
  strip(doc, PAGE_H - 52, "NOS VEMOS AHÍ", 26);
  strip(doc, PAGE_H - 26, `${DOMINIO.toUpperCase()}   ·   ${fechaCorta(EVENTO.inicio)}   ·   ${EVENTO.ciudad.toUpperCase()}`, 26);
}
