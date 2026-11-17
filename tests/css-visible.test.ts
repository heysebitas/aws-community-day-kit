import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** CSS visible: foco, svh, tipografía fluida en rem, color-scheme, scrollbar y hex fuera de tokens. */

const RAIZ = join(process.cwd(), "src");
const CSS = readFileSync(join(RAIZ, "app/globals.css"), "utf8");

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "api" ? [] : archivos(p);
    return /\.tsx?$/.test(n) ? [p] : [];
  });
}
const FUENTES = archivos(RAIZ).map((p) => ({ p, c: readFileSync(p, "utf8") }));

function contar(re: RegExp, donde = FUENTES): string[] {
  return donde.flatMap(({ p, c }) => (c.match(re) ?? []).map((m) => `${p}: ${m}`));
}

describe("CSS visible", () => {
  test("ningún outline-none: se usa outline-hidden y el foco global", () => {
    assert.deepEqual(contar(/outline-none/g), []);
    assert.match(CSS, /:focus-visible\s*\{[^}]*outline:\s*2px solid currentColor/);
  });

  test("las casillas sr-only muestran el foco con peer-focus-visible", () => {
    for (const { p, c } of FUENTES) {
      const n = (c.match(/type="(checkbox|radio)"[^>]*className="[^"]*sr-only/g) ?? []).length;
      if (n) assert.ok(c.includes("peer-focus-visible"), p);
    }
  });

  test("sin min-h-screen ni 100vh", () => {
    assert.deepEqual(contar(/min-h-screen|100vh/g), []);
  });

  test("sin clamp con px", () => {
    assert.deepEqual(contar(/clamp\([^)]*\d\s*px/g), []);
  });

  test("sin los hex citados en las páginas", () => {
    const citadas = FUENTES.filter(({ p }) =>
      /pasaporte\/\[shortId\]\/page|confirmar\/\[token\]\/page|confirmar-cambios\/\[token\]\/page/.test(p.replace(/\\/g, "/")),
    );
    assert.equal(citadas.length, 3);
    assert.deepEqual(contar(/#080a0f|#f9fafb/gi, citadas), []);
  });

  test("globals.css declara color-scheme y scrollbar-color", () => {
    assert.match(CSS, /color-scheme:\s*dark/);
    assert.match(CSS, /\.form-block\s*\{[^}]*color-scheme:\s*light/);
    assert.match(CSS, /scrollbar-color:/);
    assert.match(CSS, /@supports not \(scrollbar-color/);
    assert.match(CSS, /text-wrap:\s*balance/);
  });
});

describe("tipografía en rem sin cambiar tamaños", () => {
  const ANCHOS = [375, 640, 768, 1024, 1280, 1440];
  const BP: Record<string, number> = { "": 0, sm: 640, lg: 1024, xl: 1280 };

  /** Longitud CSS (px, rem, vw) a px con 16 px por rem. */
  function px(v: string, w: number): number {
    const m = /^(-?[\d.]+)(px|rem|vw)$/.exec(v.trim());
    assert.ok(m, v);
    const n = Number(m[1]);
    return m[2] === "px" ? n : m[2] === "rem" ? n * 16 : (n * w) / 100;
  }
  function clamp(expr: string, w: number): number {
    const [a, b, c] = expr.replace(/^clamp\(|\)$/g, "").split(",");
    return Math.min(Math.max(px(a!, w), px(b!, w)), px(c!, w));
  }
  /** Tamaño a un ancho, desde un `clamp(...)` o desde clases `[sm:|lg:|xl:]text-[valor]`. */
  function tam(expr: string, w: number): number {
    if (expr.startsWith("clamp(")) return clamp(expr, w);
    let sel = 0, out = NaN;
    for (const m of expr.matchAll(/(?:(sm|lg|xl):)?text-\[([\d.]+(?:vw|rem|px))\]/g)) {
      const bp = BP[m[1] ?? ""];
      if (bp !== undefined && w >= bp && bp >= sel) { sel = bp; out = px(m[2]!, w); }
    }
    return out;
  }
  // Expresiones de fde4832 (antes) y su fichero.
  const CASOS: { f: string; antes: string[] }[] = [
    { f: "components/sections/hero.tsx", antes: ["text-[13vw] sm:text-[10vw] lg:text-[6.4vw] xl:text-[86px]"] },
    { f: "app/[locale]/directorio/_screen.tsx", antes: ["text-[13vw] sm:text-[10vw] lg:text-[6.4vw] xl:text-[86px]"] },
    { f: "app/[locale]/speakers/[slug]/_perfil.tsx", antes: ["text-[11vw] sm:text-[7vw] lg:text-[4.6vw] xl:text-[64px]"] },
    { f: "components/not-found-screen.tsx", antes: ["text-[22vw] sm:text-[18vw] lg:text-[13vw]"] },
    { f: "app/[locale]/directorio/_components.tsx", antes: ["clamp(18px,2.2vw,26px)"] },
    { f: "app/[locale]/pasaporte/[shortId]/_tarjeta.tsx", antes: ["clamp(30px,8.5vw,44px)", "clamp(30px,8.5vw,44px)"] },
    { f: "app/[locale]/confirmar/[token]/page.tsx", antes: ["clamp(28px,8vw,40px)", "clamp(28px,8vw,40px)"] },
    { f: "components/sections/call-for-speakers.tsx", antes: ["clamp(28px,4vw,48px)"] },
    { f: "components/sections/tracks.tsx", antes: ["clamp(28px,4vw,48px)"] },
    { f: "components/sections/why-attend.tsx", antes: ["clamp(32px,4.5vw,58px)", "clamp(28px,4vw,48px)"] },
    { f: "components/sections/keynotes.tsx", antes: ["clamp(28px,3.8vw,46px)", "clamp(22px,3.2vw,38px)", "clamp(64px,10vw,120px)", "clamp(48px,7vw,88px)", "clamp(28px,4vw,48px)"] },
  ];

  for (const { f, antes } of CASOS) {
    test(`${f}: mismo tamaño ±1 px a ${ANCHOS.join(", ")} y todo en rem`, () => {
      const c = readFileSync(join(RAIZ, f), "utf8");
      const ahoraExpr = antes[0]!.startsWith("clamp(")
        ? [...c.matchAll(/clamp\([^)]*\)/g)].map((m) => m[0])
        : [c.match(/font-display[^"`]*/)?.[0] ?? ""];
      assert.equal(ahoraExpr.length, antes.length, f);
      antes.forEach((a, i) => {
        assert.ok(!/\dpx/.test(ahoraExpr[i]!), `sin px: ${ahoraExpr[i]}`);
        for (const w of ANCHOS) {
          const x = tam(a, w), y = tam(ahoraExpr[i]!, w);
          assert.ok(Math.abs(x - y) <= 1, `${f} a ${w}px: antes ${x}, ahora ${y}`);
        }
      });
    });
  }
});
