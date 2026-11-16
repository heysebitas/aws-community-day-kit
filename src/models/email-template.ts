import mongoose, { Schema, type Document } from "mongoose";
import type { Bloque } from "@/emails/bloques";
import type { Segmento } from "@/lib/audiencias";

/** Una plantilla de correo editable desde el panel. */
export interface IEmailTemplate extends Document {
  /** Identificador estable. Las de sistema lo tienen fijo; ver `SISTEMA`. */
  slug: string;
  /** Cómo se llama en el panel. */
  nombre: string;
  /** Para qué sirve, en una línea. Sale bajo el nombre en la lista. */
  descripcion: string;
  /** El asunto. Admite variables, igual que los bloques. */
  asunto: string;
  /** El texto de vista previa de la bandeja, el que va bajo el asunto. */
  preview: string;
  /** El texto de la cinta que recorre la cabecera. */
  strip: string;
  /** El cuerpo. */
  bloques: Bloque[];

  /**
   * Las de sistema las dispara el código al pasar algo —aprobar un speaker,
   * registrarse— y no se pueden borrar ni renombrar: hay un `sendEmail` que
   * las busca por `slug`. Sí se puede editar su contenido, que es el punto.
   */
  deSistema: boolean;
  /** Qué acción la dispara. Sólo informativo, para que se entienda en la lista. */
  disparador: string;

  /** A quién va dirigida cuando se manda como campaña. */
  audiencia: Segmento[] | null;

  /** Su contenido lo manda el código y el panel no lo deja tocar. */
  bloqueada: boolean;

  activa: boolean;
  actualizadaPor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Los bloques se guardan tal cual: su forma la valida `sanearBloques`. */
const bloqueSchema = new Schema({ _id: false }, { strict: false });

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    asunto: { type: String, required: true },
    preview: { type: String, default: "" },
    strip: { type: String, default: "" },
    bloqueada: { type: Boolean, default: false },
    bloques: { type: [bloqueSchema], default: [] },
    deSistema: { type: Boolean, default: false, index: true },
    disparador: { type: String, default: "" },
    audiencia: { type: Schema.Types.Mixed, default: null },
    activa: { type: Boolean, default: true },
    actualizadaPor: { type: String, default: null },
  },
  {
    timestamps: true,
    // Sin esto, un `filtros: {}` dentro de la audiencia desaparece al guardar
    // —`minimize` poda los objetos vacíos del documento— y el panel se queda
    // leyendo filtros sobre un `undefined`. Un segmento sin filtros es un
    // segmento válido: «todo el público».
    minimize: false,
  },
);

export const EmailTemplate =
  (mongoose.models.EmailTemplate as mongoose.Model<IEmailTemplate>) ||
  mongoose.model<IEmailTemplate>("EmailTemplate", emailTemplateSchema);

/** Las plantillas que dispara el sistema. */
export const SISTEMA = {
  speaker_aprobado: "Al aprobar la propuesta de un speaker",
  speaker_rechazado: "Al rechazar la propuesta de un speaker",
  speaker_postulacion: "Al enviar una postulación de speaker",
  voluntario_aprobado: "Al aprobar a un voluntario",
  registro_presencial: "Al registrarse como asistente presencial",
  registro_online: "Al registrarse como asistente online",
} as const;

export type SlugSistema = keyof typeof SISTEMA;
