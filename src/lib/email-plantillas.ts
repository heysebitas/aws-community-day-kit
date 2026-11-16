import type { ReactNode } from "react";
import { render } from "@react-email/components";
import { EmailTemplate, SISTEMA, type SlugSistema } from "@/models/email-template";
import { PlantillaBloques } from "@/emails/plantilla-bloques";
import { SEMILLAS } from "@/emails/semilla";
import { aplicarVariables, sanearBloques, type Bloque } from "@/emails/bloques";
import { valoresDelEvento } from "@/emails/valores-evento";
import { enlacesActuales } from "@/lib/enlaces";

/**
 * El puente entre las plantillas guardadas y el envío: se pide una plantilla
 * por su clave y se recibe asunto y HTML listos. Si todavía no está en la base
 * se siembra en ese momento, así que una instalación nueva no necesita pasos
 * previos.
 */

/** Se reexporta para no cambiar de dónde lo piden los envíos. */
export { valoresDelEvento } from "@/emails/valores-evento";

/**
 * Siembra las plantillas que falten. Es idempotente: se llama al listar en el
 * panel y antes de cada envío de sistema.
 */
export async function sembrarPlantillas(): Promise<void> {
  // Se compara por slug entre todas, no sólo entre las de sistema.
  const existentes = new Set(
    (await EmailTemplate.find({}).select("slug").lean()).map((p) => p.slug),
  );
  const faltan = SEMILLAS.filter((s) => !existentes.has(s.slug));
  if (!faltan.length) {
    await resincronizarBloqueadas();
    return;
  }

  await EmailTemplate.insertMany(
    faltan.map((s) => {
      const deSistema = s.deSistema !== false;
      return {
        slug: s.slug,
        nombre: s.nombre,
        descripcion: s.descripcion,
        asunto: s.asunto,
        preview: s.preview,
        strip: s.strip ?? "",
        bloqueada: s.bloqueada === true,
        bloques: s.bloques,
        deSistema,
        disparador: deSistema
          ? SISTEMA[s.slug as SlugSistema]
          : (s.disparador ?? "Se manda a mano desde Campañas"),
        // Sólo las de campaña llevan audiencia: una de sistema la manda el código, a una persona.
        audiencia: deSistema ? null : (s.audiencia ?? null),
        activa: true,
      };
    }),
    { ordered: false },
  );

  await resincronizarBloqueadas();
}

/**
 * Devuelve las plantillas bloqueadas a lo que dice el código. Sembrar sólo
 * inserta las que faltan, así que sin esto un cambio en el repo no llegaría
 * nunca a la copia guardada. Escribe sólo si algo cambió.
 */
async function resincronizarBloqueadas(): Promise<void> {
  const bloqueadas = SEMILLAS.filter((s) => s.bloqueada);
  if (!bloqueadas.length) return;

  const guardadas = await EmailTemplate.find({ slug: { $in: bloqueadas.map((s) => s.slug) } }).lean();
  const porSlug = new Map(guardadas.map((p) => [p.slug, p]));

  for (const s of bloqueadas) {
    const actual = porSlug.get(s.slug);
    if (!actual) continue;

    // La audiencia también: la de una bloqueada tampoco se edita desde el panel.
    const igual =
      actual.asunto === s.asunto &&
      actual.preview === s.preview &&
      (actual.strip ?? "") === (s.strip ?? "") &&
      actual.bloqueada === true &&
      JSON.stringify(actual.audiencia ?? null) === JSON.stringify(s.audiencia ?? null) &&
      JSON.stringify(actual.bloques) === JSON.stringify(s.bloques);
    if (igual) continue;

    await EmailTemplate.updateOne(
      { slug: s.slug },
      {
        $set: {
          nombre: s.nombre,
          descripcion: s.descripcion,
          asunto: s.asunto,
          preview: s.preview,
          strip: s.strip ?? "",
          bloques: s.bloques,
          audiencia: s.audiencia ?? null,
          bloqueada: true,
        },
      },
    );
  }
}

export interface CorreoListo {
  asunto: string;
  html: string;
}

/**
 * Arma un correo a partir de una plantilla guardada. `valores` son los datos
 * de quien lo recibe; los del evento se añaden solos. Devuelve `null` si la
 * plantilla no existe o está desactivada.
 */
export async function armarCorreo(
  slug: SlugSistema | string,
  valores: Record<string, string> = {},
  banderas: string[] = [],
  extra?: ReactNode,
): Promise<CorreoListo | null> {
  if (slug in SISTEMA) await sembrarPlantillas();

  const plantilla = await EmailTemplate.findOne({ slug }).lean();
  if (!plantilla || !plantilla.activa) return null;

  /** Los enlaces del panel entran solos; los valores de la persona mandan sobre ellos. */
  const { variables } = await enlacesActuales();

  return armarDesdePlantilla(plantilla, { ...variables, ...valores }, banderas, extra);
}

/** Lo que hace falta de una plantilla para dibujarla. */
export interface PlantillaParaArmar {
  asunto: string;
  preview?: string;
  strip?: string;
  bloques: unknown[];
}

/**
 * Lo mismo con la plantilla ya leída. Una campaña arma el mismo correo cientos
 * de veces: la lee una vez y llama acá.
 */
export async function armarDesdePlantilla(
  plantilla: PlantillaParaArmar,
  valores: Record<string, string> = {},
  banderas: string[] = [],
  extra?: ReactNode,
): Promise<CorreoListo> {
  const todos = { ...valoresDelEvento(), ...valores };
  const bloques = sanearBloques(plantilla.bloques) as Bloque[];

  const html = await render(
    PlantillaBloques({
      bloques,
      preview: plantilla.preview,
      strip: plantilla.strip || undefined,
      valores: todos,
      banderas,
      extra,
    }),
  );

  return { asunto: aplicarVariables(plantilla.asunto, todos), html };
}

/** El texto de fábrica de una plantilla de sistema, para el botón de restaurar. */
export function semillaDe(slug: string) {
  return SEMILLAS.find((s) => s.slug === slug) ?? null;
}
