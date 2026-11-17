import bcrypt from "bcryptjs";
import { tracks } from "@evento/tracks";
import { patrocinadores } from "@evento/patrocinadores";
import { DOCUMENTOS, ENTIDADES, EVENTO, ROLES } from "@/config";
import { AgendaEvent } from "@/models/agenda-event";
import { FAQ } from "@/models/faq";
import { Form } from "@/models/form";
import { Passport } from "@/models/passport";
import { Registration } from "@/models/registration";
import { Room } from "@/models/room";
import { SpeakerProfile } from "@/models/speaker-profile";
import { SponsorPin } from "@/models/sponsor-pin";
import { User } from "@/models/user";
import { VolunteerSubmission } from "@/models/volunteer-submission";

/** La cuenta con la que se entra al panel en modo demo. */
export const DEMO_ADMIN = { email: "demo@example.com", password: "demo-demo-demo" };

/**
 * Todo es inventado y con correos `@example.com`: sirve para probar el kit y
 * para ver el sitio y el panel con contenido. Es determinista (sin azar), así
 * que dos arranques de la demo se ven igual.
 */

const NOMBRES = [
  "Valentina", "Mateo", "Camila", "Santiago", "Isabella", "Sebastián", "Mariana", "Nicolás",
  "Gabriela", "Samuel", "Daniela", "Emiliano", "Antonia", "Joaquín", "Renata", "Benjamín",
  "Florencia", "Martín", "Catalina", "Lucas", "Julieta", "Andrés", "Paula", "Felipe",
];
const APELLIDOS = [
  "Rojas", "Herrera", "Castillo", "Morales", "Ortiz", "Silva", "Mendoza", "Ríos",
  "Fuentes", "Paredes", "Aguilar", "Salazar", "Navarro", "Cabrera", "Ibarra", "Vargas",
];
const INSTITUCIONES = ["Universidad Demo", "Instituto Ejemplo", "Universidad del Valle Demo", "Empresa Demo", "Colegio Ejemplo"];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugDe = (s: string) => sinTildes(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const qr = (i: number) => `demo${String(i).padStart(8, "0")}`;
const haceDias = (dias: number, hora = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, (dias * 7) % 60, 0, 0);
  return d;
};

type SpeakerDemo = {
  firstName: string; lastName: string; role: string; company: string; countryCity: string;
  talkTitle: string; talkAbstract: string; audienceLevel: string; language: string;
  status: "accepted" | "scheduled" | "submitted" | "reviewing" | "waitlisted" | "rejected";
  speakerType: "local" | "international"; sessionType?: string;
};

