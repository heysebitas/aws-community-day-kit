import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { deleteObject, keyDeUrl, S3_PUBLIC_URL } from "@/lib/s3";
import { createLog } from "@/lib/log";

/** Reemplaza la foto de un speaker. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const actor = await requireAccess("speakers", "editar", ["admin", "organizer"]);
    const { slug } = await params;
    const { photo } = (await request.json()) as { photo?: unknown };

    if (typeof photo !== "string" || !photo.trim()) {
      return Response.json({ error: "Falta la foto" }, { status: 400 });
    }
    // Sólo se aceptan fotos ya subidas a nuestro bucket: la URL la devuelve
    // /api/upload/presign, así que cualquier otra cosa es un error de llamada.
    if (!photo.startsWith(`${S3_PUBLIC_URL}/`)) {
      return Response.json({ error: "La foto debe venir de una subida nuestra" }, { status: 400 });
    }

    await connectDB();
    const profile = await SpeakerProfile.findOne({ slug });
    if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });

    const anterior = profile.photo ?? "";
    if (anterior === photo) return Response.json({ ok: true, photo, sinCambios: true });

    profile.photo = photo;
    profile.cardApproved = false;
    profile.cardImageUrl = "";
    // El encuadre era de la foto anterior: se vuelve al centro.
    profile.cardPhotoX = 50;
    profile.cardPhotoY = 50;
    profile.cardPhotoZoom = 1;
    await profile.save();

    let borrada = false;
    const key = keyDeUrl(anterior);
    if (key) {
      try {
        await deleteObject(key);
        borrada = true;
      } catch {
        // Queda huérfana, pero el cambio ya está hecho y es lo que importa.
      }
    }

    await createLog({
      userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
      action: "SPEAKER_PHOTO_REPLACED", target: profile.name, targetId: profile._id.toString(),
      details: borrada ? "anterior borrada del bucket" : "anterior no era nuestra o no se pudo borrar",
    });

    return Response.json({ ok: true, photo, anteriorBorrada: borrada });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
