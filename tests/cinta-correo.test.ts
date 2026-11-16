import { TEMA } from "@/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { render } from "@react-email/components";
import { PlantillaBloques } from "@/emails/plantilla-bloques";

/** La cinta no puede ensanchar el correo. */

const correo = (strip?: string) =>
  PlantillaBloques({ bloques: [{ id: "a", tipo: "parrafo", texto: "Cuerpo." }], strip });

/** El trozo de HTML de la primera cinta. */
function cinta(html: string): string {
  const i = html.indexOf('style="overflow:hidden"');
  assert.ok(i > 0, "la cinta ya no va dentro de algo que recorte");
  return html.slice(i, html.indexOf("</table>", i));
}

describe("la cinta", () => {
  test("va dentro de algo que la recorta, arriba y abajo", async () => {
    const html = await render(correo());
    const envoltorios = [...html.matchAll(/<div style="overflow:hidden">\s*<table/g)];
    assert.equal(envoltorios.length, 2, "deben ser dos: la de arriba y la de abajo");
  });

  test("la tabla tiene ancho fijo — esto es lo que faltaba", async () => {
    // Sin `fixed`, la tabla pide el ancho de las tres copias sin cortar y se
    // lleva por delante al correo entero. Con `fixed`, el ancho sale del
    // `width` y el contenido deja de mandar.
    assert.match(cinta(await render(correo())), /table-layout:fixed/);
  });

  test("y ese ancho es el del correo, no el del contenido", async () => {
    assert.match(cinta(await render(correo())), /width:100%/);
  });

  test("es una sola celda, no tres", async () => {
    // Con tres celdas y ancho fijo, cada una mediría un tercio y el texto se
    // derramaría sobre las vecinas, pisándose. En una sola, las tres copias
    // son una línea seguida que se corta limpia por la derecha.
    const celdas = [...cinta(await render(correo())).matchAll(/<td/g)];
    assert.equal(celdas.length, 1, `hay ${celdas.length} celdas`);
  });

  test("sigue saliendo el texto tres veces en cada cinta", async () => {
    const html = await render(correo("HOLA · PRUEBA"));
    assert.equal(html.split("HOLA · PRUEBA").length - 1, 6, "dos cintas × tres copias");
  });

  test("el bloque alterno del medio sigue ahí", async () => {
    // Es lo que hace que parezca una marquesina y no una línea de texto.
    const c = cinta(await render(correo()));
    assert.ok(c.includes(`background-color:${TEMA.acento}`), "falta el resalte del medio");
  });

  test("un texto mucho más largo tampoco rompe nada", async () => {
    const largo = "UN TEXTO MUCHO MAS LARGO QUE EL DE SIEMPRE PARA LA CINTA DEL CORREO";
    const c = cinta(await render(correo(largo)));
    assert.ok(c.includes(largo));
    assert.match(c, /table-layout:fixed/, "el recorte tiene que seguir valiendo");
  });
});
