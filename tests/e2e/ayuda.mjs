// Lo que comparten las pruebas e2e. No es una prueba: Playwright sólo corre `*.spec.mjs`.
import { expect } from "@playwright/test";

/** Las cuentas de la demo (src/lib/demo.ts). Todas con la misma contraseña. */
export const CLAVE_DEMO = "demo-demo-demo";

export async function entrar(page, correo = "demo@example.com") {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(correo);
  await page.locator('input[type="password"]').fill(CLAVE_DEMO);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin(?!\/login)/);
  await expect(page).not.toHaveURL(/\/admin\/login/);
}

/** Junta los errores de la consola y de la página, sin el ruido que no depende del kit. */
export function vigilar(page) {
  const errores = [];
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // Trusted Types va en modo informe: avisa en la consola sin bloquear (docs/csp.md).
    if (/trusted ?types|require-trusted-types-for/i.test(t)) return;
    errores.push(`${t} (${page.url()})`);
  });
  return errores;
}

/** Un sufijo distinto en cada corrida, para no chocar con datos de corridas anteriores. */
export const marca = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
