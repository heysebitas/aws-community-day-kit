import mongoose, { Schema, Document } from "mongoose";
import { mantenerBusqueda, palabrasDeBusqueda } from "./registration";

interface Stamp {
  sponsorId: string;
  sponsorName: string;
  stampedAt: Date;
}

export interface PassportSocial {
  builderCenter?: string;
  linkedin?: string;
  instagram?: string;
  x?: string;
  github?: string;
  tiktok?: string;
  website?: string; // legacy — ya no se expone en la UI
}

export interface PassportStats {
  views: number;
  clicks: Map<string, number>;
}

export interface SessionAttendanceEntry {
  sessionId: string;
  sessionTitle: string;
  room: string;
  scannedAt: Date;
  scannedBy: string;
}

export interface IPassport extends Document {
  shortId: string;
  role: "attendee" | "speaker" | "volunteer" | "organizer";
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  photoUrl?: string;
  social?: PassportSocial;
  stats: PassportStats;
  viewPin?: string;
  linkedRegistrationId?: string;
  /** Palabras normalizadas para la búsqueda de los escáneres; no se escribe a mano. */
  busqueda?: string[];
  isManual: boolean;
  confirmed: boolean;
  confirmedAt: Date | null;
  badgePrinted: boolean;
  badgePrintedAt: Date | null;
  badgeFirstName: string;
  badgeLastName: string;
  stamps: Stamp[];
  sessionAttendance: SessionAttendanceEntry[];
  meals: {
    lunch?: { claimedAt: Date; claimedBy: string };
    snack?: { claimedAt: Date; claimedBy: string };
  };
  createdAt: Date;
}

const PassportSchema = new Schema<IPassport>(
  {
    shortId: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ["attendee", "speaker", "volunteer", "organizer"], required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, default: "" },
    company: { type: String },
    jobTitle: { type: String },
    photoUrl: { type: String, default: null },
    social: {
      builderCenter: { type: String, default: "" },
      linkedin:  { type: String, default: "" },
      instagram: { type: String, default: "" },
      x:         { type: String, default: "" },
      github:    { type: String, default: "" },
      tiktok:    { type: String, default: "" },
      website:   { type: String, default: "" },
    },
    stats: {
      views:  { type: Number, default: 0 },
      clicks: { type: Map, of: Number, default: {} },
    },
    viewPin: { type: String, default: null },
    linkedRegistrationId: { type: String, index: true, sparse: true },
    busqueda: { type: [String], default: undefined },
    isManual: { type: Boolean, default: false },
    confirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: null },
    badgePrinted: { type: Boolean, default: false },
    badgePrintedAt: { type: Date, default: null },
    badgeFirstName: { type: String, default: "" },
    badgeLastName: { type: String, default: "" },
    stamps: [
      {
        sponsorId: { type: String, required: true },
        sponsorName: { type: String, required: true },
        stampedAt: { type: Date, default: Date.now },
      },
    ],
    sessionAttendance: [
      {
        sessionId: { type: String, required: true },
        sessionTitle: { type: String, default: "" },
        room: { type: String, default: "" },
        scannedAt: { type: Date, default: Date.now },
        scannedBy: { type: String, default: "" },
      },
    ],
    meals: {
      lunch: {
        claimedAt: { type: Date },
        claimedBy: { type: String },
      },
      snack: {
        claimedAt: { type: Date },
        claimedBy: { type: String },
      },
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

const CAMPOS_BUSQUEDA = ["firstName", "lastName", "company", "shortId"] as const;

PassportSchema.index({ busqueda: 1 });

PassportSchema.pre("validate", function () {
  if (this.isNew || CAMPOS_BUSQUEDA.some((c) => this.isModified(c)) || !this.busqueda?.length) {
    this.busqueda = palabrasDeBusqueda(this.toObject(), CAMPOS_BUSQUEDA);
  }
});

mantenerBusqueda(PassportSchema, CAMPOS_BUSQUEDA);

export const Passport =
  mongoose.models.Passport || mongoose.model<IPassport>("Passport", PassportSchema);