const SPEAKERS: SpeakerDemo[] = [
  { firstName: "Sofía", lastName: "Navarro", role: "Ingeniera de datos", company: "Empresa Demo", countryCity: "Bogotá, Colombia",
    talkTitle: "Del CSV al lago de datos en una tarde", talkAbstract: "Cómo pasar de hojas de cálculo sueltas a un lago de datos consultable con Amazon S3, AWS Glue y Athena, sin servidores que mantener.",
    audienceLevel: "200", language: "es", status: "scheduled", speakerType: "local" },
  { firstName: "Diego", lastName: "Cárdenas", role: "Arquitecto de soluciones", company: "Nube Ejemplo", countryCity: "Ciudad de México, México",
    talkTitle: "Serverless sin sustos en la factura", talkAbstract: "Patrones para que Lambda, API Gateway y DynamoDB escalen con tu proyecto y no con tu tarjeta de crédito.",
    audienceLevel: "300", language: "es", status: "scheduled", speakerType: "international" },
  { firstName: "Lucía", lastName: "Peña", role: "Estudiante de sistemas", company: "Universidad Demo", countryCity: "Medellín, Colombia",
    talkTitle: "Mi primer modelo en producción", talkAbstract: "Lo que aprendí llevando un modelo de clasificación de un notebook a un endpoint de SageMaker, con todo lo que salió mal.",
    audienceLevel: "100", language: "es", status: "scheduled", speakerType: "local" },
  { firstName: "Tomás", lastName: "Vega", role: "DevOps", company: "Ejemplo S.A.S.", countryCity: "Santiago, Chile",
    talkTitle: "Infraestructura como código para equipos pequeños", talkAbstract: "AWS CDK en un equipo de tres personas: cuándo vale la pena, cómo empezar y cómo no perder un fin de semana en ello.",
    audienceLevel: "200", language: "es", status: "scheduled", speakerType: "international" },
  { firstName: "Ana", lastName: "Quintero", role: "Investigadora en seguridad", company: "Laboratorio Demo", countryCity: "Lima, Perú",
    talkTitle: "IAM explicado con un edificio de oficinas", talkAbstract: "Usuarios, roles y políticas contados con llaves, tarjetas y recepcionistas. Sales sabiendo leer una política sin miedo.",
    audienceLevel: "100", language: "es", status: "scheduled", speakerType: "international" },
  { firstName: "Jorge", lastName: "Ramírez", role: "Ingeniero de plataforma", company: "Empresa Demo", countryCity: "Cali, Colombia",
    talkTitle: "Contenedores: de Docker a ECS en 30 minutos", talkAbstract: "Una aplicación real, un Dockerfile y Amazon ECS con Fargate. En vivo y sin diapositivas de relleno.",
    audienceLevel: "200", language: "es", status: "accepted", speakerType: "local" },
  { firstName: "Emily", lastName: "Carter", role: "Developer Advocate", company: "Cloud Example", countryCity: "Seattle, EE. UU.",
    talkTitle: "Building agents with Amazon Bedrock", talkAbstract: "From a prompt to an agent that calls your own APIs, with guardrails and evaluation from day one.",
    audienceLevel: "300", language: "en", status: "accepted", speakerType: "international" },
  { firstName: "Martina", lastName: "Gómez", role: "Líder de comunidad", company: "Comunidad Cloud Demo", countryCity: "Buenos Aires, Argentina",
    talkTitle: "Cómo conseguí mi primera certificación", talkAbstract: "Plan de estudio, recursos gratuitos y los errores que cometí antes de aprobar el Cloud Practitioner.",
    audienceLevel: "100", language: "es", status: "accepted", speakerType: "international" },
  { firstName: "Pablo", lastName: "Lozano", role: "Estudiante de ingeniería", company: "Instituto Ejemplo", countryCity: "Barranquilla, Colombia",
    talkTitle: "Observabilidad para curiosos", talkAbstract: "CloudWatch, métricas y trazas para entender qué hace tu aplicación cuando nadie la mira.",
    audienceLevel: "200", language: "es", status: "reviewing", speakerType: "local" },
  { firstName: "Laura", lastName: "Benítez", role: "Analista de datos", company: "Empresa Demo", countryCity: "Quito, Ecuador",
    talkTitle: "Dashboards que la gente sí usa", talkAbstract: "Diseño de tableros en QuickSight pensando en quien los lee, no en quien los arma.",
    audienceLevel: "100", language: "es", status: "submitted", speakerType: "international" },
  { firstName: "Ricardo", lastName: "Soto", role: "Backend developer", company: "Nube Ejemplo", countryCity: "Bogotá, Colombia",
    talkTitle: "Colas y eventos sin enredos", talkAbstract: "SQS, SNS y EventBridge: cuál usar, cuándo y por qué casi nunca es una sola.",
    audienceLevel: "300", language: "es", status: "waitlisted", speakerType: "local" },
  { firstName: "Elena", lastName: "Duarte", role: "Product manager", company: "Empresa Demo", countryCity: "Montevideo, Uruguay",
    talkTitle: "La nube para quien no programa", talkAbstract: "Una charla para perfiles de negocio que tienen que decidir sobre tecnología cloud.",
    audienceLevel: "100", language: "es", status: "rejected", speakerType: "international" },
];

const SALAS = [
  { name: "Auditorio principal", capacity: 400, order: 0 },
  { name: "Sala 2", capacity: 120, order: 1 },
  { name: "Laboratorio", capacity: 40, order: 2 },
];

const FAQS = [
  { questionEs: "¿Tiene costo?", answerEs: "No. La entrada es gratuita; sólo tienes que registrarte.", questionEn: "Does it cost anything?", answerEn: "No. Entry is free; you only need to register." },
  { questionEs: "¿Tengo que saber programar?", answerEs: "No. Hay charlas de nivel 100 pensadas para quien empieza.", questionEn: "Do I need to know how to code?", answerEn: "No. There are level 100 talks for beginners." },
  { questionEs: "¿Hay certificado de asistencia?", answerEs: "Sí, para quienes hacen check-in el día del evento.", questionEn: "Is there an attendance certificate?", answerEn: "Yes, for everyone who checks in on the day." },
  { questionEs: "¿Puedo ir sólo una parte del día?", answerEs: "Sí. Revisa la agenda y elige las charlas que te interesen.", questionEn: "Can I attend only part of the day?", answerEn: "Yes. Check the agenda and pick the talks you like." },
  { questionEs: "¿Qué tengo que llevar?", answerEs: "Tu pase con QR (en el correo o en el teléfono) y un documento de identidad.", questionEn: "What should I bring?", answerEn: "Your QR pass (email or phone) and an ID document." },
];

