import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { createLog } from "@/lib/log";
import { ruta } from "@/lib/api";
import { leerCuerpo, listaDeTextos } from "@/lib/cuerpo";

// Marca / desmarca pasaportes como impresos (lógica interna para ir sacando gente de la lista).
export const POST = ruta(async (req: NextRequest) => {
  const actor = await requireAccess("print", "editar", ["admin", "organizer", "volunteer"]);
  const { shortIds: crudo, printed } = await leerCuerpo(req);
  const shortIds = listaDeTextos(crudo);
  if (!shortIds || shortIds.length === 0) {
    return Response.json({ error: "shortIds requerido" }, { status: 400 });
  }
  await connectDB();
  const isPrinted = printed !== false;
  await Passport.updateMany(
    { shortId: { $in: shortIds } },
    isPrinted
      ? { $set: { badgePrinted: true, badgePrintedAt: new Date() } }
      : { $set: { badgePrinted: false, badgePrintedAt: null } },
  );

  // Auditoría: target = nombre si es una sola, o "N escarapelas" si son varias
  let target = `${shortIds.length} escarapelas`;
  if (shortIds.length === 1) {
    const p = await Passport.findOne({ shortId: shortIds[0] }).select("firstName lastName").lean<{ firstName?: string; lastName?: string } | null>();
    if (p) target = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || target;
  }
  await createLog({
    userId: String(actor._id), userName: actor.name, userRole: actor.role,
    action: "BADGE_PRINTED", target,
    details: isPrinted ? "Impresa" : "Desmarcada",
  });

  return Response.json({ ok: true, count: shortIds.length, printed: isPrinted });
});
