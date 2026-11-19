import { nanoid } from "nanoid";
import { Passport } from "@/models/passport";
import { SurveyRecipient } from "@/models/survey-recipient";
import type { Destinatario } from "@/lib/audiencias-servidor";
import type { Publico } from "@/lib/audiencias";
import { SITIO } from "@/config";

/**
 * Las variables que hay que ir a buscar a otra colección: el enlace al
 * pasaporte y el de la encuesta (que además crea su token).
 *
 * Sólo se resuelven si la plantilla las menciona.
 */

const APP_URL = SITIO;

/** Cómo llama `SurveyRecipient` a cada público. */
const FUENTE: Record<Publico, string> = {
  asistentes: "registration",
  speakers: "speaker",
  voluntarios: "volunteer",
  equipo: "user",
};

const ETIQUETA_FUENTE: Record<Publico, string> = {
  asistentes: "Registrado",
  speakers: "Speaker",
  voluntarios: "Voluntario",
  equipo: "Organizador",
};

/** Las variables de esta clase, para saber si una plantilla las pide. */
export const VARIABLES_EXTRA = ["pasaporte", "encuesta"] as const;

/**
 * Añade a cada persona el enlace a su pasaporte. Quien no tiene uno se queda
 * sin la variable, y el botón que la use desaparece de su correo.
 */
export async function anadirPasaporte(gente: Destinatario[]): Promise<void> {
  if (!gente.length) return;

  const porOrigen = new Map<string, string>();
  const pasaportes = await Passport.find({ linkedRegistrationId: { $ne: null } })
    .select("shortId linkedRegistrationId")
    .lean<{ shortId: string; linkedRegistrationId?: string }[]>();
  for (const p of pasaportes) {
    if (p.linkedRegistrationId) porOrigen.set(String(p.linkedRegistrationId), p.shortId);
  }

  for (const d of gente) {
    const corto = porOrigen.get(d.id);
    if (corto) d.valores.pasaporte = `${APP_URL}/pasaporte/${corto}`;
  }
}

/**
 * Añade a cada persona el enlace a su encuesta, creando el token si falta.
 *
 * Devuelve las escrituras en vez de hacerlas: se guardan después de que el
 * correo haya salido, para no contar como enviadas encuestas que no llegaron.
 */
export async function anadirEncuesta(
  gente: Destinatario[],
): Promise<Parameters<typeof SurveyRecipient.bulkWrite>[0]> {
  if (!gente.length) return [];

  const existentes = await SurveyRecipient.find({})
    .select("source sourceId token")
    .lean<{ source: string; sourceId: string; token: string }[]>();

  const porClave = new Map(existentes.map((e) => [`${e.source}:${e.sourceId}`, e.token]));
  const ops: Parameters<typeof SurveyRecipient.bulkWrite>[0] = [];

  for (const d of gente) {
    const fuente = FUENTE[d.publico];
    const clave = `${fuente}:${d.id}`;
    // Quien ya tiene token lo conserva: el enlace que recibió antes tiene que seguir funcionando.
    const token = porClave.get(clave) ?? nanoid(24);
    porClave.set(clave, token);

    d.valores.encuesta = `${APP_URL}/encuesta/${token}`;

    ops.push({
      updateOne: {
        filter: { source: fuente, sourceId: d.id },
        update: {
          $setOnInsert: { token },
          $set: {
            name: d.nombre,
            email: d.email,
            roleLabel: ETIQUETA_FUENTE[d.publico],
            lastSentAt: new Date(),
          },
          $inc: { sentCount: 1 },
        },
        upsert: true,
      },
    });
  }

  return ops;
}

/** Quita a quien ya respondió la encuesta, para los reenvíos. */
export async function quitarQuienRespondio(gente: Destinatario[]): Promise<Destinatario[]> {
  const conClic = await SurveyRecipient.find({ clickedAt: { $ne: null } })
    .select("source sourceId")
    .lean<{ source: string; sourceId: string }[]>();
  if (!conClic.length) return gente;

  const fuera = new Set(conClic.map((c) => `${c.source}:${c.sourceId}`));
  return gente.filter((d) => !fuera.has(`${FUENTE[d.publico]}:${d.id}`));
}
