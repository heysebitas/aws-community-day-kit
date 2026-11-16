import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { EmailTemplate } from "@/models/email-template";
import { sembrarPlantillas } from "@/lib/email-plantillas";
import { sanearBloques, nuevoId } from "@/emails/bloques";
import { createLog } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Las plantillas de correo. */
export async function GET() {
  try {
    await requireAccess("correos", "ver", ["admin", "organizer"]);
    await connectDB();
    // Se siembran al entrar, para que la sección nunca aparezca vacía en una
    // instalación nueva ni haya que acordarse de correr un script.
    await sembrarPlantillas();

    const plantillas = await EmailTemplate.find({})
      .sort({ deSistema: -1, nombre: 1 })
      .lean();

    return Response.json({ plantillas });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    return Response.json({ error: msg }, { status: 403 });
  }
}

/** Crea una plantilla nueva, en blanco o copiando otra. */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireAccess("correos", "editar", ["admin", "organizer"]);
    await connectDB();

    const { nombre, copiarDe } = (await request.json()) as {
      nombre?: unknown; copiarDe?: unknown;
    };
    const titulo = typeof nombre === "string" ? nombre.trim().slice(0, 120) : "";
    if (!titulo) return Response.json({ error: "Falta el nombre" }, { status: 400 });

    // El slug sale del nombre. Si ya existe se le añade un número: dos
    // plantillas con el mismo slug romperían la búsqueda por clave.
    const base = titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plantilla";
    let slug = base;
    for (let i = 2; await EmailTemplate.exists({ slug }); i++) slug = `${base}-${i}`;

    const origen = typeof copiarDe === "string" && copiarDe
      ? await EmailTemplate.findOne({ slug: copiarDe }).lean()
      : null;

    const plantilla = await EmailTemplate.create({
      slug,
      nombre: titulo,
      descripcion: origen ? `Copia de ${origen.nombre}` : "",
      asunto: origen?.asunto ?? titulo,
      preview: origen?.preview ?? "",
      // Los ids se renuevan: si se copiaran, mover un bloque en la copia
      // confundiría a React con los de la original abierta en otra pestaña.
      bloques: origen
        ? sanearBloques(origen.bloques).map((b) => ({ ...b, id: nuevoId() }))
        : [
            { id: nuevoId(), tipo: "titulo", texto: "{nombre}, hola." },
            { id: nuevoId(), tipo: "parrafo", texto: "Escribe acá el texto." },
          ],
      deSistema: false,
      audiencia: null,
      activa: true,
      actualizadaPor: actor.name,
    });

    await createLog({
      userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
      action: "EMAIL_TEMPLATE_CREATED", target: titulo, targetId: plantilla._id.toString(),
      details: origen ? `copia de ${origen.slug}` : "en blanco",
    });

    return Response.json({ plantilla });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
