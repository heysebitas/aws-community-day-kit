import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Ni un `prompt()`, `confirm()` ni `alert()` del navegador en la interfaz. */

const RAIZ = join(process.cwd(), "src");

/** Cómo se distingue el nuestro del del navegador. */
const LLAMADA = /(?<![.\w])(window\s*\.\s*)?(prompt|confirm|alert)\s*\(\s*(\{?)/g;

/** Si el archivo se declara ese nombre, la llamada es suya. */
function loDeclara(codigo: string, nombre: string): boolean {
  return new RegExp(
    [
      `(?:const|let|var|import)\\s*\\{[^}]*\\b${nombre}\\b`, // destructurado
      `\\b${nombre}\\s*:`,                                   // prop o campo de tipo
      `(?:function|const|let|var)\\s+${nombre}\\b`,          // declarado a secas
    ].join("|"),
  ).test(codigo);
}

function esNativa(m: RegExpMatchArray, codigo: string): boolean {
  if (m[1]) return true;                        // window.confirm(…): siempre
  if (m[3] === "{") return false;               // confirm({ … }): el nuestro
  return !loDeclara(codigo, m[2]);              // si no es suyo, es el del navegador
}

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.tsx?$/.test(entrada)) salida.push(ruta);
  }
  return salida;
}

/** Quita comentarios y cadenas, donde la palabra sale sin ser una llamada. */
function soloCodigo(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

describe("diálogos del navegador", () => {
  test("no hay ninguno en src/", () => {
    const culpables: string[] = [];

    for (const ruta of archivos(RAIZ)) {
      const codigo = soloCodigo(readFileSync(ruta, "utf8"));
      for (const m of codigo.matchAll(LLAMADA)) {
        if (!esNativa(m, codigo)) continue;
        const linea = codigo.slice(0, m.index).split("\n").length;
        culpables.push(`${ruta.slice(RAIZ.length + 1)}:${linea} → ${m[2]}()`);
      }
    }

    assert.deepEqual(
      culpables,
      [],
      "Usa useConfirm / usePrompt / useToast en vez del diálogo del navegador " +
      `(ver CLAUDE.md):\n  ${culpables.join("\n  ")}`,
    );
  });

  test("detecta las tres formas del nativo", () => {
    // Sin esto, la prueba de arriba pasaría igual si la expresión se rompiera
    // y dejaría de proteger nada.
    const malos = [
      'const n = prompt("Nombre");',
      "if (window.confirm('¿Seguro?')) borrar();",
      "alert( 'listo' );",
      "prompt();",
      "window . alert('raro pero válido');",
    ];
    for (const e of malos) {
      const hay = [...e.matchAll(LLAMADA)].some((m) => esNativa(m, e));
      assert.ok(hay, `no detectó: ${e}`);
    }
  });

  test("no se come los nuestros, que reciben un objeto", () => {
    const buenos = [
      "const ok = await confirm({ title: 'Borrar', tone: 'danger' });",
      "const nombre = await prompt({ title: 'Nueva plantilla' });",
      "confirm({\n  title: 'En varias líneas',\n});",
      "obj.alert();",
      "miPrompt();",
      // El del escáner: llega como prop y se llama con un texto.
      "function Scan({ confirm }: { confirm: (id: string) => void }) { confirm(hit.shortId); }",
    ];
    for (const e of buenos) {
      const hay = [...e.matchAll(LLAMADA)].some((m) => esNativa(m, e));
      assert.equal(hay, false, `falso positivo: ${e}`);
    }
  });
});
