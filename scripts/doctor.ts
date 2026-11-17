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

const COLECCIONES_UNICAS = ["registrations", "volunteersubmissions"];

/** Correos repetidos que impedirían crear el índice único; sólo lee. */
export async function buscarDuplicados(uri: string) {
  const mongoose = (await import("mongoose")).default;
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const salida: { coleccion: string; email: string; veces: number }[] = [];
    for (const coleccion of COLECCIONES_UNICAS) {
      const grupos = await conn.collection(coleccion).aggregate<{ _id: string; n: number }>([
        { $group: { _id: "$email", n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
      ]).toArray();
      for (const g of grupos) salida.push({ coleccion, email: g._id, veces: g.n });
    }
    return salida;
  } finally {
    await conn.close();
  }
}

/** Cuántos registros y pasaportes no tienen el campo `busqueda`; sólo lee. */
export async function contarSinBusqueda(uri: string) {
  const mongoose = (await import("mongoose")).default;
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const falta = { busqueda: { $exists: false } };
    return {
      registrations: await conn.collection("registrations").countDocuments(falta),
      passports: await conn.collection("passports").countDocuments(falta),
    };
  } finally {
    await conn.close();
  }
}

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
  const plantilla = fs.existsSync(path.join(raiz, "recursos/certificado-sbg.pdf"));
  if (EVENTO.tipo === "cd") ok("Community Day: certificado genérico con el tema");
  else if (plantilla) ok("AWS Student Community Day: certificado oficial del programa");
  else aviso("AWS Student Community Day sin recursos/certificado-sbg.pdf: saldrá el certificado genérico. Ver recursos/README.md.");
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

  console.log("\nBucket (caché de las fotos)");
  const { configBucket, crearCliente, hayCredenciales, revisar } = await import("./cache-control-bucket.mjs");
  const bucket = configBucket(process.env);
  if (!bucket.bucket) aviso("Falta AWS_S3_BUCKET: el script de la cabecera no sabe a qué bucket aplicársela.");
  if (!bucket.publicUrl) aviso("Falta AWS_S3_PUBLIC_URL: sin ella las fotos no pasan por el optimizador de imágenes (next.config.ts la lee en el build) y no se conoce la URL pública del bucket.");
  if (bucket.bucket && bucket.publicUrl && hayCredenciales(process.env)) {
    try {
      // El bucket puede estar en otra red: no se queda esperando forever.
      const { total, cambios } = await Promise.race([
        revisar(crearCliente(bucket), bucket),
        new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error("el bucket no respondió a tiempo")), 15000)),
      ]);
      if (cambios.length) aviso(`${cambios.length} de ${total} objeto(s) sin la cabecera de caché: node scripts/cache-control-bucket.mjs --aplicar`);
      else ok(`Los ${total} objeto(s) del bucket llevan la cabecera de caché`);
    } catch (e) {
      aviso(`No se pudo revisar el bucket: ${(e as Error).message}`);
    }
  } else if (bucket.bucket) {
    aviso("Sin credenciales de AWS: no se comprueba el bucket ni se puede aplicar la cabecera. Ver docs/bucket.md.");
  }

  console.log("\nBase de datos");
  if (!process.env.MONGODB_URI) aviso("Sin MONGODB_URI: no se buscan correos duplicados.");
  else {
    try {
      const dups = await buscarDuplicados(process.env.MONGODB_URI);
      if (!dups.length) ok("Sin correos duplicados: el índice único de email se puede crear");
      for (const d of dups) {
        fallos++;
        error(`${d.coleccion}: ${d.email} está ${d.veces} veces; sin quitar los repetidos no se crea el índice único`);
      }
      const sin = await contarSinBusqueda(process.env.MONGODB_URI);
      if (!sin.registrations && !sin.passports) ok("Todos los registros y pasaportes tienen el campo de búsqueda");
      else aviso(`Sin campo de búsqueda: ${sin.registrations} registros y ${sin.passports} pasaportes; no salen en el check-in. Corre \`node scripts/rellenar-busqueda.mjs --aplicar\` (sin --aplicar sólo cuenta).`);
    } catch (e) {
      aviso(`No se pudo revisar la base: ${(e as Error).message}`);
    }
  }

  console.log(
    fallos
      ? `\n${fallos} cosa(s) por corregir antes de desplegar. Para probar sin nada de esto: npm run demo\n`
      : "\nTodo en orden. `npm run demo` para verlo, docs/despliegue.md para publicarlo.\n",
  );
  process.exit(fallos ? 1 : 0);
}

if (require.main === module) void main();
