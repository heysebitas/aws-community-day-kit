import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { render } from "@react-email/components";
import { dibujarCorreo } from "@/emails/dibujar";
import { PlantillaBloques } from "@/emails/plantilla-bloques";
import { SEMILLAS } from "@/emails/semilla";
import { sanearBloques, type Bloque } from "@/emails/bloques";

/** La vista previa no puede mentir. */

const VALORES = {
  nombre: "Camila",
  nombreCompleto: "Camila Rojas Vergara",
  correo: "camila@ejemplo.cl",
  charla: "Observabilidad sin morir en el intento",
  modalidad: "Presencial",
  grupoWhatsapp: "https://chat.whatsapp.com/ABC",
  comoLlegar: "https://maps.app.goo.gl/XYZ",
  evento: "Evento de Prueba 2030",
  fecha: "1 de enero de 2030",
  sede: "Universidad de Prueba",
  sitio: "https://ejemplo.test",
};

const arma = (bloques: Bloque[], banderas: string[], preview?: string, strip?: string) =>
  PlantillaBloques({ bloques, preview, strip, valores: VALORES, banderas });

describe("el navegador y el servidor dibujan lo mismo", () => {
  for (const s of SEMILLAS) {
    test(`${s.slug}, en sus cuatro variantes`, async () => {
      const bloques = sanearBloques(s.bloques) as Bloque[];

      for (const banderas of [
        ["presencial", "nacional"], ["presencial", "internacional"],
        ["online", "nacional"], ["online", "internacional"],
      ]) {
        const nodo = () => arma(bloques, banderas, s.preview, s.strip);
        const servidor = await render(nodo());
        const navegador = await dibujarCorreo(nodo());

        assert.equal(
          navegador,
          servidor,
          `${s.slug} [${banderas.join("+")}] sale distinto en la vista previa que al enviarse`,
        );
      }
    });
  }
});

describe("casos sueltos", () => {
  const b = (x: Partial<Bloque>) => ({ id: "a", ...x }) as Bloque;

  test("una plantilla vacía", async () => {
    const nodo = () => PlantillaBloques({ bloques: [] });
    assert.equal(await dibujarCorreo(nodo()), await render(nodo()));
  });

  test("todos los tipos de bloque a la vez", async () => {
    // Si se añade un tipo nuevo y se dibuja distinto en cada lado, acá se ve.
    const bloques: Bloque[] = [
      b({ tipo: "kicker", texto: "kicker" }),
      b({ id: "b", tipo: "titulo", texto: "Título {nombre}" }),
      b({ id: "c", tipo: "parrafo", texto: "Párrafo", apagado: true }),
      b({ id: "d", tipo: "boton", texto: "Ir", enlace: "https://x.cl" }),
      b({ id: "e", tipo: "boton", texto: "Contorno", enlace: "https://x.cl", contorno: true }),
      b({ id: "f", tipo: "aviso", titulo: "Aviso", texto: "Cuidado" }),
      b({ id: "g", tipo: "datos", filas: [{ etiqueta: "Fecha", valor: "{fecha}" }] }),
      b({ id: "h", tipo: "pasos", items: ["Uno", "Dos"] }),
      b({ id: "i", tipo: "cifra", valor: "24", etiqueta: "de octubre" }),
      b({ id: "j", tipo: "separador" }),
    ];
    const nodo = () => PlantillaBloques({ bloques, valores: VALORES, preview: "Hola" });
    assert.equal(await dibujarCorreo(nodo()), await render(nodo()));
  });

  test("con acentos, comillas y signos que hay que escapar", async () => {
    const bloques = [b({ tipo: "parrafo", texto: `Añadí "comillas" & <etiquetas> 'sueltas' — ¿sí?` })];
    const nodo = () => PlantillaBloques({ bloques, valores: VALORES });
    assert.equal(await dibujarCorreo(nodo()), await render(nodo()));
  });

  test("un botón sin enlace desaparece en los dos", async () => {
    const bloques = [
      b({ tipo: "parrafo", texto: "Cuerpo" }),
      b({ id: "b", tipo: "boton", texto: "No sale", enlace: "{sinValor}" }),
    ];
    const nodo = () => PlantillaBloques({ bloques, valores: VALORES });
    const servidor = await render(nodo());
    assert.equal(await dibujarCorreo(nodo()), servidor);
    assert.ok(!servidor.includes("No sale"));
  });
});
