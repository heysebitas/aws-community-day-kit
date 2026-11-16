import bcrypt from "bcryptjs";
import { Form } from "@/models/form";
import { User } from "@/models/user";

/** La cuenta con la que se entra al panel en modo demo. */
export const DEMO_ADMIN = { email: "demo@example.com", password: "demo-demo-demo" };

/**
 * Deja la base en memoria lista para probar: una cuenta de administración y
 * los formularios abiertos. Sólo corre en modo demo (`npm run demo`).
 */
export async function sembrarDemo(): Promise<void> {
  if (await User.exists({ email: DEMO_ADMIN.email })) return;

  await User.create({
    email: DEMO_ADMIN.email,
    name: "Admin Demo",
    role: "admin",
    passwordHash: await bcrypt.hash(DEMO_ADMIN.password, 10),
  });

  for (const formType of ["attendee", "volunteer"] as const) {
    await Form.updateOne({ formType }, { $set: { isPublished: true, isOpen: true } }, { upsert: true });
  }

  console.warn(`[demo] Panel: /admin/login → ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
}
