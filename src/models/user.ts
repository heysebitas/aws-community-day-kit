import mongoose, { Schema, type Document } from "mongoose";
import { NIVELES, SECCIONES, type Permiso } from "@/lib/permisos";

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string | null;
  role: "admin" | "organizer" | "volunteer" | "badges";
  // Badges (SponsorPin ids) que este usuario puede dar al escanear. Admin da todos.
  allowedBadges: string[];
  /**
   * Qué secciones del panel puede tocar, y hasta dónde. Sólo se mira cuando el
   * rol es "organizer" — los demás siguen mandados por el rol.
   */
  permisos: Permiso[];
  currentSessionId: string | null;
  lastLoginAt: Date | null;
  sentCampaigns: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ["admin", "organizer", "volunteer", "badges"], required: true },
    allowedBadges: { type: [String], default: [] },
    permisos: {
      type: [
        {
          _id: false,
          seccion: { type: String, enum: SECCIONES.map((s) => s.id), required: true },
          nivel: { type: String, enum: [...NIVELES], required: true },
          eliminar: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    currentSessionId: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
    sentCampaigns: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const User = mongoose.models.User as mongoose.Model<IUser> || mongoose.model<IUser>("User", userSchema);
