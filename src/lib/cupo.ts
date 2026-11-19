import { Contador } from "@/models/contador";
import { Registration } from "@/models/registration";
import { VolunteerSubmission } from "@/models/volunteer-submission";

/**
 * Cupo de registros y voluntarios. Contar y luego crear deja pasar a todas las
 * altas simultáneas; el contador con `$inc` condicionado lo hace atómico.
 */

export type TipoCupo = "attendee" | "volunteer";

const contar = (tipo: TipoCupo) =>
  tipo === "attendee" ? Registration.countDocuments({}) : VolunteerSubmission.countDocuments({});

/** Alinea el contador con lo que hay guardado (altas manuales, borrados, movimientos). */
export async function sincronizarCupo(tipo: TipoCupo) {
  await Contador.updateOne({ _id: tipo }, { $set: { n: await contar(tipo) } }, { upsert: true });
}

/** Toma un cupo. `false` si ya está lleno; sin tope (`max` vacío) siempre `true` sin tocar nada. */
export async function reservarCupo(tipo: TipoCupo, max: number | null | undefined): Promise<boolean> {
  if (!max) return true;
  try {
    await Contador.updateOne({ _id: tipo }, { $setOnInsert: { n: await contar(tipo) } }, { upsert: true });
  } catch (e) {
    // Otra alta lo creó a la vez: sirve el suyo.
    if ((e as { code?: number }).code !== 11000) throw e;
  }
  const r = await Contador.findOneAndUpdate({ _id: tipo, n: { $lt: max } }, { $inc: { n: 1 } });
  return r !== null;
}

/** Devuelve el cupo tomado si la creación falló después. */
export async function devolverCupo(tipo: TipoCupo, max: number | null | undefined) {
  if (!max) return;
  await Contador.updateOne({ _id: tipo, n: { $gt: 0 } }, { $inc: { n: -1 } });
}
