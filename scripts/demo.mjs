/**
 * Arranca el kit en modo demo:  npm run demo
 *
 * Con `npm run demo -- --produccion` compila primero y sirve la versión de
 * producción: tarda más en arrancar, pero las páginas responden al instante.
 * Es la que usan las capturas (`npm run galeria`) y las pruebas e2e.
 *
 * Sin cuentas ni variables de entorno: la base vive en memoria, los correos se
 * escriben en la consola y el captcha está apagado. Los datos se pierden al
 * cerrar. Para un evento real, sigue `docs/despliegue.md`.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puerto = process.env.PORT || "3000";

const env = {
  ...process.env,
  MODO_DEMO: "1",
  // Una clave distinta en cada arranque: las sesiones de la demo no sobreviven al reinicio.
  JWT_SECRET: process.env.JWT_SECRET || randomBytes(48).toString("base64"),
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${puerto}`,
};

console.log(`\n  Modo demo → http://localhost:${puerto}\n  Panel     → http://localhost:${puerto}/admin/login  (demo@example.com / demo-demo-demo)\n`);

const next = path.join(raiz, "node_modules", "next", "dist", "bin", "next");
const correr = (args) => spawn(process.execPath, [next, ...args], { cwd: raiz, env, stdio: "inherit" });

if (process.argv.includes("--produccion")) {
  const build = correr(["build"]);
  build.on("exit", (codigo) => {
    if (codigo) process.exit(codigo);
    correr(["start", "-p", puerto]).on("exit", (c) => process.exit(c ?? 0));
  });
} else {
  correr(["dev", "-p", puerto]).on("exit", (codigo) => process.exit(codigo ?? 0));
}
