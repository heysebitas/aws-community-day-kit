import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { subirTarjetaDeSpeaker } from "@/lib/speaker-card";
import { createLog } from "@/lib/log";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";


export const POST = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const user = await requireAuth(["admin"]);
  await connectDB();

  const { slug } = await params;
  const profile = await SpeakerProfile.findOne({ slug });
  if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });

  // El mismo ayudante que usa la aprobación: un solo sitio que sabe dibujar
  // y subir, para que el botón del editor y el correo produzcan lo mismo.
  const cardImageUrl = await subirTarjetaDeSpeaker(slug);
  if (!cardImageUrl) return Response.json({ error: "Error al generar imagen" }, { status: 500 });

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "SPEAKER_CARD_APPROVED",
    target: profile.name,
    targetId: profile._id.toString(),
    details: cardImageUrl,
  });

  return Response.json({ cardImageUrl });
});

export const DELETE = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const user = await requireAuth(["admin"]);
  await connectDB();

  const { slug } = await params;
  const profile = await SpeakerProfile.findOneAndUpdate(
    { slug },
    { cardApproved: false, cardImageUrl: "" },
    { returnDocument: "after" },
  );
  if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "SPEAKER_CARD_RESET",
    target: profile.name,
    targetId: profile._id.toString(),
  });

  return Response.json({ ok: true });
});
