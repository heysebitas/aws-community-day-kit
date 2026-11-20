import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { PrintConfig } from "@/models/print-config";
import { generarEscarapelas, MUESTRA, presetDesde, type PersonaEscarapela, type PresetEscarapela } from "@/lib/pdf/escarapela";
import { resolver, tokensDe } from "@/i18n/tokens";
import { EVENTO, IDIOMA_BASE, SITIO } from "@/config";
import { ruta } from "@/lib/api";
import { leerCuerpo, listaDeTextos } from "@/lib/cuerpo";

/** Título y roles en el idioma del panel. */
async function textos() {
  const crudos = (await import(`../../../../messages/${IDIOMA_BASE}.json`)).default;
  const m = resolver(crudos, tokensDe(IDIOMA_BASE)) as Record<string, Record<string, string>>;
  const roles = Object.fromEntries(
    ["attendee", "speaker", "volunteer", "organizer"].map((r) => [r, (m.Passport![`role_${r}`] ?? r).toUpperCase()]),
  );
  return { titulo: `${m.Panel!.escarapelas} ${EVENTO.nombreCompleto}`, roles };
}

/** Tope por petición: el PDF se arma entero en memoria. */
const MAX_SHORT_IDS = 200;

// Genera un PDF con las escarapelas al tamaño EXACTO de la etiqueta (sin encabezados del navegador).
export const POST = ruta(async (req: NextRequest) => {
  await requireAccess("print", "editar", ["admin", "organizer", "volunteer"]);
  const cuerpo = await leerCuerpo(req);
  const { shortIds: crudo, configId: idCrudo } = cuerpo;

  // Vista previa del preset que se está editando: personas de muestra, sin tocar la base.
  if (cuerpo.muestra === true && cuerpo.preset && typeof cuerpo.preset === "object") {
    const buffer = await generarEscarapelas(MUESTRA, presetDesde(cuerpo.preset as Record<string, unknown>), { sitio: SITIO, ...(await textos()) });
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
  }
  const shortIds = listaDeTextos(crudo);
  const configId = typeof idCrudo === "string" ? idCrudo : undefined;
  if (!shortIds || shortIds.length === 0) {
    return Response.json({ error: "shortIds requerido" }, { status: 400 });
  }

  if (shortIds.length > MAX_SHORT_IDS) {
    return Response.json({ error: `Máximo ${MAX_SHORT_IDS} escarapelas por petición; envíalas por tandas.` }, { status: 400 });
  }

  await connectDB();

  const cfg = (configId ? await PrintConfig.findById(configId).lean<PresetEscarapela>() : null)
    ?? await PrintConfig.findOne({ isDefault: true }).lean<PresetEscarapela>();

  const docs = await Passport.find({ shortId: { $in: shortIds } })
    .select("shortId role firstName lastName company jobTitle badgeFirstName badgeLastName")
    .lean<PersonaEscarapela[]>();
  const byId = new Map(docs.map((d) => [d.shortId, d]));
  const people = shortIds.map((id) => byId.get(id)).filter(Boolean) as PersonaEscarapela[];

  const buffer = await generarEscarapelas(people, cfg, { sitio: SITIO, ...(await textos()) });
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=escarapelas.pdf" },
  });
});
