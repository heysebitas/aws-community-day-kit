import {
  COLORS, MARGIN, PAGE_W,
  createDoc, drawEventDetails, drawFooter, drawHeader, hardBox, mono, pdfToBuffer,
} from "./common";

/**
 * El pase que se adjunta al correo de confirmación. Lo que importa es que el
 * QR se lea en la puerta al primer intento: va grande y sobre blanco puro.
 *
 * El alto de la página es fijo; si el contenido se pasa, PDFKit abre una
 * segunda hoja en blanco.
 */
export async function generateRegistrationPDF(name: string, qrPngBuffer: Buffer, qrCodeText: string): Promise<Buffer> {
  const doc = createDoc();
  const clean = (name || "").trim();
  const firstName = clean ? clean.split(/\s+/)[0] : "";
  const ancho = PAGE_W - MARGIN * 2;
  const centrado = { width: ancho, align: "center" as const };

  let y = drawHeader(doc) + 16;

  mono(doc).fontSize(8).fillColor(COLORS.deep).text("PASE DE ACCESO", MARGIN, y, { ...centrado, lineBreak: false });
  y += 15;

  // A dos líneas como mucho: un nombre largo no debe empujar el QR fuera de la página.
  doc.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.ink);
  const displayName = (clean || "Asistente").toUpperCase();
  const nameH = Math.min(doc.heightOfString(displayName, { width: ancho }), 56);
  doc.text(displayName, MARGIN, y, { ...centrado, height: 56, ellipsis: true, lineGap: -3 });
  y += nameH + 8;

  doc.font("Helvetica").fontSize(10).fillColor(COLORS.ink).text(
    firstName ? `${firstName}, este es tu pase. Muéstralo en la entrada.` : "Muestra este código en la entrada.",
    MARGIN, y, centrado,
  );
  y += 22;

  // El blanco alrededor del código no es adorno: los lectores necesitan esa zona de silencio.
  const qrSize = 150;
  const pad = 13;
  const boxSize = qrSize + pad * 2;
  const qrX = (PAGE_W - boxSize) / 2;

  hardBox(doc, qrX, y, boxSize, boxSize, { fill: COLORS.white, shadow: 6 });
  doc.image(qrPngBuffer, qrX + pad, y + pad, { width: qrSize, height: qrSize });
  y += boxSize + 10;

  mono(doc).fontSize(11).fillColor(COLORS.ink).text(qrCodeText, 0, y, { width: PAGE_W, align: "center", lineBreak: false });
  y += 13;

  doc.font("Helvetica").fontSize(7).fillColor(COLORS.deep)
    .text("Si el lector falla, este código sirve igual.", 0, y, { width: PAGE_W, align: "center" });
  y += 16;

  drawEventDetails(doc, y);
  drawFooter(doc);
  return pdfToBuffer(doc);
}
