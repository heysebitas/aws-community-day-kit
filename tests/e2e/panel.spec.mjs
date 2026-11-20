// Cada pantalla del panel abre con cada rol, sin errores, y quien no tiene permiso no entra.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
import { test, expect } from "@playwright/test";
import { entrar, vigilar } from "./ayuda.mjs";

const PANEL = [
  "/admin", "/admin/registrations", "/admin/registrations/recepcion", "/admin/volunteers", "/admin/volunteers/convocatoria",
  "/admin/speakers", "/admin/speakers/ajustes", "/admin/speakers/canvas", "/admin/programa", "/admin/check-in",
  "/admin/escaner/check-in", "/admin/escaner/salas", "/admin/escaner/almuerzos", "/admin/escaner/badges",
  "/admin/print", "/admin/pasaportes", "/admin/certificados", "/admin/correos", "/admin/correos/campanas",
  "/admin/correos/plantillas", "/admin/encuesta", "/admin/faq", "/admin/evento", "/admin/config", "/admin/users",
  "/admin/reportes", "/admin/logs", "/admin/consola",
];

test("sin sesión, el panel manda al login", async ({ page }) => {
  for (const ruta of ["/admin", "/admin/users", "/admin/registrations"]) {
    await page.goto(ruta);
    await expect(page, ruta).toHaveURL(/\/admin\/login/);
  }
});

test("una contraseña equivocada no entra y lo dice", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("demo@example.com");
  await page.locator('input[type="password"]').fill("no-es-la-clave");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("alert").or(page.getByRole("status")).first()).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("admin: todas las pantallas del panel abren sin errores", async ({ page }) => {
  test.setTimeout(240_000);
  await entrar(page, "demo@example.com");
  const errores = vigilar(page);
  for (const ruta of PANEL) {
    const res = await page.goto(ruta, { waitUntil: "networkidle" });
    expect(res?.status(), ruta).toBeLessThan(400);
    await expect(page, ruta).not.toHaveURL(/\/admin\/login/);
    await expect(page.locator("main").first(), ruta).toBeVisible();
    // Una pantalla rota de Next sale con este texto.
    await expect(page.getByText(/Application error|Something went wrong|Algo salió mal/i), ruta).toHaveCount(0);
  }
  expect(errores, errores.join("\n")).toEqual([]);
});

test("cerrar sesión deja el panel cerrado", async ({ page }) => {
  await entrar(page, "demo@example.com");
  const salir = await page.request.post("/api/auth/logout");
  expect(salir.status()).toBeLessThan(400);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

// Lo que cada rol de la demo ve, y lo que no aunque escriba la URL a mano.
const ROLES = [
  {
    correo: "organiza@example.com",
    entra: ["/admin", "/admin/registrations", "/admin/speakers", "/admin/programa", "/admin/correos", "/admin/faq", "/admin/evento"],
    noEntra: ["/admin/users", "/admin/logs", "/admin/reportes", "/admin/consola", "/admin/certificados", "/admin/pasaportes", "/admin/config"],
  },
  {
    correo: "puerta@example.com",
    entra: ["/admin/registrations", "/admin/check-in", "/admin/print", "/admin/escaner/check-in", "/admin/escaner/salas"],
    noEntra: ["/admin/speakers", "/admin/speakers/ajustes", "/admin/correos", "/admin/faq", "/admin/logs", "/admin/evento", "/admin/volunteers", "/admin/programa", "/admin/users"],
  },
];

for (const { correo, entra, noEntra } of ROLES) {
  test(`${correo}: entra a lo suyo y no a lo demás`, async ({ page }) => {
    test.setTimeout(180_000);
    await entrar(page, correo);
    for (const ruta of entra) {
      await page.goto(ruta, { waitUntil: "networkidle" });
      await expect(page, ruta).toHaveURL(new RegExp(`${ruta}$`));
      await expect(page.getByText("No tienes acceso a esta sección"), ruta).toHaveCount(0);
    }
    for (const ruta of noEntra) {
      await page.goto(ruta, { waitUntil: "networkidle" });
      // O vuelve al inicio del panel, o la página dice que no es para esa cuenta.
      const fuera = !page.url().endsWith(ruta) || (await page.getByText("No tienes acceso a esta sección").count()) > 0;
      expect(fuera, `${correo} no debería ver ${ruta}`).toBe(true);
    }
  });
}

test("la API responde 401 sin sesión y 403 al rol que no le toca", async ({ page, request }) => {
  for (const ruta of ["/api/registrations", "/api/users", "/api/logs", "/api/speakers", "/api/volunteers", "/api/stats"]) {
    expect((await request.get(ruta)).status(), ruta).toBe(401);
  }
  await entrar(page, "puerta@example.com");
  for (const ruta of ["/api/users", "/api/logs", "/api/speakers", "/api/volunteers", "/api/settings"]) {
    expect((await page.request.get(ruta)).status(), ruta).toBe(403);
  }
  expect((await page.request.get("/api/registrations?limit=1")).status()).toBe(200);
});
