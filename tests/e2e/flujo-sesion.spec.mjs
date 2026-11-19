// Dos dispositivos con la misma cuenta: el primero tiene que acabar en el login con el aviso.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
import { test, expect } from "@playwright/test";

async function entrar(page) {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("demo@example.com");
  await page.locator('input[type="password"]').fill("demo-demo-demo");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin(?!\/login)/);
}

test("al abrir la misma cuenta en otro dispositivo, el primero vuelve al login con el aviso", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  try {
    const primero = await a.newPage();
    await entrar(primero);

    await entrar(await b.newPage());
    // Con la pestaña oculta el panel no consulta; al volver a primer plano comprueba al momento.
    await primero.bringToFront();

    // El panel comprueba la sesión cada 10 s.
    await primero.waitForURL(/\/admin\/login\?aviso=sesion/, { timeout: 40_000 });
    await expect(primero.getByText("Tu sesión se abrió en otro dispositivo")).toBeVisible();
  } finally {
    await a.close();
    await b.close();
  }
});
