import type mongoose from "mongoose";
import { EmailEnvio } from "@/models/email-envio";
import { Registration } from "@/models/registration";
import { SpeakerProfile } from "@/models/speaker-profile";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { User } from "@/models/user";
import { SurveyRecipient } from "@/models/survey-recipient";
import { CAMPO_ENVIADOS, type Destinatario } from "@/lib/audiencias-servidor";
import type { Publico } from "@/lib/audiencias";
import type { SendEmailResult } from "@/lib/correo";

/** Dónde se anota, por público, que alguien ya recibió esta plantilla. */
const MODELOS: Record<Publico, Pick<mongoose.Model<never>, "updateMany">> = {
  asistentes: Registration,
  speakers: SpeakerProfile,
  voluntarios: VolunteerSubmission,
  equipo: User,
} as never;

type OpsEncuesta = Parameters<typeof SurveyRecipient.bulkWrite>[0];

/**
 * Deja escrito lo que pasó con un tramo recién enviado: el envío de cada
 * persona y la marca de «ya lo recibió» sólo a quien salió de verdad. Se llama
 * tras cada tramo para que un corte pierda, como mucho, el que iba en vuelo.
 */
export async function registrarTramo(p: {
  campana: unknown;
  plantilla: string;
  gente: Destinatario[];
  resultados: SendEmailResult[];
  opsEncuesta?: OpsEncuesta;
}): Promise<{ enviados: number; fallidos: number; motivos: string[] }> {
  const envios = p.gente.map((d, i) => {
    const r = p.resultados[i] ?? { id: null, error: "sin respuesta" };
    return {
      campana: p.campana,
      plantilla: p.plantilla,
      email: d.email,
      nombre: d.nombre,
      publico: d.publico,
      personaId: d.id,
      resendId: r.id,
      estado: r.error ? ("fallido" as const) : ("enviado" as const),
      motivo: r.error,
    };
  });
  await EmailEnvio.insertMany(envios, { ordered: false });

  // `envios` va alineado con `gente`: filtrar antes desalinearía los índices.
  const porPublico = new Map<Publico, string[]>();
  const ops: OpsEncuesta = [];
  envios.forEach((e, i) => {
    if (e.estado !== "enviado") return;
    const d = p.gente[i];
    if (!d) return;
    const lista = porPublico.get(d.publico) ?? [];
    lista.push(d.id);
    porPublico.set(d.publico, lista);
    if (p.opsEncuesta?.[i]) ops.push(p.opsEncuesta[i]);
  });

  await Promise.all(
    [...porPublico].map(([publico, ids]) =>
      Promise.resolve(
        MODELOS[publico].updateMany(
          { _id: { $in: ids } } as never,
          { $addToSet: { [CAMPO_ENVIADOS[publico]]: p.plantilla } } as never,
        ),
      ),
    ),
  );
  if (ops.length) await SurveyRecipient.bulkWrite(ops, { ordered: false });

  const enviados = envios.filter((e) => e.estado === "enviado").length;
  return {
    enviados,
    fallidos: envios.length - enviados,
    motivos: envios.flatMap((e) => (e.motivo ? [e.motivo] : [])),
  };
}
