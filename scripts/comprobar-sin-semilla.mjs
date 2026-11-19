// Comprueba que el build no lleva datos de ejemplo en el HTML prerenderizado.
// Uso: BUILD_SIN_SEMILLA=1 MODO_DEMO=1 JWT_SECRET=x npm run build && node scripts/comprobar-sin-semilla.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const RAIZ = path.join(import.meta.dirname, "..", ".next", "server", "app");
const PROHIBIDOS = ["Sofía Navarro"];

function ficheros(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? ficheros(p) : /\.(html|rsc|json)$/.test(n) ? [p] : [];
  });
}

let hallazgos = 0;
for (const f of ficheros(RAIZ)) {
  const t = readFileSync(f, "utf8");
  for (const x of PROHIBIDOS) if (t.includes(x)) { console.error(`${path.relative(RAIZ, f)}: contiene «${x}»`); hallazgos++; }
}
if (hallazgos) process.exit(1);
console.log(`Sin datos de ejemplo en ${RAIZ}`);
