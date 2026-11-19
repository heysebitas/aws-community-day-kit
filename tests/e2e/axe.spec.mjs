// Se corre con `npx playwright test` contra la demo ya levantada (ver docs/pruebas.md).
// Es .mjs para que ni `tsc` ni el runner de `npm test` necesiten Playwright.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGINAS = [
  ["portada", "/"],
  ["registro", "/registro"],
  ["login del panel", "/admin/login"],
  // Sin sesión el panel redirige al login: se mira lo que ve un asistente en la puerta.
  ["check-in", "/admin/check-in"],
  // Un pasaporte que no existe: la pantalla pública de error también tiene que ser accesible.
  ["pasaporte", "/pasaporte/ejemplo-inexistente"],
  // Y uno de verdad: la tarjeta tiene sus propios colores en línea.
  ["pasaporte de la demo", "/pasaporte/demo00000001"],
];

for (const [nombre, ruta] of PAGINAS) {
  test(`axe: ${nombre} sin violaciones serious/critical`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: "networkidle" });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const graves = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const resumen = graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
    expect(resumen, resumen.join("\n")).toEqual([]);
  });
}

test("check-in tras iniciar sesión en el panel", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("demo@example.com");
  await page.locator('input[type="password"]').fill("demo-demo-demo");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin(?!\/login)/);
  await page.goto("/admin/check-in", { waitUntil: "networkidle" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves.map((v) => v.id)).toEqual([]);
});
