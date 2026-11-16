import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAnyAccess } from "@/lib/auth";
import { Registration } from "@/models/registration";
import { createLog } from "@/lib/log";

// El total se cuenta de la base cada 30 s y entre tanto sube con cada escaneo
// propio: un conteo completo por escaneo es lo más caro de la puerta.
const TTL_TOTAL_MS = 30_000;
let total: { n: number; en: number } | null = null;

async function totalDentro(): Promise<number> {
  const ahora = Date.now();
  if (!total || ahora - total.en > TTL_TOTAL_MS) {
    total = { n: await Registration.countDocuments({ checkedIn: true }), en: ahora };
  } else {
    total.n += 1;
  }
  return total.n;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyAccess(["checkin", "escaner_checkin"], "editar");
    const { qrCode } = await request.json();

    if (!qrCode) {
      return Response.json({ error: "Código QR requerido" }, { status: 400 });
    }

    await connectDB();

    // Un solo escritor gana: el filtro exige que aún no esté dentro.
    const marcada = await Registration.findOneAndUpdate(
      { qrCode, checkedIn: { $ne: true } },
      { $set: { checkedIn: true, checkedInAt: new Date(), checkedInBy: user._id.toString() } },
      { returnDocument: "after" },
    );
    const registration = marcada ?? await Registration.findOne({ qrCode });
    if (!registration) {
      return Response.json({ error: "Registro no encontrado", status: "not_found" }, { status: 404 });
    }

    const name = `${registration.firstName} ${registration.lastName}`.trim()
      || registration.email
      || "Asistente";
    const email = registration.email;

    // La modalidad viaja en la respuesta porque quien está en la puerta no
    // tiene cómo saberla. Un registro del track online tiene código igual —es
    // la llave del registro, no una credencial— así que sin este dato el
    // escáner lo marcaba presente en silencio.
    const online = registration.attendance === "online";

    // Escarapela: lista solo si confirmó asistencia (confirmation.confirmed)
    const confirmed = !!registration.confirmation?.confirmed;
    const badgeName = confirmed
      ? [registration.confirmation?.badgeFirstName, registration.confirmation?.badgeLastName].filter(Boolean).join(" ").trim()
      : "";

    if (!marcada) {
      return Response.json({
        error: "Ya hizo check-in",
        status: "already_checked_in",
        name,
        email,
        online,
        confirmed,
        badgeName,
        checkedInAt: registration.checkedInAt,
      }, { status: 409 });
    }

    const totalCheckedIn = await totalDentro();

    await createLog({
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      action: "CHECK_IN",
      target: name,
      targetId: registration._id.toString(),
      details: [
        confirmed ? "Escarapela lista" : "Sin confirmar — imprimir escarapela",
        online ? "REGISTRO ONLINE" : null,
      ].filter(Boolean).join(" · "),
    });

    return Response.json({
      status: "success",
      name,
      email,
      online,
      confirmed,
      badgeName,
      checkedInAt: registration.checkedInAt,
      totalCheckedIn,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
