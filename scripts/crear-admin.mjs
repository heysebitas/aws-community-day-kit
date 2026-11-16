/**
 * Crea la primera cuenta de administración del panel (o le cambia la clave).
 *
 *   ADMIN_EMAIL=tu@correo ADMIN_NAME="Tu Nombre" ADMIN_PASSWORD=… npm run crear-admin
 *
 * También lee esas tres variables y `MONGODB_URI` de `.env.local`. Hace falta
 * correrlo una vez: el resto de las cuentas se crean desde el panel, que envía
 * a cada persona un enlace para que elija su propia contraseña.
 *
 * Después de usarlo, quita `ADMIN_PASSWORD` de `.env.local`.
 */
import fs from "node:fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const uri = process.env.MONGODB_URI;
const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const name = (process.env.ADMIN_NAME || "").trim();
const password = process.env.ADMIN_PASSWORD || "";

const faltan = Object.entries({ MONGODB_URI: uri, ADMIN_EMAIL: email, ADMIN_NAME: name, ADMIN_PASSWORD: password })
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (faltan.length) {
  console.error(`Faltan variables: ${faltan.join(", ")}`);
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD es muy corta: mínimo 12 caracteres.");
  process.exit(1);
}

const User = mongoose.model("User", new mongoose.Schema({}, { strict: false, timestamps: true, collection: "users" }));

await mongoose.connect(uri);
const yaExistia = await User.exists({ email });

await User.updateOne(
  { email },
  {
    $set: { email, name, role: "admin", passwordHash: await bcrypt.hash(password, 12), currentSessionId: null },
    $setOnInsert: { allowedBadges: [], permisos: [], lastLoginAt: null, sentCampaigns: [] },
  },
  { upsert: true },
);

console.log(`${yaExistia ? "Actualizada" : "Creada"} la cuenta de ${email} en «${mongoose.connection.name}».`);
console.log("Entra en /admin/login y quita ADMIN_PASSWORD de .env.local.");
await mongoose.disconnect();
