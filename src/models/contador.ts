import mongoose, { Schema } from "mongoose";

/** Cuántos cupos de un formulario están tomados; `_id` es el tipo ("attendee" | "volunteer"). */
interface IContador {
  _id: string;
  n: number;
}

const contadorSchema = new Schema<IContador>({ _id: String, n: { type: Number, default: 0 } });

export const Contador =
  (mongoose.models.Contador as mongoose.Model<IContador>) || mongoose.model<IContador>("Contador", contadorSchema);
