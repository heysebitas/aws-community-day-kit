import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** Las skills de desarrollo tienen que ser utilizables y no citar archivos inventados. */

const RAIZ = path.resolve(import.meta.dirname, "..");
const SKILLS = ["kit-ruta-api", "kit-medir", "kit-verificar", "kit-texto", "kit-correo"];

type Frontmatter = Record<string, string>;

function leer(relative: string): string {
  return readFileSync(path.join(RAIZ, relative), "utf8");
}

function frontmatter(texto: string): Frontmatter {
  const bloque = texto.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  assert.ok(bloque, "falta el frontmatter delimitado por ---");

  const salida: Frontmatter = {};
  for (const linea of bloque.split(/\r?\n/)) {
    const m = linea.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let valor = m[2].trim();
    if (
      valor.length >= 2 &&
      ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'")))
    ) {
      valor = valor.slice(1, -1);
    }
    salida[m[1]] = valor;
  }
  return salida;
}

function markdownEn(directorio: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(path.join(RAIZ, directorio), { withFileTypes: true })) {
    const relativo = `${directorio}/${entrada.name}`;
    if (entrada.isDirectory()) salida.push(...markdownEn(relativo));
    else if (entrada.name.endsWith(".md")) salida.push(relativo);
  }
  return salida;
}

function archivosDelRepo(directorio = RAIZ, salida: string[] = []): string[] {
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules"].includes(entrada.name)) continue;
    const completo = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) archivosDelRepo(completo, salida);
    else salida.push(path.relative(RAIZ, completo).split(path.sep).join("/"));
  }
  return salida;
}

const REPO = archivosDelRepo();

function coincideGlob(patron: string): boolean {
  let expresion = "^";
  for (const caracter of patron) {
    if (caracter === "*") expresion += "[^/]*";
    else if (caracter === "?") expresion += "[^/]";
    else expresion += /[\\^$.*+?()[\]{}|]/.test(caracter) ? `\\${caracter}` : caracter;
  }
  expresion += "$";
  return REPO.some((archivo) => new RegExp(expresion).test(archivo));
}

const PREFIJOS = [
  ".claude/",
  ".kiro/",
  "docs/",
  "evento/",
  "public/",
  "recursos/",
  "scripts/",
  "src/",
  "tests/",
];
const ARCHIVOS_RAIZ = new Set(["AGENTS.md", "CLAUDE.md", "package.json", "package-lock.json"]);

function pareceFichero(candidato: string): boolean {
  if (!candidato || candidato.includes("<") || candidato.includes(">")) return false;
  const limpio = candidato.replace(/^#.*$/, "").replace(/:\d+$/, "");
  return PREFIJOS.some((prefijo) => limpio.startsWith(prefijo)) || ARCHIVOS_RAIZ.has(limpio);
}

function ficherosCitados(texto: string): string[] {
  const candidatos: string[] = [];
  for (const m of texto.matchAll(/`([^`\n]+)`/g)) candidatos.push(m[1].trim());
  for (const m of texto.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) candidatos.push(m[1].trim());
  return [...new Set(candidatos.filter(pareceFichero))];
}

describe("skills para desarrollar el kit", () => {
  for (const nombre of SKILLS) {
    test(`${nombre}: existe en Claude y Kiro, con frontmatter y pasos`, () => {
      const claude = `.claude/skills/${nombre}/SKILL.md`;
      const kiro = `.kiro/steering/${nombre}.md`;
      assert.ok(existsSync(path.join(RAIZ, claude)), `falta ${claude}`);
      assert.ok(existsSync(path.join(RAIZ, kiro)), `falta ${kiro}`);

      const metadatos = frontmatter(leer(claude));
      assert.equal(metadatos.name, nombre);
      assert.ok(metadatos.description, `${claude}: falta description`);
      assert.match(
        metadatos.description,
        /(cuando|use|usar|utiliza|al\s+(crear|revisar|añadir|modificar))/i,
        `${claude}: la description debe decir cuándo usarla`,
      );
      assert.match(leer(claude), /##\s+Pasos/i, `${claude}: falta la lista de pasos`);
      assert.match(leer(claude), /##\s+Comprobación final/i, `${claude}: falta la comprobación final`);
      assert.match(leer(kiro), new RegExp(`\\.claude/skills/${nombre}/SKILL\\.md`));
    });
  }

  test("el revisor es de sólo lectura y declara sus herramientas", () => {
    const archivo = ".claude/agents/revisor-kit.md";
    assert.ok(existsSync(path.join(RAIZ, archivo)), `falta ${archivo}`);
    const metadatos = frontmatter(leer(archivo));
    assert.equal(metadatos.name, "revisor-kit");
    assert.ok(metadatos.description);
    assert.equal(metadatos.tools, "Read, Grep, Glob, Bash");
    assert.doesNotMatch(metadatos.tools, /Edit|Write/);
  });

  test("todos los comandos npm run citados existen en package.json", () => {
    const paquete = JSON.parse(leer("package.json")) as { scripts?: Record<string, string> };
    const scripts = paquete.scripts ?? {};
    const documentos = ["AGENTS.md", ...markdownEn(".claude"), ...markdownEn(".kiro")];
    const fallos: string[] = [];

    for (const documento of documentos) {
      for (const m of leer(documento).matchAll(/\bnpm\s+run\s+([A-Za-z0-9:_-]+)/g)) {
        if (!(m[1] in scripts)) fallos.push(`${documento}: npm run ${m[1]}`);
      }
    }
    assert.deepEqual(fallos, []);
  });

  test("todos los ficheros del repo citados por las skills existen", () => {
    const documentos = [
      "AGENTS.md",
      ...markdownEn(".claude"),
      ...markdownEn(".kiro"),
    ];
    const fallos: string[] = [];

    for (const documento of documentos) {
      for (const citado of ficherosCitados(leer(documento))) {
        const limpio = citado.replace(/^#.*$/, "").replace(/:\d+$/, "");
        const existe = limpio.includes("*") || limpio.includes("?")
          ? coincideGlob(limpio)
          : existsSync(path.join(RAIZ, limpio));
        if (!existe) fallos.push(`${documento}: ${citado}`);
      }
    }
    assert.deepEqual(fallos, []);
  });
});
