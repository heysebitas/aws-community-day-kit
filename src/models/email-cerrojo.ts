import mongoose, { Schema } from "mongoose";

/** Un cerrojo con caducidad: la clave es el `_id`, así que dos a la vez no caben. */
interface ICerrojo {
  _id: string;
  hasta: Date;
  por: string;
}

const cerrojoSchema = new Schema<ICerrojo>(
  {
    _id: { type: String, required: true },
    hasta: { type: Date, required: true },
    por: { type: String, default: "" },
  },
  { versionKey: false },
);

export const EmailCerrojo =
  (mongoose.models.EmailCerrojo as mongoose.Model<ICerrojo>) ||
  mongoose.model<ICerrojo>("EmailCerrojo", cerrojoSchema);

/**
 * Toma el cerrojo de `clave` si está libre o caducó. El upsert sobre un `_id`
 * ocupado choca con la clave duplicada, y eso es lo que lo hace atómico.
 */
export async function tomarCerrojo(clave: string, por: string, ttlMs = 6 * 60_000): Promise<boolean> {
  const ahora = Date.now();
  try {
    await EmailCerrojo.updateOne(
      { _id: clave, hasta: { $lt: new Date(ahora) } },
      { $set: { hasta: new Date(ahora + ttlMs), por } },
      { upsert: true },
    );
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false;
    throw e;
  }
}

export async function soltarCerrojo(clave: string): Promise<void> {
  await EmailCerrojo.deleteOne({ _id: clave });
}
