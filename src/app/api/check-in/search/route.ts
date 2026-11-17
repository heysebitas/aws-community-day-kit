import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAnyAccess } from "@/lib/auth";
import { Registration, filtroDeBusqueda } from "@/models/registration";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

// Búsqueda de respaldo para el check-in manual: busca por el inicio de una
// palabra del nombre, apellido, correo, documento o QR, con el índice `busqueda`.
export const GET = ruta(async (req: NextRequest) => {
  await requireAnyAccess(["checkin", "escaner_checkin"], "ver", ["admin", "organizer", "volunteer"]);

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const filtro = filtroDeBusqueda(q);
  if (!filtro) return NextResponse.json({ results: [] });

  await connectDB();
  const regs = await Registration.find(filtro)
    .select("firstName lastName email qrCode checkedIn checkedInAt confirmation")
    .limit(25)
    .lean();

  const results = regs.map((reg) => {
    const confirmed = !!reg.confirmation?.confirmed;
    return {
      id: String(reg._id),
      qrCode: reg.qrCode,
      name: `${reg.firstName} ${reg.lastName}`.trim() || reg.email || "Asistente",
      email: reg.email,
      checkedIn: !!reg.checkedIn,
      checkedInAt: reg.checkedInAt ?? null,
      confirmed,
      badgeName: confirmed
        ? [reg.confirmation?.badgeFirstName, reg.confirmation?.badgeLastName].filter(Boolean).join(" ").trim()
        : "",
    };
  });

  // Primero los que aún no han hecho check-in (los que falta atender)
  results.sort((a, b) => Number(a.checkedIn) - Number(b.checkedIn));

  return NextResponse.json({ results });
});
