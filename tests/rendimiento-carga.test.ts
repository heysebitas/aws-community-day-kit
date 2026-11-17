import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reglasEspeculativas } from "@/lib/speculation-rules";
import { conFormulario } from "@/components/effects/bfcache-reset";

const leer = (ruta: string) => readFileSync(ruta, "utf8");

test("las reglas de especulación son prefetch moderado en /* sin las rutas con datos personales", () => {
  const [regla] = reglasEspeculativas().prefetch;
  assert.equal(regla!.eagerness, "moderate");
  const [incluye, excluye] = regla!.where.and as [{ href_matches: string }, { not: { href_matches: string[] } }];
  assert.equal(incluye.href_matches, "/*");
  const fuera = excluye.not.href_matches;
  for (const r of ["admin", "api", "confirmar", "encuesta", "pasaporte"]) {
    assert.ok(fuera.includes(`/${r}/*`), `/${r}/*`);
    assert.ok(fuera.includes(`/es/${r}/*`), `/es/${r}/*`);
    assert.ok(fuera.includes(`/en/${r}/*`), `/en/${r}/*`);
  }
});

test("el layout publica las reglas como speculationrules", () => {
  const src = leer("src/app/[locale]/layout.tsx");
  assert.match(src, /type="speculationrules"/);
  assert.match(src, /reglasEspeculativas\(\)/);
});

test("BfcacheReset sólo recarga en las páginas con formulario", () => {
  for (const r of ["/registro", "/es/registro", "/en/voluntarios", "/es/speakers/postular", "/admin/login"]) {
    assert.ok(conFormulario(r), r);
  }
  for (const r of ["/", "/es", "/es/speakers", "/en/directorio", "/es/speakers/ana", "/es/privacidad"]) {
    assert.ok(!conFormulario(r), r);
  }
});

test("el encabezado del CFP no espera al scroll para mostrarse", () => {
  const src = leer("src/components/sections/call-for-speakers.tsx");
  const cuerpo = src.slice(src.indexOf("export function CallForSpeakers"));
  const primeros = [...cuerpo.matchAll(/<ScrollReveal([^>]*)>/g)].slice(0, 3);
  assert.equal(primeros.length, 3);
  for (const m of primeros) assert.match(m[1]!, /inmediato/);
});

// Contra el HTML servido: PRUEBA_URL=http://localhost:3000 npm test
// Lo que se ve al cargar es lo que hay antes del primer `opacity:0`: la portada
// trae el hero entero y /speakers el encabezado, el plazo y el botón.
const URL_BASE = process.env.PRUEBA_URL;
const VISIBLE: [string, RegExp][] = [
  ["/es", /Ser voluntario/],
  ["/es/speakers", /href="[^"]*\/speakers\/postular"/],
];
for (const [ruta, final] of VISIBLE) {
  test(`HTML servido de ${ruta}: lo visible al cargar no trae opacity:0`, { skip: !URL_BASE }, async () => {
    const html = await (await fetch(URL_BASE + ruta)).text();
    const main = html.slice(html.indexOf('id="contenido"'));
    const primero = main.search(/opacity:\s*0(?![.\d])/);
    const visible = main.search(final);
    assert.ok(visible > 0, "encuentra el final del primer viewport");
    assert.ok(primero > visible, `opacity:0 aparece en ${primero}, antes de ${visible}`);
    assert.match(html, /<script type="speculationrules">/);
  });
}
