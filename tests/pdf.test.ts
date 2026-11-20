import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { certificadoGenerico, generateVolunteerCertificate } from "@/lib/pdf/certificate";
import { certificadoScd, hayPlantillaScd } from "@/lib/pdf/certificate-scd";
import { generateRegistrationPDF } from "@/lib/pdf/registration";
import { generateSpeakerPDF, generateVolunteerPDF } from "@/lib/pdf/speaker";
import { generateInternationalSpeakerPDF } from "@/lib/pdf/speaker-international";
import { generarEscarapelas, presetDesde, MUESTRA } from "@/lib/pdf/escarapela";

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

  // La plantilla es de Amazon y no viene en el repo: sólo se prueba donde alguien la puso.
  test("el certificado oficial de un SCD", { skip: !hayPlantillaScd() && "sin recursos/certificado-sbg.pdf" }, async () => {
    comprobar("certificado-scd", await certificadoScd("Ana Ejemplo"));
    comprobar("certificado-scd-nombre-largo", await certificadoScd(LARGO));
  });

  test("el certificado genérico de un Community Day", async () => {
    comprobar("certificado-generico", await certificadoGenerico("Ana Ejemplo"));
    comprobar("certificado-generico-nombre-largo", await certificadoGenerico(LARGO));
  });

  test("el que se envía sale según el tipo de evento", async () => {
    comprobar("certificado", await generateVolunteerCertificate("Ana Ejemplo"));
  });
});

describe("las escarapelas", () => {
  const o = { sitio: "https://example.com", titulo: "Escarapelas", roles: { attendee: "ASISTENTE", speaker: "SPEAKER", volunteer: "VOLUNTARIO", organizer: "ORGANIZADOR" } };
  const personas = [
    { shortId: "demo00000001", role: "attendee", firstName: "Lucía", lastName: "Peña", company: "Universidad Demo", jobTitle: "Estudiante de sistemas" },
    { shortId: "demo00000002", role: "speaker", firstName: "Maximiliano", lastName: "Santamaría", badgeFirstName: "María Fernanda", badgeLastName: "Rodríguez-Echeverría",
      company: "Universidad Nacional Abierta y a Distancia, sede Bogotá", jobTitle: "Arquitecta de soluciones en la nube para el sector público" },
    { shortId: "demo00000003", role: "volunteer", firstName: "Łukasz", lastName: "Wójcik" },
    { shortId: "demo00000004", role: "organizer", firstName: "Ana", lastName: "" },
  ];
  const presets = {
    "lado-4x6": { layout: "side" },
    "apilada-4x6": { layout: "stacked", alignName: "center", alignJobTitle: "center", alignCompany: "center", alignRole: "center" },
    "apilada-pequena": { widthMm: 62, heightMm: 100, marginMm: 3, layout: "stacked", alignName: "center", alignJobTitle: "center", alignCompany: "center", alignRole: "center", qrPct: 45 },
    "dos-por-etiqueta": { perLabel: 2, rotate: 90 },
  };

  for (const [nombre, preset] of Object.entries(presets)) {
    test(nombre, async () => {
      const pdf = await generarEscarapelas(personas, preset, o);
      assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
      assert.equal(paginas(pdf), "perLabel" in preset ? 2 : personas.length);
      if (process.env.GUARDAR_PDF) fs.writeFileSync(path.join(process.env.GUARDAR_PDF, `escarapela-${nombre}.pdf`), pdf);
    });
  }
});

describe("la vista previa de escarapelas", () => {
  test("un preset del formulario queda dentro de los límites", () => {
    const p = presetDesde({ widthMm: 1e9, heightMm: "abc", rotate: 45, perLabel: 7, layout: "<script>", alignName: "x", showQr: false });
    assert.equal(p.widthMm, 101.6);
    assert.equal(p.heightMm, 152.4);
    assert.equal(p.rotate, 0);
    assert.equal(p.perLabel, 1);
    assert.equal(p.layout, "side");
    assert.equal(p.alignName, "left");
    assert.equal(p.showQr, false);
  });

  test("la muestra sale en una página por persona", async () => {
    const pdf = await generarEscarapelas(MUESTRA, presetDesde({ layout: "stacked" }), { sitio: "https://example.com", titulo: "Muestra", roles: {} });
    assert.equal(paginas(pdf), MUESTRA.length);
  });
});
