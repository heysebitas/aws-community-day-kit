import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { TarjetaSpeaker, type SpeakerEntry } from "@/app/api/og/speaker/[slug]/_tarjeta";

/** El dominio de la tarjeta se puede apagar. */

/** Un PNG de 1×1 transparente: las imágenes de la tarjeta van en base64. */
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const PERSONA: SpeakerEntry = {
  name: "Adán Contreras Delgado",
  photo: PIXEL,
  role: "Data Engineer Intern",
  tagline: "Data Engineer Intern @ Deloitte",
  company: "Deloitte",
  companyLogo: PIXEL,
};

const tarjeta = (dominio: string, speakers: SpeakerEntry[] = [PERSONA]) =>
  renderToStaticMarkup(
    TarjetaSpeaker({
      speakers,
      title: "Del ETL a DataOps",
      speakerLine: "Data Engineer Intern @ Deloitte",
      track: "ai-ml",
      fecha: "1 de enero de 2030",
      sede: "Sede de Prueba",
      ciudad: "Ciudad de Prueba",
      dominio,
      awsLogo: PIXEL, eventLogo: PIXEL, qrDataUrl: PIXEL,
      contentX: 530, contentY: 180, nameOffset: 532,
      titleSize: 40, nameSize: 40,
    }),
  );

describe("el dominio de la tarjeta", () => {
  test("sale cuando se le pasa", () => {
    assert.ok(tarjeta("ejemplo.test").includes("ejemplo.test"));
  });

  test("no sale cuando viene vacío", () => {
    assert.ok(!tarjeta("").includes("ejemplo.test"));
  });

  test("quitarlo no mueve nada más", () => {
    // Va en posición absoluta, así que quitarlo no puede recolocar el resto.
    // Si algún día dejara de estarlo, esto lo cazaría: lo único que tiene que
    // cambiar entre las dos versiones es el bloque del dominio.
    const con = tarjeta("ejemplo.test");
    const sin = tarjeta("");

    const soloDominio = con.replace(
      /<div style="[^"]*bottom:58px[^"]*">\s*<span[^>]*>ejemplo.test<\/span>\s*<\/div>/,
      "",
    );
    assert.equal(soloDominio, sin, "al quitar el dominio cambió algo más que el dominio");
  });

  test("tampoco sale en las de varias personas", () => {
    // La tarjeta de dos o más centra el dominio en vez de alinearlo; es otra
    // rama del dibujo y también tiene que respetar el vacío.
    const dos = [PERSONA, { ...PERSONA, name: "Camila Rojas" }];
    assert.ok(tarjeta("ejemplo.test", dos).includes("ejemplo.test"));
    assert.ok(!tarjeta("", dos).includes("ejemplo.test"));
  });

  test("el QR no depende del dominio", () => {
    // Se apaga el dominio, no el código: el QR es lo que lleva al perfil.
    const html = renderToStaticMarkup(
      TarjetaSpeaker({
        speakers: [PERSONA],
        title: "T", speakerLine: "L", track: "general",
        fecha: "F", sede: "S", ciudad: "C",
        dominio: "",
        awsLogo: PIXEL, eventLogo: PIXEL,
        qrDataUrl: "data:image/png;base64,QRFALSO",
        contentX: 530, contentY: 180, nameOffset: 532, titleSize: 40, nameSize: 40,
      }),
    );
    assert.ok(html.includes("QRFALSO"), "el QR tiene que seguir saliendo");
  });
});