async function sembrarSpeakers() {
  return SpeakerProfile.create(
    SPEAKERS.map((s, i) => {
      const name = `${s.firstName} ${s.lastName}`;
      const publico = s.status === "accepted" || s.status === "scheduled";
      return {
        ...s,
        name,
        slug: slugDe(name),
        email: `speaker${i + 1}@example.com`,
        tagline: `${s.role} · ${s.company}`,
        bio: `${s.firstName} trabaja como ${s.role.toLowerCase()} en ${s.company}. Persona inventada para la demo del kit.`,
        sessionType: s.sessionType ?? "talk",
        track: tracks[i % tracks.length]?.id ?? "general",
        isPublic: publico,
        sortOrder: i,
        submittedAt: haceDias(40 - i),
        approvedAt: publico ? haceDias(20 - i) : null,
      };
    }),
  );
}

async function sembrarAgenda(speakers: Awaited<ReturnType<typeof sembrarSpeakers>>) {
  const salas = await Room.create(SALAS);
  const [auditorio, sala2, lab] = salas;
  const charla = (slug: string) => speakers.find((s) => s.slug === slug)!;
  const bloque = (
    titulo: string, inicio: string, fin: string, sala: typeof auditorio, orden: number, slug?: string, nivel = "",
  ) => {
    const sp = slug ? charla(slug) : null;
    return {
      title: sp?.talkTitle ?? titulo,
      speaker: sp?.name ?? "",
      speakerSlug: sp?.slug ?? "",
      speakerId: sp?._id ?? null,
      description: sp?.talkAbstract ?? "",
      startTime: inicio,
      endTime: fin,
      room: sala!.name,
      roomId: sala!._id,
      track: sp?.track ?? "general",
      level: (sp?.audienceLevel ?? nivel) as "" | "100" | "200" | "300" | "400",
      language: (sp?.language ?? "es") as "es" | "en",
      order: orden,
    };
  };
  await AgendaEvent.insertMany([
    bloque("Acreditación y café", "08:30", "09:15", auditorio, 0),
    bloque("Bienvenida", "09:15", "09:30", auditorio, 1),
    bloque("", "09:30", "10:15", auditorio, 2, "ana-quintero"),
    bloque("", "10:30", "11:15", auditorio, 3, "diego-cardenas"),
    bloque("", "10:30", "11:15", sala2, 4, "sofia-navarro"),
    bloque("", "11:30", "12:15", sala2, 5, "lucia-pena"),
    bloque("", "11:30", "13:00", lab, 6, "tomas-vega"),
    bloque("Almuerzo y networking", "13:00", "14:00", auditorio, 7),
    bloque("Panel: cómo empezar en la nube", "14:00", "15:00", auditorio, 8, undefined, "100"),
    bloque("Cierre y sorteos", "17:00", "17:30", auditorio, 9),
  ]);
}

async function sembrarAsistentes() {
  const presencialDoc = DOCUMENTOS[0]?.value ?? "CI";
  const roles = ROLES.filter((r) => r.group !== "other").map((r) => r.value);
  const entidades = ENTIDADES.filter((e) => e.value !== "none").map((e) => e.value);

  const asistentes = Array.from({ length: 52 }, (_, i) => {
    const firstName = NOMBRES[i % NOMBRES.length]!;
    const lastName = APELLIDOS[(i * 5) % APELLIDOS.length]!;
    const enLinea = i % 4 === 3;
    return {
      firstName,
      lastName,
      email: `${slugDe(firstName)}.${slugDe(lastName)}${i}@example.com`,
      attendance: (enLinea ? "online" : "in-person") as "online" | "in-person",
      documentType: enLinea ? null : presencialDoc,
      documentNumber: enLinea ? null : String(10_000_000 + i * 7919),
      role: roles[i % roles.length]!,
      entityType: entidades[i % entidades.length]!,
      entityName: INSTITUCIONES[i % INSTITUCIONES.length]!,
      consent: { codeOfConduct: haceDias(30 - (i % 30)), privacy: haceDias(30 - (i % 30)) },
      qrCode: qr(i),
      checkedIn: !enLinea && i % 3 !== 0,
      checkedInAt: !enLinea && i % 3 !== 0 ? haceDias(0, 9) : null,
      emailStatus: "sent" as const,
      emailSentAt: haceDias(30 - (i % 30)),
      confirmation: { confirmed: i % 5 !== 0, confirmedAt: i % 5 !== 0 ? haceDias(10) : null },
    };
  });
  // insertMany pasa por la validación, así que `busqueda` se calcula igual que en un registro real.
  const creados = await Registration.insertMany(asistentes);

  // La fecha de alta se reparte en el último mes, para que la gráfica de crecimiento tenga forma.
  // Va por el driver: Mongoose trata `createdAt` como inmutable y descartaría el cambio.
  await Registration.collection.bulkWrite(
    creados.map((r, i) => ({
      updateOne: { filter: { _id: r._id }, update: { $set: { createdAt: haceDias(30 - Math.floor((i * i) / 92), 10 + (i % 9)) } } },
    })),
  );

  const stands = await SponsorPin.insertMany(
    patrocinadores.map((p, i) => ({ sponsorName: p.nombre, logoUrl: p.logo, pin: String(4821 + i * 1111), isActive: true })),
  );

  await Passport.insertMany(
    creados
      .filter((r) => r.attendance === "in-person")
      .map((r, i) => ({
        shortId: r.qrCode,
        role: "attendee" as const,
        firstName: r.firstName,
        lastName: r.lastName,
        company: r.entityName ?? undefined,
        linkedRegistrationId: r._id.toString(),
        viewPin: "1234",
        confirmed: true,
        confirmedAt: haceDias(5),
        stamps: stands.slice(0, i % (stands.length + 1)).map((s) => ({
          sponsorId: s._id.toString(), sponsorName: s.sponsorName, stampedAt: haceDias(0, 11),
        })),
      })),
  );
}

