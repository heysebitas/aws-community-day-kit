import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { createLog } from "@/lib/log";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

// Editar el nombre que va en el certificado (por si el form trae errores).
export const PATCH = ruta(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireAuth(["admin"]);
  const { id } = await params;
  const { certName } = await leerCuerpo(req);
  await connectDB();

  const doc = await VolunteerSubmission.findById(id);
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  doc.certName = String(certName ?? "").trim();
  await doc.save();

  await createLog({
    userId: String(actor._id), userName: actor.name, userRole: actor.role,
    action: "CERT_NAME_UPDATED", target: doc.certName || "(restaurado al del form)", targetId: id,
  });

  return NextResponse.json({ ok: true, certName: doc.certName });
});
