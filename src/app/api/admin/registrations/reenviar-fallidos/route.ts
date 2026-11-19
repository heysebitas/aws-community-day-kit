import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { resolverAudiencia } from "@/lib/audiencias-servidor";
import { conConcurrencia } from "@/lib/correo";
import { enviarCorreoRegistro } from "@/lib/registro-correo";
import { tomarCerrojo, soltarCerrojo } from "@/models/email-cerrojo";
import { Registration } from "@/models/registration";
import { createLog } from "@/lib/log";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Con un PDF por correo, 100 por llamada entran de sobra en `maxDuration`. */
const TOPE_POR_TANDA = 100;
const CONCURRENCIA = 2;
const PAUSA_MS = 1000;
const CADUCA_CERROJO_MS = 6 * 60_000;
const CERROJO = "registros:reenviar-fallidos";

/** La audiencia de siempre, con el filtro `emailStatus: failed`. */
const FALLIDOS = [{ publico: "asistentes" as const, filtros: { correo: ["failed"] } }];

/**
 * Reenvía el correo de confirmación a los registros con `emailStatus: failed`,
 * una tanda por llamada. Quien vuelve a fallar sigue en la lista, así que el
 * panel pasa `desde` (los que ya fallaron otra vez) para seguir con los demás.
 */
export const POST = ruta(async (request: NextRequest) => {
  const actor = await requireAccess("registrations", "editar", ["admin", "organizer"]);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const desde = Math.max(0, Math.trunc(Number(body.desde)) || 0);

  await connectDB();

  if (!(await tomarCerrojo(CERROJO, actor.name ?? "", CADUCA_CERROJO_MS))) {
    return Response.json({ error: "Ya se están reenviando los fallidos. Espera a que termine." }, { status: 409 });
  }
  try {
    const todos = await resolverAudiencia(FALLIDOS);
    const tanda = todos.slice(desde, desde + TOPE_POR_TANDA);

    await conConcurrencia(tanda, CONCURRENCIA, async (d) => {
      const reg = await Registration.findById(d.id).select("attendance").lean();
      if (!reg) return;
      await enviarCorreoRegistro(d.id, d.nombre, d.email, reg.attendance);
    }, PAUSA_MS);

    // Se vuelve a mirar en la base: así se sabe quién salió y quién falló otra vez.
    const ids = tanda.map((d) => d.id);
    const aunFallidos = new Set(
      (await Registration.find({ _id: { $in: ids }, emailStatus: "failed" }).select("_id").lean()).map((r) => String(r._id)),
    );
    const siguenFallidos = aunFallidos.size;
    const enviados = tanda.length - siguenFallidos;
    const restantes = Math.max(0, todos.length - desde - tanda.length);

    await createLog({
      userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
      action: "REGISTRATION_EMAIL_RESENT",
      target: `${tanda.length} registros`,
      details: `${enviados} enviados · ${siguenFallidos} siguen fallidos`,
    });

    return Response.json({
      ok: true, enviados, fallidos: siguenFallidos, restantes,
      totalFallidos: todos.length,
      /** Los de esta tanda que ya salieron, para que el panel los marque. */
      idsEnviados: ids.filter((id) => !aunFallidos.has(id)),
      siguiente: desde + siguenFallidos,
    });
  } finally {
    await soltarCerrojo(CERROJO).catch(() => {});
  }
}, { etiqueta: "[registros/reenviar-fallidos]" });
