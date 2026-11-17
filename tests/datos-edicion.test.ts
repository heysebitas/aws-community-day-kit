import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PAISES } from "@/config/paises";

/**
 * Los datos de una edición no se escriben en el kit.
 *
 * La ciudad, el país y el año salen de `evento/config.ts`. Si alguien los
 * escribe en `src/`, la edición siguiente los muestra viejos: la tarjeta
 * para compartir dice otra ciudad, el PDF otro evento y el panel otro año.
 * Esta prueba los busca para que no vuelva a pasar.
 */

const RAIZ = path.resolve(__dirname, "..");
const SRC = path.join(RAIZ, "src");

/** `src/config/` guarda la lista de países y ciudades: ahí sí van escritas. */
const CONFIG_KIT = path.join(SRC, "config");

/**
 * Fechas de ejemplo que sí pueden quedar escritas, con su porqué.
 * La clave es la ruta del archivo, relativa a `src/`.
 */
const EXCEPCIONES: Record<string, string> = {};

/** Los archivos de prueba no son el kit: ahí los años de ejemplo están bien. */
const esPrueba = (archivo: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(archivo);

const sinAcentos = (valor: string) => valor.normalize("NFD").replace(/\p{Diacritic}/gu, "");

const escapar = (valor: string) => valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Las ciudades y los países que el kit conoce. Si uno sale en mayúsculas,
 * está escrito a mano: en el kit los datos van en minúscula y se suben.
 */
const LUGARES = [
  ...new Set(Object.values(PAISES).flatMap((p) => [p.capital.nombre, p.nombre, p.nombreEn])),
];

/** El patrón de un lugar: en mayúsculas, y sin depender de los acentos. */
function patronDe(lugar: string): RegExp {
  const formas = [...new Set([lugar.toUpperCase(), sinAcentos(lugar).toUpperCase()])];
  const cuerpo = formas.map(escapar).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, "u");
}

const PATRONES = LUGARES.map((lugar) => ({ lugar, patron: patronDe(lugar) }));

/** Un año escrito: cuatro cifras, de 1900 a 2099. */
const ANIO = /\b(?:19|20)\d{2}\b/;

/**
 * Los enlaces no son texto: el «2000» del namespace de SVG no es un año.
 * Se borran antes de mirar, no se saltan: un texto con un enlace y un año
 * escrito sigue teniendo el año escrito.
 */
const sinEnlaces = (texto: string) => texto.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, " ");

/** Los literales de cadena del código: lo que puede acabar en pantalla. */
function literales(codigo: string): string[] {
  const salida: string[] = [];
  const patron = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = patron.exec(codigo))) salida.push(m[1] ?? m[2] ?? m[3] ?? "");
  return salida;
}

/** El texto que va entre etiquetas, que también puede llevar un año. */
function textoJsx(codigo: string): string[] {
  return [...codigo.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]!);
}

function archivosDeSrc(): string[] {
  const salida: string[] = [];
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (ruta !== CONFIG_KIT) recorrer(ruta);
      } else if (/\.(ts|tsx|js|jsx|json)$/.test(entrada.name) && !esPrueba(entrada.name)) {
        salida.push(ruta);
      }
    }
  };
  recorrer(SRC);
  return salida.sort();
}

describe("los datos de la edición", () => {
  test("no hay ciudades ni países escritos en el kit", () => {
    const culpables: string[] = [];

    for (const archivo of archivosDeSrc()) {
      const lineas = fs.readFileSync(archivo, "utf8").split("\n");
      lineas.forEach((linea, i) => {
        for (const { lugar, patron } of PATRONES) {
          const m = linea.match(patron);
          if (m) {
            culpables.push(`${path.relative(RAIZ, archivo)}:${i + 1} → «${m[0]}» (${lugar})`);
          }
        }
      });
    }

    assert.deepEqual(
      culpables,
      [],
      `hay datos de la edición escritos en el kit:\n${culpables.join("\n")}`,
    );
  });

  test("no hay años escritos en los textos", () => {
    const culpables: string[] = [];

    for (const archivo of archivosDeSrc()) {
      const relativo = path.relative(SRC, archivo);
      if (EXCEPCIONES[relativo]) continue;

      const codigo = fs.readFileSync(archivo, "utf8");
      const textos = [...literales(codigo), ...textoJsx(codigo)];
      for (const texto of textos) {
        const m = sinEnlaces(texto).match(ANIO);
        if (m) culpables.push(`${relativo} → «${m[0]}»`);
      }
    }

    assert.deepEqual(
      culpables,
      [],
      `hay años escritos en los textos del kit:\n${culpables.join("\n")}`,
    );
  });
});
