/**
 * Dice en qué estado está la instalación:  npm run doctor
 *
 * Comprueba `evento/config.ts`, las variables de entorno y los archivos que la
 * edición referencia (logos, fotos). No cambia nada ni se conecta a nada: sirve
 * para saber qué falta antes de desplegar, y es lo que un asistente de IA debe
 * correr después de cada cambio.
 */
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(__dirname, "..");
const envLocal = path.join(raiz, ".env.local");
if (fs.existsSync(envLocal)) process.loadEnvFile(envLocal);

const ok = (t: string) => console.log(`  ✓ ${t}`);
const aviso = (t: string) => console.log(`  ! ${t}`);
const error = (t: string) => console.log(`  ✗ ${t}`);

async function main() {
  let fallos = 0;

  console.log("\nConfiguración (evento/config.ts)");
  let config: typeof import("../src/config");
  try {
    config = await import("../src/config");
  } catch (e) {
    error((e as Error).message);
    console.log("\nCorrige la configuración y vuelve a correr `npm run doctor`.\n");
    process.exit(1);
  }
  const { EVENTO, PAIS, TEMA, SITIO, IDIOMAS } = config;
  const { fechaConDia, hora, zonaDe } = await import("../src/config/fechas");
  ok(`${EVENTO.nombreCompleto} — ${EVENTO.ciudad}, ${PAIS.nombre}`);
  ok(`${fechaConDia(EVENTO.inicio, "es")} ${EVENTO.anio}, ${hora(EVENTO.inicio)} (${zonaDe(EVENTO.inicio)}), zona ${EVENTO.zona}`);
  ok(`Sitio: ${SITIO} · idiomas: ${IDIOMAS.join(", ")} · acento ${TEMA.acento}`);

  if (EVENTO.ciudad === "Tu Ciudad" || EVENTO.edicion === "Demo") aviso("Sigue la edición de demostración: corre `npm run setup`.");
  if (SITIO.includes("localhost")) aviso("`sitio` apunta a localhost: los enlaces de los correos y los QR saldrán así.");
  if (new Date(EVENTO.inicio).getTime() < Date.now()) aviso("La fecha del evento ya pasó.");
  if (!EVENTO.sede.coordenadas) aviso(`Sin coordenadas de la sede: el globo señala ${PAIS.capital.nombre}.`);

  console.log("\nContenido (evento/)");
  const { equipo } = await import("../evento/equipo");
  const { keynotes } = await import("../evento/keynotes");
  const { patrocinadores } = await import("../evento/patrocinadores");
  const { comunidades } = await import("../evento/comunidades");
  const { tracks } = await import("../evento/tracks");
  const { contacto } = await import("../evento/contacto");
  ok(`${equipo.length} en el equipo · ${keynotes.length} keynotes · ${patrocinadores.length} patrocinadores · ${comunidades.length} comunidades · ${tracks.length} tracks`);

  const archivos = [
    EVENTO.marca.logo, EVENTO.marca.logoPng, EVENTO.marca.mascota,
    ...equipo.map((o) => o.foto), ...keynotes.map((k) => k.foto),
    ...patrocinadores.map((p) => p.logo), ...comunidades.map((c) => c.logo),
  ].filter((a): a is string => !!a && a.startsWith("/"));
  const faltan = archivos.filter((a) => !fs.existsSync(path.join(raiz, "public", a)));
  if (faltan.length) {
    fallos += faltan.length;
    for (const f of faltan) error(`No existe public${f}`);
  } else ok(`Los ${archivos.length} archivos referenciados existen`);

  if (Object.values(contacto).some((c) => c.endsWith("@example.com") || c.includes("tu-dominio"))) {
    aviso("evento/contacto.ts todavía tiene correos de ejemplo.");
  }

  console.log("\nEntorno (.env.local)");
  if (!fs.existsSync(envLocal)) aviso("No hay .env.local: copia .env.example o corre `npm run setup`.");
  const { revisarEntorno } = await import("../src/lib/env");
  const hallazgos = revisarEntorno();
  if (!hallazgos.length) ok("Todas las variables necesarias están definidas");
  for (const h of hallazgos) {
    if (h.nivel === "error") {
      fallos++;
      error(h.texto);
    } else aviso(h.texto);
  }

  console.log(
    fallos
      ? `\n${fallos} cosa(s) por corregir antes de desplegar. Para probar sin nada de esto: npm run demo\n`
      : "\nTodo en orden. `npm run demo` para verlo, docs/despliegue.md para publicarlo.\n",
  );
  process.exit(fallos ? 1 : 0);
}

void main();