async function sembrarVoluntarios() {
  await VolunteerSubmission.create(
    Array.from({ length: 12 }, (_, i) => {
      const firstName = NOMBRES[(i * 3 + 1) % NOMBRES.length]!;
      const lastName = APELLIDOS[(i * 7 + 3) % APELLIDOS.length]!;
      const aprobado = i % 2 === 0;
      return {
        firstName,
        lastName,
        email: `voluntario${i + 1}@example.com`,
        phone: `+57 300 000 ${String(1000 + i).slice(-4)}`,
        documentType: DOCUMENTOS[0]?.value ?? "CI",
        documentNumber: String(20_000_000 + i * 104729),
        role: ROLES[0]?.value ?? "student_university",
        entityType: ENTIDADES[0]?.value ?? "university",
        entityName: INSTITUCIONES[i % 3]!,
        availability: ["morning", "afternoon", "full"][i % 3]!,
        interestAreas: [["registration"], ["rooms", "tech"], ["social"], ["any"]][i % 4]!,
        previousExperience: ["none", "some", "lots"][i % 3]!,
        motivation: "Quiero aprender cómo se organiza un evento técnico y conocer a la comunidad.",
        shirtSize: ["s", "m", "l"][i % 3]!,
        emergencyName: "Contacto Demo",
        emergencyPhone: "+57 300 000 0000",
        consent: { codeOfConduct: haceDias(25), privacy: haceDias(25) },
        submittedAt: haceDias(28 - i),
        approved: aprobado,
        approvedAt: aprobado ? haceDias(14 - i) : null,
      };
    }),
  );
}

/**
 * Deja la base en memoria lista para probar: cuentas del panel, formularios
 * abiertos, speakers en cada etapa, agenda con salas, preguntas frecuentes,
 * asistentes con check-in, pasaportes con sellos y voluntarios. Sólo corre en
 * modo demo (`npm run demo`).
 */
export async function sembrarDemo(): Promise<void> {
  if (await User.exists({ email: DEMO_ADMIN.email })) return;

  const hash = await bcrypt.hash(DEMO_ADMIN.password, 10);
  await User.create([
    { email: DEMO_ADMIN.email, name: "Admin Demo", role: "admin", passwordHash: hash },
    { email: "organiza@example.com", name: "Organizadora Demo", role: "organizer", passwordHash: hash },
    { email: "puerta@example.com", name: "Voluntario Demo", role: "volunteer", passwordHash: hash },
  ]);

  for (const formType of ["attendee", "volunteer"] as const) {
    await Form.updateOne({ formType }, { $set: { isPublished: true, isOpen: true } }, { upsert: true });
  }

  const speakers = await sembrarSpeakers();
  await sembrarAgenda(speakers);
  await FAQ.create(FAQS.map((f, i) => ({ ...f, order: i, isActive: true })));
  await sembrarAsistentes();
  await sembrarVoluntarios();

  console.warn(`[demo] ${EVENTO.nombreCompleto}: datos de ejemplo sembrados.`);
  console.warn(`[demo] Panel: /admin/login → ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  console.warn("[demo] Pasaporte de ejemplo: /pasaporte/demo00000001 (PIN 1234) · PIN de stand: 4821");
}
