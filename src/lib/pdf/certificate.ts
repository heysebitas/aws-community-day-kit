import "server-only";
import { EVENTO, PAIS } from "@/config";
import { fechaLarga } from "@/config/fechas";
import { certificadoScd, hayPlantillaScd } from "./certificate-scd";
import { COLORS, createDoc, drawHeader, hardBox, mono, pdfToBuffer, strip } from "./common";

/**
 * El certificado de voluntariado.
 *
 * Un AWS Student Community Day (`tipo: "scd"`) usa el certificado oficial del
 * programa, si el evento puso su plantilla en `recursos/`. Sin ella, y en
 * cualquier otro Community Day, sale el
 * genérico: una hoja apaisada dibujada con el tema de la edición, que firma
 * quien diga `detalles.certificado`.
 */

const ANCHO = 842;
const ALTO = 595;
const MARGEN = 64;

export async function generateVolunteerCertificate(rawName: string): Promise<Buffer> {
  if (EVENTO.tipo === "scd" && hayPlantillaScd()) {
    try {
      return await certificadoScd(rawName);
    } catch (e) {
      // Una plantilla distinta de la esperada no puede dejar a nadie sin certificado.
      console.error("[certificado] no se pudo usar recursos/certificado-sbg.pdf; sale el genérico:", e);
    }
  }
  return certificadoGenerico(rawName);
}

export async function certificadoGenerico(rawName: string): Promise<Buffer> {
  const nombre = rawName.trim().toUpperCase() || "VOLUNTARIO";
  const doc = createDoc([ANCHO, ALTO]);
  const util = ANCHO - MARGEN * 2;
  const firma = EVENTO.detalles.certificado;

  let y = drawHeader(doc, ANCHO) + 34;

  mono(doc).fontSize(11).fillColor(COLORS.deep)
    .text("CERTIFICADO DE VOLUNTARIADO", MARGEN, y, { lineBreak: false, characterSpacing: 2 });
  y += 30;

  doc.font("Helvetica").fontSize(13).fillColor(COLORS.ink).text("Se otorga a", MARGEN, y);
  y += 24;

  // El nombre baja de tamaño hasta caber en una línea.
  let cuerpo = 44;
  doc.font("Helvetica-Bold");
  while (cuerpo > 18 && doc.fontSize(cuerpo).widthOfString(nombre) > util) cuerpo -= 1;
  doc.fontSize(cuerpo).fillColor(COLORS.ink).text(nombre, MARGEN, y, { lineBreak: false });
  y += cuerpo + 16;

  doc.rect(MARGEN, y, 96, 6).fill(COLORS.ink);
  y += 30;

  const texto =
    `por su trabajo como parte del equipo de voluntariado del ${EVENTO.nombreCompleto}, ` +
    `realizado el ${fechaLarga(EVENTO.inicio, "es")} en ${EVENTO.ciudad}, ${PAIS.nombre}.`;
  doc.font("Helvetica").fontSize(14).fillColor(COLORS.ink).text(texto, MARGEN, y, { width: util * 0.72, lineGap: 5 });

  // Quién lo otorga, abajo a la izquierda, en una caja blanca.
  const cajaY = ALTO - 26 - 96;
  hardBox(doc, MARGEN, cajaY, 300, 64, { fill: COLORS.white, shadow: 5 });
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.ink)
    .text(firma?.nombre ?? EVENTO.organiza, MARGEN + 14, cajaY + 14, { width: 272, lineBreak: false, ellipsis: true });
  mono(doc).fontSize(8).fillColor(COLORS.deep)
    .text((firma?.cargo ?? "Equipo organizador").toUpperCase(), MARGEN + 14, cajaY + 36, { width: 272, lineBreak: false, ellipsis: true });

  mono(doc).fontSize(64).fillColor(COLORS.deep)
    .text(String(EVENTO.anio), ANCHO - MARGEN - 220, cajaY - 6, { width: 220, align: "right", lineBreak: false });

  strip(doc, ALTO - 26, `GRACIAS POR HACERLO POSIBLE   ·   ${EVENTO.nombre.toUpperCase()} ${EVENTO.edicion.toUpperCase()} ${EVENTO.anio}`, 26, ANCHO);
  return pdfToBuffer(doc);
}
