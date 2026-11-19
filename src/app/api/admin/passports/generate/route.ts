import { nuevoShortId } from "@/lib/identidad";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { roleLabelOf } from "@/data/attendee-form";
import { Registration } from "@/models/registration";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { SpeakerProfile } from "@/models/speaker-profile";
import { User } from "@/models/user";

type GenerateRole = "attendee" | "speaker" | "volunteer" | "organizer";

import { nuevoPin as generatePin } from "@/lib/pin";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

/** Personas por `bulkWrite`: cada una lleva dos operaciones (alta y PIN). */
const LOTE = 500;

type Item = {
  filtro: Record<string, unknown>;
  alta: Record<string, unknown>;
  campos: Record<string, unknown>;
};

/** Un `bulkWrite` por lote en vez de dos `updateOne` por persona. */
async function volcar(items: Item[]) {
  let created = 0, skipped = 0, failed = 0;
  for (let i = 0; i < items.length; i += LOTE) {
    const lote = items.slice(i, i + LOTE);
    const ops = lote.flatMap((it) => [
      { updateOne: { filter: it.filtro, update: { $setOnInsert: { ...it.alta, viewPin: generatePin() }, $set: it.campos }, upsert: true } },
      // A los pasaportes que ya existían sin PIN se les asigna uno.
      { updateOne: { filter: { ...it.filtro, viewPin: { $in: [null, undefined, ""] } }, update: { $set: { viewPin: generatePin() } } } },
    ]);
    let nuevos = 0;
    const malas = new Set<number>();
    try {
      const r = await Passport.bulkWrite(ops as never, { ordered: false });
      nuevos = r.upsertedCount;
    } catch (e) {
      const err = e as { result?: { upsertedCount?: number }; writeErrors?: { index?: number; err?: { index?: number } }[] };
      nuevos = err.result?.upsertedCount ?? 0;
      for (const w of err.writeErrors ?? []) malas.add(Math.floor((w.index ?? w.err?.index ?? 0) / 2));
      if (!malas.size) malas.add(-1);
    }
    const fallidos = malas.has(-1) ? lote.length - nuevos : malas.size;
    failed += fallidos;
    created += nuevos;
    skipped += Math.max(0, lote.length - nuevos - fallidos);
  }
  return { created, skipped, failed };
}

export const POST = ruta(async (req: NextRequest) => {
  await requireAuth(["admin"]);
  const { role } = await leerCuerpo(req);

  await connectDB();

  const items: Item[] = [];
  let fallidosAMano = 0;
  const parteNombre = (n?: string) => {
    const parts = (n || "").trim().split(" ");
    return { firstName: parts[0] || "Sin", lastName: parts.slice(1).join(" ") || "Nombre" };
  };

  if (role === "attendee") {
    const regs = await Registration.find({}).lean();
    // Un pasaporte hecho a mano para esa persona no se pisa: se cuenta como fallido.
    const aMano = new Set(
      (await Passport.find({ isManual: true, linkedRegistrationId: { $in: regs.map((r) => r._id.toString()) } }).select("linkedRegistrationId").lean())
        .map((p) => String(p.linkedRegistrationId)),
    );
    for (const reg of regs) {
      if (aMano.has(reg._id.toString())) { fallidosAMano++; continue; }
      items.push({
        filtro: { linkedRegistrationId: reg._id.toString(), isManual: { $ne: true } },
        alta: { shortId: nuevoShortId(), role: "attendee", linkedRegistrationId: reg._id.toString(), isManual: false },
        campos: {
          firstName: reg.firstName || "Sin",
          lastName: reg.lastName || "Nombre",
          company: reg.entityName ?? undefined,
          jobTitle: roleLabelOf(reg.role, reg.roleOther) || undefined,
        },
      });
    }
  }

  if (role === "volunteer") {
    const { nanoid } = await import("nanoid");
    const volunteers = await VolunteerSubmission.find({ approved: true }).lean();
    for (const vol of volunteers) {
      // El SBG describe mejor de dónde viene un voluntario que la entidad,
      // que muchas veces es la misma universidad del grupo.
      const company = (vol.sbg && vol.sbg !== "none" ? vol.sbg : vol.entityName) || undefined;
      const id = vol._id.toString();
      items.push({
        filtro: { linkedRegistrationId: id, role: "volunteer" },
        alta: { shortId: nanoid(8), role: "volunteer", linkedRegistrationId: id, isManual: false },
        campos: { firstName: vol.firstName?.trim() || "Sin", lastName: vol.lastName?.trim() || "Nombre", company },
      });
    }
  }

  if (role === "speaker") {
    const { nanoid } = await import("nanoid");
    const speakers = await SpeakerProfile.find({
      status: { $in: ["accepted", "scheduled"] },
      sessionType: "in-person",
    }).lean();
    for (const sp of speakers) {
      const id = sp._id.toString();
      items.push({
        filtro: { linkedRegistrationId: id, role: "speaker" },
        alta: { shortId: nanoid(8), role: "speaker", linkedRegistrationId: id, isManual: false },
        campos: { ...parteNombre(sp.name), company: sp.company || undefined, jobTitle: sp.role || sp.tagline || undefined },
      });
    }
  }

  if (role === "organizer") {
    const { nanoid } = await import("nanoid");
    const users = await User.find({ role: { $in: ["admin", "organizer"] } }).lean();
    for (const u of users) {
      const id = u._id.toString();
      items.push({
        filtro: { linkedRegistrationId: id, role: "organizer" },
        alta: { shortId: nanoid(8), role: "organizer", linkedRegistrationId: id, isManual: false },
        campos: parteNombre(u.name),
      });
    }
  }

  const { created, skipped, failed } = await volcar(items);

  return Response.json({ ok: true, created, skipped, failed: failed + fallidosAMano });
});
