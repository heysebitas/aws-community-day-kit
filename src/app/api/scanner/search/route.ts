import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAnyAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { Registration, filtroDeBusqueda } from "@/models/registration";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

// Búsqueda de respaldo para los escáneres (salas / almuerzos / badges): busca
// pasaportes por nombre, apellido, empresa o cualquier dato del registro
// (p. ej. número de documento). Devuelve el shortId para registrar manualmente.
export const GET = ruta(async (req: NextRequest) => {
  await requireAnyAccess(["checkin", "escaner_checkin", "escaner_salas", "escaner_almuerzos", "escaner_badges"], "ver", ["admin", "organizer", "volunteer"]);

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const filtro = filtroDeBusqueda(q);
  if (!filtro) return NextResponse.json({ results: [] });

  await connectDB();
  // El documento y el correo viven en el registro: se buscan allí (con índice)
  // y se llega a los pasaportes por `linkedRegistrationId`.
  const regs = await Registration.find(filtro).select("_id").limit(25).lean();
  const ids = regs.map((r) => String(r._id));
  const passports = await Passport.find({ $or: [filtro, { linkedRegistrationId: { $in: ids } }] })
    .select("shortId firstName lastName role")
    .limit(25)
    .lean<{ shortId: string; firstName?: string; lastName?: string; role?: string }[]>();

  const results = passports.map((p) => ({
    shortId: p.shortId,
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    role: p.role ?? "attendee",
  }));

  return NextResponse.json({ results });
});
