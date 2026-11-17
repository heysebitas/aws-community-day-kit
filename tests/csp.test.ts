import { test } from "node:test";
import assert from "node:assert/strict";

type Regla = { source: string; headers: { key: string; value: string }[] };

async function cabeceras() {
  const mod = await import("../next.config");
  const reglas = await (mod.default as { headers: () => Promise<Regla[]> }).headers();
  const todo = reglas.find((r) => r.source === "/:ruta*");
  assert.ok(todo, "regla global de cabeceras");
  const valor = (k: string) => todo.headers.find((h) => h.key === k)?.value;
  return { csp: valor("Content-Security-Policy") ?? "", informe: valor("Content-Security-Policy-Report-Only") };
}

test("la CSP aplicada conserva las directivas que cierran frames, objetos y formularios", async () => {
  const { csp } = await cabeceras();
  for (const d of ["object-src 'none'", "frame-ancestors 'none'", "form-action 'self'", "base-uri 'self'"]) {
    assert.ok(csp.split("; ").includes(d), d);
  }
  assert.match(csp, /script-src 'self' 'unsafe-inline' https:\/\/challenges\.cloudflare\.com/);
});

test("Trusted Types va sólo en Report-Only y no en la CSP que bloquea", async () => {
  const { csp, informe } = await cabeceras();
  assert.equal(informe, "require-trusted-types-for 'script'");
  assert.doesNotMatch(csp, /trusted-types/);
});

test("sin endpoint de reportes no se declara report-uri ni report-to", async () => {
  const { csp, informe } = await cabeceras();
  assert.doesNotMatch(csp + (informe ?? ""), /report-(uri|to)/);
});
