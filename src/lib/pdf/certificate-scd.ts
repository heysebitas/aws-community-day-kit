import "server-only";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import fontkit from "@pdf-lib/fontkit";
import { PDFArray, PDFDocument, PDFName, PDFRawStream, rgb } from "pdf-lib";
import { EVENTO, PAIS } from "@/config";
import { fechaLarga } from "@/config/fechas";

/**
 * El certificado oficial de los AWS Student Community Days.
 *
 * Se escribe sobre la plantilla que el programa de Student Builder Groups
 * entrega a sus líderes. Es material de Amazon y no viene en el kit: cada
 * evento la pone en `recursos/certificado-sbg.pdf` (se usa la página oscura). La
 * plantilla es una imagen de fondo con dos textos de verdad, «Student Name» y
 * «University Name»: se vacían, se tapa con un parche lo que viene dibujado en
 * la imagen y se escribe encima lo de esta edición. Va en inglés, como la
 * plantilla.
 */

const PLANTILLA = "recursos/certificado-sbg.pdf";
const PAGINA = 1;

const FONDO = rgb(0x16 / 255, 0x1d / 255, 0x26 / 255);
const BLANCO = rgb(1, 1, 1);
const VERDE = rgb(0x00 / 255, 0xe5 / 255, 0x82 / 255);
const GRIS = rgb(0x97 / 255, 0x9a / 255, 0x9e / 255);
const TINTA = rgb(0x0a / 255, 0x0f / 255, 0x14 / 255);

// Medidas tomadas del contenido de la plantilla, en puntos.
const NOMBRE = { centro: 620.7, y: 219.1, ancho: 358 };
const PANEL = { centro: 234, ancho: 360 };
const MARCA_NOMBRE = ["556.17", "219.1"] as const;
const MARCA_ENTIDAD = ["193.3", "382.4"] as const;

const cacheArchivos = new Map<string, Buffer>();
const leer = (ruta: string) => {
  let b = cacheArchivos.get(ruta);
  if (!b) {
    b = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), ruta));
    cacheArchivos.set(ruta, b);
  }
  return b;
};

export function hayPlantillaScd(): boolean {
  return fs.existsSync(path.join(/*turbopackIgnore: true*/ process.cwd(), PLANTILLA));
}

function contenidoDe(doc: PDFDocument, pagina: ReturnType<PDFDocument["getPage"]>): string {
  const contenido = pagina.node.get(PDFName.of("Contents"));
  const refs = contenido instanceof PDFArray ? contenido.asArray() : [contenido];
  const partes: string[] = [];
  for (const ref of refs) {
    const flujo = doc.context.lookup(ref);
    if (!(flujo instanceof PDFRawStream)) continue;
    const crudo = Buffer.from(flujo.getContents());
    const comprimido = String(flujo.dict.get(PDFName.of("Filter")) ?? "").includes("FlateDecode");
    try {
      partes.push((comprimido ? zlib.inflateSync(crudo) : crudo).toString("latin1"));
    } catch {
      // Un flujo que no se puede leer se deja fuera.
    }
  }
  return partes.join("\n");
}

/** Vacía el texto que la plantilla escribe en esa posición. */
function vaciar(contenido: string, [x, y]: readonly [string, string]): string {
  const esc = (n: string) => n.replace(".", "\\.");
  return contenido.replace(new RegExp(`(1 0 0 1 ${esc(x)} ${esc(y)} Tm[\\s\\S]{0,120}?)\\[[^\\]]*\\]\\s*TJ`), "$1[] TJ");
}

export async function certificadoScd(rawName: string): Promise<Buffer> {
  const nombre = rawName.trim().toUpperCase() || "VOLUNTEER";

  const plantilla = await PDFDocument.load(new Uint8Array(leer(PLANTILLA)));
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const pagina = (await doc.copyPages(plantilla, [PAGINA]))[0]!;
  doc.addPage(pagina);

  const limpio = vaciar(vaciar(contenidoDe(doc, pagina), MARCA_NOMBRE), MARCA_ENTIDAD);
  pagina.node.set(PDFName.of("Contents"), doc.context.register(doc.context.flateStream(limpio)));

  const mono = await doc.embedFont(new Uint8Array(leer("public/fonts/JetBrainsMono-Bold.ttf")), { subset: true });
  const ancho = (texto: string, cuerpo: number) => mono.widthOfTextAtSize(texto, cuerpo);
  /** El cuerpo más grande, desde `desde`, con el que el texto cabe en `max`. */
  const ajustar = (texto: string, desde: number, minimo: number, max: number) => {
    let cuerpo = desde;
    while (cuerpo > minimo && ancho(texto, cuerpo) > max) cuerpo -= 0.5;
    return cuerpo;
  };
  const centrado = (texto: string, centro: number, y: number, cuerpo: number, color = GRIS) =>
    pagina.drawText(texto, { x: centro - ancho(texto, cuerpo) / 2, y, size: cuerpo, font: mono, color });

  centrado(nombre, NOMBRE.centro, NOMBRE.y, ajustar(nombre, 24, 9, NOMBRE.ancho), BLANCO);

  // Panel verde: el parche tapa «AWS Student Builder Group at» y en su sitio va quien organiza.
  pagina.drawRectangle({ x: 60, y: 392, width: 350, height: 20, color: VERDE });
  centrado(EVENTO.organiza, PANEL.centro, 391, ajustar(EVENTO.organiza, 12, 7, PANEL.ancho), TINTA);

  // El motivo, sobre el que trae la imagen; el agradecimiento queda entre la raya y la firma.
  pagina.drawRectangle({ x: 440, y: 152, width: 356, height: 38, color: FONDO });
  const evento = EVENTO.nombreCompleto;
  const lugar = `held on ${fechaLarga(EVENTO.inicio, "en")} — ${EVENTO.ciudad}, ${PAIS.nombreEn}`;
  centrado("For volunteering at the", NOMBRE.centro, 178, 9);
  centrado(evento, NOMBRE.centro, 165.5, ajustar(evento, 9.5, 6, NOMBRE.ancho - 10), BLANCO);
  centrado(lugar, NOMBRE.centro, 154, ajustar(lugar, 8.5, 6, NOMBRE.ancho - 10));
  centrado("Thank you for making this event possible!", NOMBRE.centro, 135, 9, VERDE);

  // Sin flujos de objetos: el PDF queda legible para las herramientas que lo inspeccionan.
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
