// Sin imports: así `npm run typecheck` no necesita @playwright/test, que sólo se instala en el job de e2e.
const config = {
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.PRUEBA_URL || "http://localhost:3000",
    locale: "es-CO",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
};

export default config;
