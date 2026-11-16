import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess, requireDelete } from "@/lib/auth";
import { EmailTemplate } from "@/models/email-template";
import { semillaDe } from "@/lib/email-plantillas";
import { sanearBloques } from "@/emails/bloques";
import { sanearAudiencia } from "@/lib/audiencias";
import { createLog } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireAccess("correos", "ver", ["admin", "organizer"]);
    await connectDB();
    const { slug } = await params;
    const plantilla = await EmailTemplate.findOne({ slug }).lean();
    if (!plantilla) return Response.json({ error: "No encontrada" }, { status: 404 });
    return Response.json({ plantilla });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    return Response.json({ error: msg }, { status: 403 });
  }
}

/** Guarda los cambios. Los bloques se sanean: vienen del navegador. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const actor = await requireAccess("correos", "editar", ["admin", "organizer"]);
    await connectDB();

    const { slug } = await params;
    const plantilla = await EmailTemplate.findOne({ slug });
    if (!plantilla) return Response.json({ error: "No encontrada" }, { status: 404 });

    const body = await request.json();

    /** Una plantilla bloqueada sólo se puede encender y apagar. */
    if (plantilla.bloqueada) {
      const soloActiva = Object.keys(body).every((k) => k === "activa");
      if (!soloActiva) {
        return Response.json(
          {
            error:
              "Esta plantilla está bloqueada: su contenido viene del código. " +
              "Para cambiarla hay que editarla en el repositorio.",
          },
          { status: 409 },
        );
      }
      if (typeof body.activa === "boolean") {
        plantilla.activa = body.activa;
        plantilla.actualizadaPor = actor.name;
        await plantilla.save();
      }
      return Response.json({ ok: true, plantilla });
    }

    const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

    const nombre = texto(body.nombre, 120);
    const asunto = texto(body.asunto, 200);

    // El nombre de una plantilla de sistema no se toca: la lista se lee por él
    // y quien busque «Speaker aceptado» tiene que encontrarlo.
    if (nombre && !plantilla.deSistema) plantilla.nombre = nombre;
    if (asunto) plantilla.asunto = asunto;

    const descripcion = texto(body.descripcion, 300);
    if (descripcion !== undefined) plantilla.descripcion = descripcion;
    const preview = texto(body.preview, 200);
    if (preview !== undefined) plantilla.preview = preview;

    if (body.bloques !== undefined) plantilla.bloques = sanearBloques(body.bloques);
    // La audiencia se sanea contra el catálogo: un público o un filtro
    // inventado no daría error al enviar, daría cero destinatarios, y eso se
    // lee como «no hay nadie» en vez de como un fallo.
    /** Una plantilla de sistema no lleva audiencia. */
    if (body.audiencia !== undefined && !plantilla.deSistema) {
      const limpia = sanearAudiencia(body.audiencia);
      plantilla.audiencia = limpia.length ? limpia : null;
    }
    // Una plantilla de sistema no se puede desactivar: dejaría al código sin
    // nada que enviar justo cuando pasa lo que la dispara.
    if (typeof body.activa === "boolean" && !plantilla.deSistema) plantilla.activa = body.activa;

    plantilla.actualizadaPor = actor.name;
    await plantilla.save();

    await createLog({
      userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
      action: "EMAIL_TEMPLATE_UPDATED", target: plantilla.nombre, targetId: plantilla._id.toString(),
      details: `${plantilla.bloques.length} bloques`,
    });

    return Response.json({ plantilla });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

/** Borra una plantilla, o devuelve una de sistema a su texto de fábrica. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    /**
     * Para una plantilla de sistema esto no borra: restaura el texto de
     * fábrica, que es una edición. Para una propia sí borra, y eso pide la
     * casilla de borrar aparte. Por eso el permiso se comprueba después de
     * saber cuál de las dos es.
     */
    const actor = await requireAccess("correos", "editar", ["admin", "organizer"]);
    await connectDB();

    const { slug } = await params;
    const plantilla = await EmailTemplate.findOne({ slug });
    if (!plantilla) return Response.json({ error: "No encontrada" }, { status: 404 });

    if (!plantilla.deSistema) await requireDelete("correos", ["admin", "organizer"]);

    if (plantilla.deSistema) {
      const semilla = semillaDe(slug);
      if (!semilla) return Response.json({ error: "Sin texto de fábrica" }, { status: 400 });

      plantilla.asunto = semilla.asunto;
      plantilla.preview = semilla.preview;
      plantilla.bloques = semilla.bloques;
      plantilla.actualizadaPor = actor.name;
      await plantilla.save();

      await createLog({
        userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
        action: "EMAIL_TEMPLATE_RESET", target: plantilla.nombre, targetId: plantilla._id.toString(),
      });

      return Response.json({ restaurada: true, plantilla });
    }

    await EmailTemplate.deleteOne({ _id: plantilla._id });
    await createLog({
      userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
      action: "EMAIL_TEMPLATE_DELETED", target: plantilla.nombre, targetId: plantilla._id.toString(),
    });

    return Response.json({ borrada: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
