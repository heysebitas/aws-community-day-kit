// Impresión de escarapelas: la vista previa del preset y que la CSP deje enmarcar el PDF.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
import { test, expect } from "@playwright/test";

async function entrar(page) {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("demo@example.com");
  await page.locator('input[type="password"]').fill("demo-demo-demo");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin(?!\/login)/);
}

test("el preset de impresión enseña una muestra en PDF y la CSP deja enmarcarla", async ({ page }) => {
  await entrar(page);
  const res = await page.goto("/admin/print");
  // Imprimir y previsualizar cargan el PDF en un iframe blob:.
  expect(res?.headers()["content-security-policy"]).toMatch(/frame-src[^;]*\bblob:/);

  await page.getByRole("button", { name: "Cargar lista completa" }).first().click();
  const pdf = page.waitForResponse((r) => r.url().includes("/api/print/badges-pdf") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Configurar" }).click();
  const r = await pdf;
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toBe("application/pdf");
  await expect(page.getByRole("link", { name: "Abrir la muestra en PDF" })).toBeVisible();

  // En hoja dice cuántas caben antes de imprimir, y la prueba gasta una sola.
  await page.getByRole("button", { name: "Hoja A4" }).click();
  await expect(page.getByText(/Caben 2 por hoja/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimir una de prueba" })).toBeVisible();
});
