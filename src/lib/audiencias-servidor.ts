import { Registration } from "@/models/registration";
import { SpeakerProfile } from "@/models/speaker-profile";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { User } from "@/models/user";
import { consultaDe, resumenSegmento, type Audiencia, type Publico, type Segmento } from "@/lib/audiencias";
import { SITIO } from "@/config";

/**
 * Convierte una audiencia en personas.
 *
 * `audiencias.ts` define el grupo; esto va a la base y dice quiénes son. Cada
 * destinatario trae ya las variables de la plantilla y las banderas de los
 * bloques condicionales, así que una campaña puede hablarle a cada quien por su
 * nombre y según su modalidad.
 */

export interface Destinatario {
  email: string;
  /** Para el log y la vista previa de la audiencia. */
  nombre: string;
  publico: Publico;
  id: string;
  /** Las variables de la plantilla para esta persona. */
  valores: Record<string, string>;
  /** Qué condiciones cumple, para `bloquesVisibles`. */
  banderas: string[];
  /** Sólo los asistentes tienen pase con QR. */
  qrCode?: string;
}

/** Dónde anota cada colección las campañas que ya recibió. Son nombres distintos para lo mismo. */
export const CAMPO_ENVIADOS: Record<Publico, string> = {
  asistentes: "sentCampaigns",
  speakers: "sentSpeakerCampaigns",
  voluntarios: "sentVolunteerCampaigns",
  equipo: "sentCampaigns",
};

const APP_URL = SITIO;

const primerNombre = (completo: string) => completo.trim().split(/\s+/)[0] ?? "";

/** Lo que se le pasa a `armarCorreo` para cualquier persona. */
function valoresBase(nombre: string, email: string): Record<string, string> {
  return { nombre: primerNombre(nombre), nombreCompleto: nombre.trim(), correo: email };
}

export interface OpcionesResolucion {
  /**
   * Clave de la campaña: con ella se excluye a quien ya la recibió. Sin ella no
   * se excluye a nadie, que es lo que quiere un recordatorio que se repite.
   */
  campana?: string;
  /** Tope de personas. Lo usa la vista previa para no traerse la base entera. */
  limite?: number;
}

/** Las personas de un segmento. Sólo se piden los campos que se usan. */
async function resolverSegmento(
  segmento: Segmento,
  opciones: OpcionesResolucion = {},
): Promise<Destinatario[]> {
  const consulta: Record<string, unknown> = { ...consultaDe(segmento) };
  if (opciones.campana) {
    consulta[CAMPO_ENVIADOS[segmento.publico]] = { $nin: [opciones.campana] };
  }
  const limite = opciones.limite ?? 0;

  switch (segmento.publico) {
    case "asistentes": {
      const q = Registration.find(consulta).select("firstName lastName email attendance qrCode");
      if (limite) q.limit(limite);
      return (await q.lean()).map((r) => {
        const nombre = `${r.firstName} ${r.lastName}`.trim();
        /**
         * Los enlaces que salen del código QR. Quien asiste en línea no tiene pase,
         * así que se queda sin estas variables y sus botones desaparecen del correo.
         */
        const delPase: Record<string, string> = r.qrCode && r.attendance !== "online"
          ? {
              pase: `${APP_URL}/api/passes/${r.qrCode}`,
              confirmar: `${APP_URL}/confirmar/${r.qrCode}`,
              qr: `${APP_URL}/api/pass-qr/${r.qrCode}`,
            }
          : {};

        return {
          email: r.email,
          nombre,
          publico: "asistentes" as const,
          id: String(r._id),
          qrCode: r.qrCode,
          valores: {
            ...valoresBase(nombre, r.email),
            modalidad: r.attendance === "online" ? "Online" : "Presencial",
            ...delPase,
          },
          banderas: [r.attendance === "online" ? "online" : "presencial", "nacional"],
        };
      });
    }

    case "speakers": {
      const q = SpeakerProfile.find(consulta).select("name email talkTitle sessionType speakerType slug");
      if (limite) q.limit(limite);
      return (await q.lean()).map((s) => {
        const online = ["online", "virtual"].includes(s.sessionType ?? "");
        return {
          email: s.email,
          nombre: s.name,
          publico: "speakers" as const,
          id: String(s._id),
          valores: {
            ...valoresBase(s.name, s.email),
            charla: s.talkTitle ?? "",
            modalidad: online ? "Track Online (en vivo)" : "Presencial",
          },
          banderas: [
            online ? "online" : "presencial",
            s.speakerType === "international" ? "internacional" : "nacional",
          ],
        };
      });
    }

    case "voluntarios": {
      const q = VolunteerSubmission.find(consulta).select("firstName lastName email");
      if (limite) q.limit(limite);
      return (await q.lean()).map((v) => {
        const nombre = `${v.firstName} ${v.lastName}`.trim();
        return {
          email: v.email,
          nombre,
          publico: "voluntarios" as const,
          id: String(v._id),
          valores: { ...valoresBase(nombre, v.email), modalidad: "Presencial" },
          // El voluntariado es en el recinto: no hay voluntario online.
          banderas: ["presencial", "nacional"],
        };
      });
    }

    case "equipo": {
      const q = User.find(consulta).select("name email");
      if (limite) q.limit(limite);
      return (await q.lean()).map((u) => {
        const nombre = (u.name as string) ?? "";
        const email = (u.email as string) ?? "";
        return {
          email,
          nombre,
          publico: "equipo" as const,
          id: String(u._id),
          valores: { ...valoresBase(nombre, email), modalidad: "Presencial" },
          banderas: ["presencial", "nacional"],
        };
      });
    }
  }
}

/**
 * Las personas de una audiencia, sin repetir a nadie. Si alguien está en
 * varios segmentos gana el primero, así que el orden decide con qué datos se
 * le escribe.
 */
export async function resolverAudiencia(
  audiencia: Audiencia,
  opciones: OpcionesResolucion = {},
): Promise<Destinatario[]> {
  const listas = await Promise.all(audiencia.map((s) => resolverSegmento(s, opciones)));

  const vistos = new Set<string>();
  const salida: Destinatario[] = [];
  for (const lista of listas) {
    for (const d of lista) {
      const clave = d.email?.toLowerCase().trim();
      if (!clave || vistos.has(clave)) continue;
      vistos.add(clave);
      salida.push(d);
    }
  }
  return salida;
}

export interface ConteoAudiencia {
  /** Cuántas personas distintas reciben el correo. */
  total: number;
  /** Cuántas aporta cada segmento antes de quitar repetidos. */
  porSegmento: { resumen: string; total: number }[];
  /** Cuántas aparecían en más de un segmento. */
  repetidos: number;
}

/**
 * Cuánta gente recibiría el correo, por segmento y en total. Cuenta en la
 * base, salvo para quitar repetidos, que necesita los correos.
 */
export async function contarAudiencia(
  audiencia: Audiencia,
  opciones: OpcionesResolucion = {},
): Promise<ConteoAudiencia> {
  const listas = await Promise.all(
    audiencia.map((s) => resolverSegmento(s, { campana: opciones.campana })),
  );

  const vistos = new Set<string>();
  let repetidos = 0;
  for (const lista of listas) {
    for (const d of lista) {
      const clave = d.email?.toLowerCase().trim();
      if (!clave) continue;
      if (vistos.has(clave)) repetidos++;
      else vistos.add(clave);
    }
  }

  return {
    total: vistos.size,
    porSegmento: audiencia.map((s, i) => ({ resumen: resumenSegmento(s), total: listas[i]!.length })),
    repetidos,
  };
}
