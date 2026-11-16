import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ENLACES, enlaceDe, sanearEnlaces, variablesDeEnlaces } from "@/data/enlaces";
import { variablesUsadas, type Bloque } from "@/emails/bloques";
import { armarDesdePlantilla } from "@/lib/email-plantillas";

/** Los enlaces editables. */

describe("el catálogo", () => {
  test("ninguna clave se repite", () => {
    const claves = ENLACES.map((e) => e.clave);
    assert.equal(new Set(claves).size, claves.length);
  });

  test("todos tienen etiqueta y explicación", () => {
    for (const e of ENLACES) {
      assert.ok(e.etiqueta.trim(), `${e.clave} sin etiqueta`);
      assert.ok(e.explica.trim(), `${e.clave} sin explicación`);
    }
  });

  test("una clave inventada no existe", () => {
    assert.equal(enlaceDe("grupoDeTelegram"), null);
  });
});

describe("saneado", () => {
  test("descarta claves que no están en el catálogo", () => {
    const r = sanearEnlaces({ grupoSpeakers: "https://x.cl", inventado: "https://y.cl" });
    assert.equal(r.grupoSpeakers, "https://x.cl");
    assert.equal("inventado" in r, false);
  });

  test("devuelve todas las del catálogo, aunque no lleguen", () => {
    const r = sanearEnlaces({});
    for (const e of ENLACES) assert.equal(r[e.clave], undefined, `${e.clave} no debería inventarse`);
    assert.deepEqual(r, {}, "sin entrada no se fabrica una");
  });

  test("conserva el vacío: vaciar un enlace es una acción con sentido", () => {
    // Es la forma de hacer desaparecer el botón que lo usa. Si el saneado lo
    // tratara como «no lo toques», no habría manera de quitarlo.
    const r = sanearEnlaces({ grupoVoluntarios: "" });
    assert.equal(r.grupoVoluntarios, "");
  });

  test("recorta espacios", () => {
    assert.equal(sanearEnlaces({ grupoSpeakers: "  https://x.cl  " }).grupoSpeakers, "https://x.cl");
  });

  test("ignora lo que no es texto", () => {
    assert.deepEqual(sanearEnlaces({ grupoSpeakers: 42 }), {});
    assert.deepEqual(sanearEnlaces(null), {});
  });
});

describe("de enlaces a variables", () => {
  test("sólo salen los que tienen variable", () => {
    const v = variablesDeEnlaces({ grupoSpeakers: "https://g.cl", grupoSpeakersOnline: "https://o.cl" });
    assert.equal(v.grupoWhatsapp, "https://g.cl");
    // El de online no tiene variable propia: cuál toca lo decide quien envía.
    assert.equal(Object.values(v).includes("https://o.cl"), false);
  });

  test("los vacíos no se pasan como cadena vacía", () => {
    // Pasarlos vacíos y omitirlos da lo mismo al sustituir, pero no al decidir
    // si un botón sale: ahí hace falta poder distinguir «no hay valor».
    const v = variablesDeEnlaces({ grupoSpeakers: "", comoLlegar: "   " });
    assert.equal("grupoWhatsapp" in v, false);
    assert.equal("comoLlegar" in v, false);
  });
});

describe("qué variables usa una plantilla", () => {
  const b = (x: Partial<Bloque>) => ({ id: "a", ...x }) as Bloque;

  test("las encuentra en un párrafo", () => {
    const u = variablesUsadas([b({ tipo: "parrafo", texto: "Hola {nombre}, el {fecha}." })]);
    assert.deepEqual([...u].sort(), ["fecha", "nombre"]);
  });

  test("las encuentra en el enlace de un botón", () => {
    const u = variablesUsadas([b({ tipo: "boton", texto: "Entrar", enlace: "{grupoWhatsapp}" })]);
    assert.ok(u.has("grupoWhatsapp"));
  });

  test("las encuentra dentro de las filas de una ficha de datos", () => {
    // Es el caso que se escapa si se mira sólo `texto`: el valor va anidado.
    const u = variablesUsadas([b({ tipo: "datos", filas: [{ etiqueta: "Sala", valor: "{sala}" }] })]);
    assert.ok(u.has("sala"));
  });

  test("las encuentra en los pasos", () => {
    const u = variablesUsadas([b({ tipo: "pasos", items: ["Abre {pase}", "Llega temprano"] })]);
    assert.ok(u.has("pase"));
  });

  test("también mira el asunto y el texto de bandeja", () => {
    const u = variablesUsadas([], "Hola {nombre}", "sobre {charla}");
    assert.deepEqual([...u].sort(), ["charla", "nombre"]);
  });

  test("una plantilla sin variables no declara ninguna", () => {
    assert.equal(variablesUsadas([b({ tipo: "parrafo", texto: "Texto fijo." })]).size, 0);
  });
});

describe("un botón sin enlace no sale", () => {
  const conBoton = (enlace: string) => ({
    asunto: "x",
    bloques: [
      { id: "p", tipo: "parrafo", texto: "Cuerpo del correo." },
      { id: "b", tipo: "boton", texto: "Entrar al grupo", enlace },
    ],
  });

  test("con enlace, sale", async () => {
    const c = await armarDesdePlantilla(conBoton("https://chat.whatsapp.com/ABC"), {});
    assert.ok(c.html.includes("Entrar al grupo"));
    assert.ok(c.html.includes("chat.whatsapp.com/ABC"));
  });

  test("con una variable sin valor, desaparece en vez de salir roto", async () => {
    // Esto es lo que evita el fallo del enlace de otro país: sin valor no hay
    // botón, en vez de un botón que lleva a donde no debe.
    const c = await armarDesdePlantilla(conBoton("{grupoWhatsapp}"), {});
    assert.ok(!c.html.includes("Entrar al grupo"), "el botón no debería salir");
    assert.ok(c.html.includes("Cuerpo del correo"), "el resto del correo sí sale");
  });

  test("un enlace vacío tampoco deja un botón muerto", async () => {
    const c = await armarDesdePlantilla(conBoton("   "), {});
    assert.ok(!c.html.includes("Entrar al grupo"));
  });

  test("y vuelve a salir en cuanto el enlace tiene valor", async () => {
    const c = await armarDesdePlantilla(conBoton("{grupoWhatsapp}"), {
      grupoWhatsapp: "https://chat.whatsapp.com/XYZ",
    });
    assert.ok(c.html.includes("Entrar al grupo"));
    assert.ok(c.html.includes("chat.whatsapp.com/XYZ"));
  });
});
