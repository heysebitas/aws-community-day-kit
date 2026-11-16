import { EVENTO, PAIS } from "@/config";
import { COLORS, MARGIN, PAGE_W, createDoc, drawEventDetails, drawFooter, hardBox, mono, pdfToBuffer } from "./common";
import { encabezadoDeCarta, sello } from "./speaker";

/**
 * La carta para un speaker que viaja desde otro país: la aceptación y, si la
 * edición los definió en `detalles.consejosViaje`, unos datos para el viaje.
 */
export async function generateInternationalSpeakerPDF(name: string): Promise<Buffer> {
  const doc = createDoc();
  const ancho = PAGE_W - MARGIN * 2;
  const consejos = EVENTO.detalles.consejosViaje ?? [];

  let y = encabezadoDeCarta(doc, `¡Gracias por viajar hasta ${PAIS.nombre}!`, name, "Speaker Internacional");

  const cuerpo =
    `Tu propuesta fue seleccionada para el ${EVENTO.nombreCompleto}. ` +
    "El equipo organizador se pondrá en contacto contigo para coordinar los detalles de tu participación.";
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.ink).text(cuerpo, MARGIN, y, { width: ancho, lineGap: 3 });
  y += doc.heightOfString(cuerpo, { width: ancho, lineGap: 3 }) + 18;

  // Con consejos no hay sitio para el sello: la hoja es una sola.
  if (!consejos.length) y = sello(doc, y, "SPEAKER INTERNACIONAL") + 20;

  if (consejos.length) {
    const pad = 12;
    doc.font("Helvetica").fontSize(8);
    const altos = consejos.map((c) => doc.heightOfString(c, { width: ancho - pad * 2 - 12, lineGap: 1 }));
    const alto = pad * 2 + 16 + altos.reduce((a, b) => a + b + 5, 0);

    hardBox(doc, MARGIN, y, ancho, alto, { fill: COLORS.white, shadow: 4 });
    mono(doc).fontSize(7.5).fillColor(COLORS.deep)
      .text(`PARA TU VIAJE A ${EVENTO.ciudad.toUpperCase()}`, MARGIN + pad, y + pad, { lineBreak: false });

    let ty = y + pad + 16;
    consejos.forEach((c, i) => {
      mono(doc).fontSize(8).fillColor(COLORS.ink).text("·", MARGIN + pad, ty, { lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
        .text(c, MARGIN + pad + 12, ty, { width: ancho - pad * 2 - 12, lineGap: 1 });
      ty += altos[i] + 5;
    });
    y += alto + 14;
  }

  drawEventDetails(doc, y);
  drawFooter(doc);
  return pdfToBuffer(doc);
}
