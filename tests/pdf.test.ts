import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { generateVolunteerCertificate } from "@/lib/pdf/certificate";
import { generateRegistrationPDF } from "@/lib/pdf/registration";
import { generateSpeakerPDF, generateVolunteerPDF } from "@/lib/pdf/speaker";
import { generateInternationalSpeakerPDF } from "@/lib/pdf/speaker-international";

/** Los PDF que se adjuntan a los correos. */

const paginas = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;

function comprobar(nombre: string, pdf: Buffer) {
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-", `${nombre} no es un PDF`);
  assert.equal(paginas(pdf), 1, `${nombre} no cabe en una hoja`);
  const carpeta = process.env.GUARDAR_PDF;
  if (carpeta) fs.writeFileSync(path.join(carpeta, `${nombre}.pdf`), pdf);
}

const LARGO = "María Fernanda de los Ángeles Rodríguez-Echeverría Santamaría";

describe("los PDF caben en una hoja", () => {
  test("el pase de acceso", async () => {
    const qr = await QRCode.toBuffer("ABC123XYZ", { type: "png", width: 400 });
    comprobar("pase", await generateRegistrationPDF("Ana Ejemplo", qr, "ABC123XYZ"));
    comprobar("pase-nombre-largo", await generateRegistrationPDF(LARGO, qr, "ABC123XYZ"));
  });

  test("las cartas de aceptación", async () => {
    comprobar("carta-speaker", await generateSpeakerPDF("Ana Ejemplo"));
    comprobar("carta-voluntario", await generateVolunteerPDF(LARGO));
    comprobar("carta-internacional", await generateInternationalSpeakerPDF(LARGO));
  });

  test("el certificado de voluntariado", async () => {
    comprobar("certificado", await generateVolunteerCertificate("Ana Ejemplo"));
    comprobar("certificado-nombre-largo", await generateVolunteerCertificate(LARGO));
  });
});
