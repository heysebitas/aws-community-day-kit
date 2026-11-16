import mongoose, { Schema, type Document } from "mongoose";

/** Qué le pasó al correo de una persona. */

/**
 * Los estados viven en `@/data/email-estados`, que es puro, para que el panel
 * pueda dibujarlos sin arrastrar mongoose al navegador.
 */
export { ESTADOS_ENVIO, ETIQUETA_ENVIO, type EstadoEnvio } from "@/data/email-estados";
import { ESTADOS_ENVIO, type EstadoEnvio } from "@/data/email-estados";

export interface IEmailEnvio extends Document {
  campana: mongoose.Types.ObjectId;
  /** La plantilla, repetida acá para poder mirar los fallos de una sin cruzar. */
  plantilla: string;

  email: string;
  nombre: string;
  /** De qué colección salió la persona. */
  publico: string;
  /** Su `_id` en esa colección. */
  personaId: string;

  /** El id de Resend. Nulo si el correo no llegó ni a salir. */
  resendId: string | null;
  estado: EstadoEnvio;
  /** El motivo, cuando no salió o rebotó. */
  motivo: string | null;

  /** Cuándo se aceptó. */
  createdAt: Date;
  /** Cuándo se supo lo último de él. */
  updatedAt: Date;
}

const envioSchema = new Schema<IEmailEnvio>(
  {
    campana: { type: Schema.Types.ObjectId, ref: "EmailCampana", required: true, index: true },
    plantilla: { type: String, required: true, index: true },

    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    nombre: { type: String, default: "" },
    publico: { type: String, required: true },
    personaId: { type: String, required: true },

    // Disperso: los que no salieron no tienen id, y sin `sparse` todos esos
    // nulos chocarían entre sí además de ocupar índice.
    resendId: { type: String, default: null, index: { sparse: true } },
    estado: { type: String, enum: [...ESTADOS_ENVIO], default: "enviado", index: true },
    motivo: { type: String, default: null },
  },
  { timestamps: true },
);

export const EmailEnvio =
  (mongoose.models.EmailEnvio as mongoose.Model<IEmailEnvio>) ||
  mongoose.model<IEmailEnvio>("EmailEnvio", envioSchema);
