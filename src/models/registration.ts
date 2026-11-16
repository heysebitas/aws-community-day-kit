import mongoose, { Schema, type Document, type Query } from "mongoose";

/** Registro de una persona asistente. */

export type Attendance = "in-person" | "online";

export interface IRegistration extends Document {
  // ── Identidad ──
  firstName: string;
  lastName: string;
  /** En minúsculas y sin espacios; es la clave para detectar duplicados. */
  email: string;

  // ── Modalidad ──
  attendance: Attendance;

  // ── Documento — sólo presencial ──
  /** Código del tipo, del catálogo del país (RUN, CC, DNI, CURP…). */
  documentType: string | null;
  /** Ya normalizado: sin puntos, en mayúsculas, con dígito verificador. */
  documentNumber: string | null;

  // ── Perfil ──
  /** Código del rol; `other` cuando la persona escribió el suyo. */
  role: string;
  /** Texto libre, sólo si `role === "other"`. */
  roleOther: string | null;
  entityType: string;
  entityName: string | null;

  /** Consentimientos, con la fecha en que se dieron. */
  consent: {
    codeOfConduct: Date | null;
    privacy: Date | null;
  };

  // ── Operación del evento ──
  qrCode: string;
  /** Palabras normalizadas para la búsqueda de la puerta; no se escribe a mano. */
  busqueda: string[];
  checkedIn: boolean;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  /** Alta manual desde el panel, no por el formulario público. */
  isManual: boolean;

  emailStatus: "pending" | "sent" | "failed" | "skipped";
  emailError: string | null;
  emailSentAt: Date | null;
  resendId: string | null;
  sentCampaigns: string[];

  confirmation: {
    confirmed: boolean;
    confirmedAt: Date | null;
    badgeFirstName: string;
    badgeLastName: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

/** Minúsculas y sin tildes, para comparar sin importar cómo se escribió. */
export const normalizarBusqueda = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Palabras por las que se encuentra un documento: cada valor entero (así un
 * correo o un documento se buscan completos), sus trozos alfanuméricos y el
 * valor sin signos (un documento con puntos se encuentra tecleándolo sin ellos).
 */
export function palabrasDeBusqueda(doc: object, campos: readonly string[] = CAMPOS_BUSQUEDA): string[] {
  const palabras = new Set<string>();
  for (const c of campos) {
    const v = (doc as Record<string, unknown>)[c];
    if (typeof v !== "string" || !v.trim()) continue;
    const n = normalizarBusqueda(v);
    for (const w of n.split(/\s+/)) {
      if (!w) continue;
      palabras.add(w);
      palabras.add(w.replace(/[^a-z0-9]/g, ""));
      for (const t of w.split(/[^a-z0-9]+/)) palabras.add(t);
    }
  }
  palabras.delete("");
  return [...palabras];
}

/** Filtro de Mongo: cada palabra tecleada es el inicio de alguna palabra guardada. */
export function filtroDeBusqueda(q: string): Record<string, unknown> | null {
  const terminos = normalizarBusqueda(q).split(/\s+/).filter(Boolean).slice(0, 5);
  if (!terminos.length) return null;
  return {
    $and: terminos.map((t) => ({ busqueda: { $regex: `^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } })),
  };
}

/**
 * Los hooks de `save` no corren en las escrituras atómicas: sin esto, un
 * `updateOne` que cambie el nombre dejaría `busqueda` desactualizado.
 * Con `updateMany` no se puede recalcular por documento, así que se rechaza.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mantenerBusqueda(schema: Schema<any>, campos: readonly string[]) {
  type Doc = Record<string, unknown>;
  type Actualizacion = Doc & { $set?: Doc; $setOnInsert?: Doc };

  async function recalcular(this: Query<unknown, unknown> & { op: string }) {
    const u = this.getUpdate() as Actualizacion | null;
    if (!u || Array.isArray(u)) return;
    const plano = { ...u, ...u.$set, ...u.$setOnInsert };
    if (!campos.some((c) => c in plano)) return;
    if (this.op === "updateMany") {
      throw new Error("updateMany no puede cambiar campos de búsqueda: usa updateOne");
    }
    const actual = await this.model.findOne(this.getFilter()).select(campos.join(" ")).lean<Doc>();
    // Si el upsert va a insertar, `$setOnInsert` aporta los valores; si ya existe, se ignora.
    const sueltos = Object.fromEntries(Object.entries(u).filter(([k]) => !k.startsWith("$")));
    const base = { ...(actual ?? u.$setOnInsert), ...sueltos, ...u.$set };
    for (const k of Object.keys(sueltos)) delete u[k];
    if (u.$setOnInsert) delete u.$setOnInsert.busqueda;
    u.$set = { ...sueltos, ...u.$set, busqueda: palabrasDeBusqueda(base, campos) };
    this.setUpdate(u);
  }
  schema.pre(["updateOne", "findOneAndUpdate", "updateMany"], recalcular);
}

const registrationSchema = new Schema<IRegistration>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },

    attendance: {
      type: String,
      enum: ["in-person", "online"],
      required: true,
      index: true,
    },

    documentType: { type: String, default: null },
    // Índice disperso: quien asiste en línea no tiene documento, y sin
    // `sparse` todos esos nulos ocuparían entrada en el índice.
    documentNumber: { type: String, default: null, index: { sparse: true } },

    role: { type: String, required: true, index: true },
    roleOther: { type: String, default: null },
    entityType: { type: String, required: true },
    entityName: { type: String, default: null, index: true },

    consent: {
      codeOfConduct: { type: Date, default: null },
      privacy: { type: Date, default: null },
    },

    qrCode: { type: String, required: true, unique: true },
    busqueda: { type: [String], default: undefined },
    checkedIn: { type: Boolean, default: false, index: true },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: String, default: null },
    isManual: { type: Boolean, default: false },

    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    emailError: { type: String, default: null },
    emailSentAt: { type: Date, default: null },
    // Parcial para no indexar los nulos; Mongoose lo crea al iniciar el modelo.
    resendId: {
      type: String,
      default: null,
      index: { partialFilterExpression: { resendId: { $type: "string" } } },
    },
    sentCampaigns: { type: [String], default: [] },

    confirmation: {
      confirmed: { type: Boolean, default: false },
      confirmedAt: { type: Date, default: null },
      badgeFirstName: { type: String, default: "" },
      badgeLastName: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

registrationSchema.index({ busqueda: 1 });
// Para paginar el listado por cursor; `_id` desempata las altas del mismo instante.
registrationSchema.index({ createdAt: -1, _id: -1 });

const CAMPOS_BUSQUEDA = ["firstName", "lastName", "email", "documentNumber", "qrCode"] as const;

registrationSchema.pre("validate", function () {
  if (this.isNew || CAMPOS_BUSQUEDA.some((c) => this.isModified(c)) || !this.busqueda?.length) {
    this.busqueda = palabrasDeBusqueda(this.toObject());
  }
});

mantenerBusqueda(registrationSchema, CAMPOS_BUSQUEDA);

export const Registration =
  (mongoose.models.Registration as mongoose.Model<IRegistration>) ||
  mongoose.model<IRegistration>("Registration", registrationSchema);
