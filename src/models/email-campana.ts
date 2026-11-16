import mongoose, { Schema, type Document } from "mongoose";
import type { Segmento } from "@/lib/audiencias";

/** Un envío de una plantilla a una audiencia. */
export interface IEmailCampana extends Document {
  /** La plantilla con la que se armó. */
  plantilla: string;
  /** Su nombre en el momento del envío, por si luego se renombra. */
  nombrePlantilla: string;
  /** El asunto tal como salió, ya con las variables del evento puestas. */
  asunto: string;

  /** La audiencia con la que se lanzó. Foto, no referencia. */
  audiencia: Segmento[];
  /** Esa audiencia en una frase, para la lista del panel. */
  resumenAudiencia: string;
  /** Si se excluyó a quien ya había recibido esta plantilla. */
  evitarRepetidos: boolean;

  estado: "enviando" | "hecho" | "error";
  /** Cuántas personas salieron de la audiencia. */
  total: number;
  /** Cuántas aceptó Resend. */
  enviados: number;
  /** Cuántas no salieron. */
  fallidos: number;

  /** Quién le dio al botón. */
  lanzadaPor: string;
  /** Qué falló, cuando el estado es «error». */
  error: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const campanaSchema = new Schema<IEmailCampana>(
  {
    plantilla: { type: String, required: true, index: true },
    nombrePlantilla: { type: String, default: "" },
    asunto: { type: String, default: "" },

    audiencia: { type: Schema.Types.Mixed, default: [] },
    resumenAudiencia: { type: String, default: "" },
    evitarRepetidos: { type: Boolean, default: true },

    estado: { type: String, enum: ["enviando", "hecho", "error"], default: "enviando", index: true },
    total: { type: Number, default: 0 },
    enviados: { type: Number, default: 0 },
    fallidos: { type: Number, default: 0 },

    lanzadaPor: { type: String, required: true },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

export const EmailCampana =
  (mongoose.models.EmailCampana as mongoose.Model<IEmailCampana>) ||
  mongoose.model<IEmailCampana>("EmailCampana", campanaSchema);
