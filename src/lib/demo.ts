import bcrypt from "bcryptjs";
import { tracks } from "@evento/tracks";
import { Form } from "@/models/form";
import { SpeakerProfile } from "@/models/speaker-profile";
import { User } from "@/models/user";

/** La cuenta con la que se entra al panel en modo demo. */
export const DEMO_ADMIN = { email: "demo@example.com", password: "demo-demo-demo" };

// Personas inventadas: sirven para ver el directorio con contenido.
const SPEAKERS_DEMO = [
  { firstName: "Sofía", lastName: "Navarro", role: "Ingeniera de datos", company: "Empresa Demo", talkTitle: "Del CSV al lago de datos en una tarde", speakerType: "local" },
  { firstName: "Diego", lastName: "Cárdenas", role: "Arquitecto de soluciones", company: "Nube Ejemplo", talkTitle: "Serverless sin sustos en la factura", speakerType: "international" },
  { firstName: "Lucía", lastName: "Peña", role: "Estudiante de sistemas", company: "Universidad Demo", talkTitle: "Mi primer modelo en producción", speakerType: "local" },
  { firstName: "Tomás", lastName: "Vega", role: "DevOps", company: "Ejemplo S.A.S.", talkTitle: "Infraestructura como código para equipos pequeños", speakerType: "local" },
] as const;

/**
 * Deja la base en memoria lista para probar: una cuenta de administración,
 * los formularios abiertos y unos speakers aceptados. Sólo corre en modo demo
 * (`npm run demo`).
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

  await SpeakerProfile.insertMany(
    SPEAKERS_DEMO.map((s, i) => {
      const name = `${s.firstName} ${s.lastName}`;
      return {
        ...s,
        name,
        slug: name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-"),
        email: `speaker${i + 1}@example.com`,
        tagline: s.role,
        track: tracks[i % tracks.length]?.id ?? "",
        status: "accepted",
        isPublic: true,
        sortOrder: i,
        submittedAt: new Date(),
        approvedAt: new Date(),
      };
    }),
  );

  console.warn(`[demo] Panel: /admin/login → ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
}
