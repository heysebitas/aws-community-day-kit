import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Registration } from "@/models/registration";
import { SpeakerProfile } from "@/models/speaker-profile";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { User } from "@/models/user";

const ONLINE_MODES = ["online", "virtual"];
const CONFIRMED_PROFILE_STATUSES = ["accepted", "scheduled"];

export async function GET() {
  try {
    await requireAuth(["admin", "organizer"]);
    await connectDB();

    const porDia = (campo: string) => [
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: campo } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 as const } },
    ];
    const contar = (filtro: Record<string, unknown>) => [{ $match: filtro }, { $count: "n" }];

    // Una agregación con $facet por colección: los totales y las series salen de un solo recorrido.
    const [[reg], [spk], [vol], teamAgg] = await Promise.all([
      Registration.aggregate([{ $facet: {
        total: [{ $count: "n" }],
        confirmadas: contar({ "confirmation.confirmed": true }),
        dentro: contar({ checkedIn: true }),
        enviados: contar({ emailStatus: "sent" }),
        fallidos: contar({ emailStatus: "failed" }),
        pendientes: contar({ emailStatus: "pending" }),
        porDia: porDia("$createdAt"),
        checkInsPorDia: [{ $match: { checkedIn: true, checkedInAt: { $ne: null } } }, ...porDia("$checkedInAt")],
      } }]),
      SpeakerProfile.aggregate([{ $facet: {
        total: [{ $count: "n" }],
        porDia: porDia("$submittedAt"),
        estados: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        // Speakers confirmados por modalidad, contando personas (principal + co-speakers)
        modalidad: [
          { $match: { status: { $in: CONFIRMED_PROFILE_STATUSES } } },
          {
            $group: {
              _id: { $cond: [{ $in: ["$sessionType", ONLINE_MODES] }, "online", "presencial"] },
              profiles: { $sum: 1 },
              people: { $sum: { $add: [1, { $size: { $ifNull: ["$coSpeakers", []] } }] } },
            },
          },
        ],
      } }]),
      VolunteerSubmission.aggregate([{ $facet: {
        total: [{ $count: "n" }],
        aprobados: contar({ approved: true }),
        porDia: porDia("$submittedAt"),
        // `none` es "no pertenezco a ninguno": cuenta como sin grupo.
        grupos: [
          { $match: { sbg: { $nin: [null, "", "none"] } } },
          { $group: { _id: "$sbg", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
      } }]),
      // Team members in the users collection by role
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    ]);

    type Fila = { _id: string; count: number; profiles?: number; people?: number };
    const n = (f?: { n: number }[]) => f?.[0]?.n ?? 0;
    const totalRegistrations = n(reg.total);
    const registrationsConfirmed = n(reg.confirmadas);
    const totalCheckedIn = n(reg.dentro);
    const emailsSent = n(reg.enviados);
    const emailsFailed = n(reg.fallidos);
    const emailsPending = n(reg.pendientes);
    const registrationsByDay: Fila[] = reg.porDia;
    const checkInsByDay: Fila[] = reg.checkInsPorDia;
    const totalSpeakers = n(spk.total);
    const speakersByDay: Fila[] = spk.porDia;
    const speakerStatusAgg: Fila[] = spk.estados;
    const speakerModalityAgg: Fila[] = spk.modalidad;
    const totalVolunteers = n(vol.total);
    const volunteersApproved = n(vol.aprobados);
    const volunteersByDay: Fila[] = vol.porDia;
    const cloudClubBreakdown: Fila[] = vol.grupos;

    // ── Speaker status funnel ──
    const statusMap: Record<string, number> = {};
    for (const s of speakerStatusAgg) statusMap[s._id ?? "unknown"] = s.count;
    const speakerFunnel = {
      submitted: statusMap.submitted ?? 0,
      reviewing: statusMap.reviewing ?? 0,
      accepted: statusMap.accepted ?? 0,
      waitlisted: statusMap.waitlisted ?? 0,
      rejected: statusMap.rejected ?? 0,
    };

    // ── Speaker modality (accepted only) ──
    const modPresencial = speakerModalityAgg.find((m) => m._id === "presencial");
    const modOnline = speakerModalityAgg.find((m) => m._id === "online");
    const speakersPresencialProfiles = modPresencial?.profiles ?? 0;
    const speakersPresencialPeople = modPresencial?.people ?? 0;
    const speakersOnlineProfiles = modOnline?.profiles ?? 0;
    const speakersOnlinePeople = modOnline?.people ?? 0;

    // ── Team breakdown ──
    const teamMap: Record<string, number> = {};
    for (const t of teamAgg) teamMap[t._id ?? "unknown"] = t.count;
    const team = {
      admin: teamMap.admin ?? 0,
      organizer: teamMap.organizer ?? 0,
      volunteer: teamMap.volunteer ?? 0,
      total: (teamMap.admin ?? 0) + (teamMap.organizer ?? 0) + (teamMap.volunteer ?? 0),
    };

    // ── Total expected headcount — registrations + presencial speakers + volunteers + team.
    // Registrations are included but don't guarantee attendance (flagged separately in the UI).
    const confirmedTotal =
      totalRegistrations +
      speakersPresencialPeople +
      volunteersApproved +
      team.total;

    return Response.json({
      // Existing totals
      totalRegistrations,
      registrationsConfirmed,
      totalSpeakers,
      totalVolunteers,
      totalCheckedIn,
      checkInRate: totalRegistrations > 0 ? Math.round((totalCheckedIn / totalRegistrations) * 100) : 0,
      emailsSent,
      emailsFailed,
      emailsPending,
      registrationsByDay: registrationsByDay.map((d) => ({ date: d._id, count: d.count })),
      speakersByDay: speakersByDay.map((d) => ({ date: d._id, count: d.count })),
      volunteersByDay: volunteersByDay.map((d) => ({ date: d._id, count: d.count })),
      checkInsByDay: checkInsByDay.map((d) => ({ date: d._id, count: d.count })),
      cloudClubBreakdown: cloudClubBreakdown.map((d) => ({ club: d._id, count: d.count })),

      // ── New: confirmed headcount — excludes registrations ──
      confirmed: {
        total: confirmedTotal,
        speakersPresencial: speakersPresencialPeople,
        volunteersApproved,
        team: team.total,
        // Registered attendees: expected audience, NOT guaranteed (kept separate)
        registrations: totalRegistrations,
      },

      // ── New: detailed breakdowns ──
      speakerFunnel,
      speakerModality: {
        presencialProfiles: speakersPresencialProfiles,
        presencialPeople: speakersPresencialPeople,
        onlineProfiles: speakersOnlineProfiles,
        onlinePeople: speakersOnlinePeople,
      },
      volunteerFunnel: {
        approved: volunteersApproved,
        pending: Math.max(0, totalVolunteers - volunteersApproved),
        total: totalVolunteers,
      },
      team,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
