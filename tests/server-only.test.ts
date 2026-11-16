import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const RAIZ = path.resolve(__dirname, "..");

const MODULOS = [
  "db", "auth", "s3", "correo", "env", "captcha", "log", "sesion", "rate-limit",
].map((nombre) => path.join(RAIZ, "src/lib", `${nombre}.ts`));

for (const nombre of readdirSync(path.join(RAIZ, "src/lib/pdf"))) {
  if (nombre.endsWith(".ts")) MODULOS.push(path.join(RAIZ, "src/lib/pdf", nombre));
}

// El runner sustituye server-only; react-server cambiaría React y rompería su render.
describe("los módulos de servidor", () => {
  test("están marcados con server-only", () => {
    for (const archivo of MODULOS) {
      const primera = readFileSync(archivo, "utf8").split("\n", 1)[0];
      assert.equal(primera, 'import "server-only";', `${archivo} no está marcado como servidor`);
    }
  });

  test("un componente cliente no puede importarlos", async () => {
    const eslint = new ESLint({ cwd: RAIZ });
    const [resultado] = await eslint.lintText(
      '"use client";\nimport { connectDB } from "@/lib/db";\n',
      { filePath: path.join(RAIZ, "src/contexts/auth-context.tsx") },
    );
    const error = resultado.messages.find((mensaje) => mensaje.ruleId === "no-restricted-imports");
    assert.ok(error, "ESLint no bloqueó la importación de un módulo de servidor");
  });
});
