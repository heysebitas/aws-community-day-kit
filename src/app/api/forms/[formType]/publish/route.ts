import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, requireAccess } from "@/lib/auth";
import type { SeccionId } from "@/lib/permisos";
import { Form, isFormType } from "@/models/form";
import { createLog } from "@/lib/log";
import { revalidateTag } from "next/cache";
import { EVENT_CONFIG_TAG } from "@/lib/data/event-config";
import { ruta } from "@/lib/api";

export const PATCH = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ formType: string }> },
) => {
  const { formType } = await params;
  const { isPublished, isOpen } = await request.json();

  if (!isFormType(formType)) {
    return Response.json({ error: "Tipo de formulario inválido" }, { status: 400 });
  }

  // Abrir y cerrar un formulario es de la sección a la que alimenta: el de
  // asistentes se toca desde Asistentes, el de voluntarios desde Voluntarios.
  // (El de speakers no llega acá: esa convocatoria la cierra su fecha.)
  const SECCION: Record<string, SeccionId> = {
    attendee: "registrations",
    volunteer: "volunteers",
    speaker: "speakers",
  };
  const seccion = SECCION[formType];
  const actor = seccion
    ? await requireAccess(seccion, "editar", ["admin", "organizer"])
    : await requireAuth(["admin"]);

  await connectDB();

  const update: Record<string, boolean> = {};
  if (isPublished !== undefined) update.isPublished = isPublished;
  if (isOpen !== undefined) update.isOpen = isOpen;

  const form = await Form.findOneAndUpdate({ formType }, update, { returnDocument: "after" });

  if (!form) {
    return Response.json({ error: "Formulario no encontrado" }, { status: 404 });
  }

  // La portada lee el estado de los formularios desde la config pública, que
  // está cacheada cinco minutos. Sin esto, cerrar el registro dejaba el botón
  // «Regístrate ahora» encendido en el sitio durante ese rato.
  revalidateTag(EVENT_CONFIG_TAG, { expire: 0 });

  const action = isPublished !== undefined
    ? (isPublished ? "FORM_PUBLISHED" : "FORM_CLOSED")
    : (isOpen ? "FORM_PUBLISHED" : "FORM_CLOSED");

  await createLog({
    userId: actor._id.toString(),
    userName: actor.name,
    userRole: actor.role,
    action,
    target: `Form ${formType}`,
  });

  return Response.json({ form });
});
