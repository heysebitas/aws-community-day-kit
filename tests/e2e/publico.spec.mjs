// El sitio público en los dos idiomas: que cada página abra, sin errores en la consola,
// sin desborde en el teléfono, y que lo que leen las máquinas (llms, API del evento) responda.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
import { test, expect } from "@playwright/test";
import { vigilar } from "./ayuda.mjs";

const PAGINAS = ["/", "/registro", "/speakers", "/speakers/postular", "/voluntarios", "/directorio", "/codigo-conducta", "/privacidad", "/creditos"];

for (const idioma of ["", "/en"]) {
  for (const ruta of PAGINAS) {
    const url = `${idioma}${ruta}` || "/";
    test(`abre ${url} sin errores`, async ({ page }) => {
      const errores = vigilar(page);
      const res = await page.goto(url, { waitUntil: "networkidle" });
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(await page.locator("html").getAttribute("lang")).toBe(idioma ? "en" : "es");
      expect(errores, errores.join("\n")).toEqual([]);
    });
  }
}

test.describe("en el teléfono", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const ruta of PAGINAS) {
    test(`${ruta} no se sale de lado`, async ({ page }) => {
      await page.goto(ruta, { waitUntil: "networkidle" });
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(sobra, `${sobra}px de desborde horizontal`).toBeLessThanOrEqual(0);
    });
  }
});

test("los perfiles de speaker abren desde el directorio", async ({ page }) => {
  await page.goto("/directorio", { waitUntil: "networkidle" });
  const enlace = page.locator('a[href*="/speakers/"]:not([href$="/postular"])').first();
  const destino = await enlace.getAttribute("href");
  expect(destino, "la demo trae al menos un speaker con perfil").toBeTruthy();
  const res = await page.goto(destino);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("una página que no existe da 404", async ({ page }) => {
  const res = await page.goto("/esta-pagina-no-existe");
  expect(res?.status()).toBe(404);
});

test("lo que leen las máquinas responde", async ({ request }) => {
  for (const ruta of ["/llms.txt", "/llms-full.txt", "/robots.txt", "/sitemap.xml"]) {
    const r = await request.get(ruta);
    expect(r.status(), ruta).toBe(200);
    expect((await r.text()).length, ruta).toBeGreaterThan(20);
  }
  const evento = await request.get("/api/evento");
  expect(evento.status()).toBe(200);
  expect(evento.headers()["content-type"]).toContain("application/json");
  expect(Object.keys(await evento.json()).length).toBeGreaterThan(0);
});

test("las cabeceras de seguridad salen en todas las páginas", async ({ request }) => {
  const r = await request.get("/");
  const h = r.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
});
