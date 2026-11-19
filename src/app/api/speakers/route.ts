import { NextRequest } from "next/server";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { Setting } from "@/models/setting";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { valoresDeLaPropuesta } from "@/lib/correo-propuesta";
import { armarCorreo } from "@/lib/email-plantillas";
import { SpeakerProfile, isProfileStatus } from "@/models/speaker-profile";
import { EVENTO } from "@/config";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";
import { buildSlugFromNames, parseSpeakerInput } from "@/lib/speaker-input";

export const dynamic = "force-dynamic";


async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (await SpeakerProfile.exists({ slug })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}


// ── GET — list submissions (admin) ───────────────────────────────────────────
export const GET = ruta(async (req: NextRequest) => {
  await requireAccess("speakers", "ver", ["admin", "organizer"]);

  await connectDB();
  const { searchParams } = req.nextUrl;
  // El status llega como texto libre de la query: se valida contra el enum del modelo antes de filtrar.
  const statusParam = searchParams.get("status");
  const filter =
    statusParam && statusParam !== "all" && isProfileStatus(statusParam)
      ? { status: statusParam }
      : {};

  const profiles = await SpeakerProfile.find(filter)
    .sort({ submittedAt: -1 })
    .lean();

  // Una fila por persona: el mismo documento trae el estado del trámite y sus
  // datos. Se arma acá y no en el navegador para que la tabla reciba campos
  // con nombre y tipo.
  const rows = profiles.map((p) => {
    return {
      id: String(p._id),
      slug: p.slug ?? "",
      status: p.status,
      speakerType: p.speakerType ?? null,
      approved: p.status === "accepted",
      approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : "",
      scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
      profileId: String(p._id),

      // El perfil público va en la misma respuesta: es el mismo documento.
      isPublic: p.isPublic ?? false,
      track: p.track ?? "general",
      sortOrder: p.sortOrder ?? 0,
      cardApproved: p.cardApproved ?? false,
      cardImageUrl: p.cardImageUrl ?? "",

      firstName: p?.firstName ?? "",
      lastName: p?.lastName ?? "",
      name: p?.name ?? "",
      email: p?.email ?? "",
      phone: p?.phone ?? "",
      countryCity: p?.countryCity ?? "",
      role: p?.role ?? "",
      tagline: p?.tagline ?? "",
      company: p?.company ?? "",
      companyLogo: p?.companyLogo ?? "",
      bio: p?.bio ?? "",
      photo: p?.photo ?? "",
      firstTimeSpeaker: p?.firstTimeSpeaker ?? false,

      talkTitle: p?.talkTitle ?? "",
      talkAbstract: p?.talkAbstract ?? "",
      sessionType: p?.sessionType ?? "",
      preRecordingDate: p?.preRecordingDate ?? "",
      audienceLevel: p?.audienceLevel ?? "",
      language: p?.language ?? "",
      requirements: p?.requirements ?? "",

      social: {
        builderCenter: p?.social?.builderCenter ?? "",
        linkedin: p?.social?.linkedin ?? "",
        twitter: p?.social?.twitter ?? "",
        github: p?.social?.github ?? "",
        instagram: p?.social?.instagram ?? "",
        website: p?.social?.website ?? "",
        blog: p?.social?.blog ?? "",
        facebook: p?.social?.facebook ?? "",
      },
      coSpeakers: (p?.coSpeakers ?? []).map((c) => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email ?? "",
        role: c.role ?? "",
        company: c.company ?? "",
        // La ficha grande enseña la cara de los acompañantes, no sólo su nombre.
        photo: c.photo ?? "",
        tagline: c.tagline ?? "",
        countryCity: c.countryCity ?? "",
      })),
    };
  });

  return Response.json({ submissions: rows });
});

// ── POST — new submission (public) ───────────────────────────────────────────
export const POST = ruta(async (request: NextRequest) => {
  try {
    // El Call for Speakers cierra solo cuando pasa EVENTO.cfpCierre. Se comprueba
    // aca y no solo en el cliente: si dependiera del boton de la interfaz, una
    // peticion hecha a mano seguiria entrando despues del cierre anunciado.
    if (Date.now() > new Date(EVENTO.cfpCierre).getTime()) {
      return Response.json({ error: "La convocatoria de speakers está cerrada." }, { status: 403 });
    }

    const limite = rateLimit(`postulacion:${getIp(request)}`, 40, 60 * 60 * 1000);
    if (!limite.ok) {
      return Response.json({ error: "Demasiadas postulaciones seguidas. Intenta más tarde." }, { status: 429 });
    }

    await connectDB();

    const body = await leerCuerpo(request);

    // Captcha verification
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return Response.json({ error: "Captcha inválido. Por favor intenta de nuevo." }, { status: 400 });
    }

    const parsed = parseSpeakerInput(body);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const {
      firstName, lastName, email, tagline, bio, photo,
      talkTitle, talkAbstract, sessionType, preRecordingDate, audienceLevel, language,
      requirements, countryCity, phone, firstTimeSpeaker,
      coSpeakers, social, track,
    } = parsed.value;

    await connectDB();

    // ¿Se puede postular más de una vez con el mismo correo?
    const ajuste = await Setting.findOne({ key: "speaker_multi_submit" }).lean();
    const variasPorCorreo = ajuste?.value !== "0";

    if (!variasPorCorreo) {
      // Se busca en el perfil, que es donde vive el correo desde que la
      // postulación guarda sólo el estado.
      const dup = await SpeakerProfile.findOne({ email });
      if (dup) {
        return Response.json(
          { error: "Ya tienes una postulación enviada con este correo" },
          { status: 409 },
        );
      }
    }


    // Un documento por persona: el perfil guarda tanto los datos como el estado del trámite.
    const baseSlug = buildSlugFromNames(firstName, lastName, coSpeakers);
    const slug = await uniqueSlug(baseSlug);

    const profile = await SpeakerProfile.create({
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      slug,
      role: tagline,
      tagline,
      bio,
      photo,
      talkTitle,
      talkAbstract,
      sessionType,
      preRecordingDate,
      audienceLevel,
      language,
      requirements,
      countryCity,
      phone,
      firstTimeSpeaker,
      coSpeakers,
      social,
      track,
      status: "submitted",
      isPublic: false,
      submittedAt: new Date(),
      metadata: {
        ip: getIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    // Acuse de recibo con copia de lo enviado.
    try {
      // Todo sale de la plantilla editable; lo enviado entra como variables.
      const correo = await armarCorreo(
        "speaker_postulacion",
        {
          nombre: firstName,
          nombreCompleto: `${firstName} ${lastName}`,
          correo: email,
          ...valoresDeLaPropuesta({
            talkTitle, talkAbstract, sessionType, audienceLevel, language, track,
            countryCity, tagline, requirements,
            coSpeakerNames: coSpeakers.map((c) => `${c.firstName} ${c.lastName}`.trim()).filter(Boolean),
          }),
        },
        [sessionType === "online" ? "online" : "presencial"],
      );
      if (!correo) throw new Error("plantilla speaker_postulacion no disponible");

      await sendEmail({
        from: EMAIL_FROM,
        to: email,
        subject: correo.asunto,
        html: correo.html,
      });
    } catch (mailErr) {
      console.error("[POST /api/speakers] acuse de recibo", mailErr);
    }

    return Response.json({ id: profile._id, slug: profile.slug }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/speakers]", err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "speakers POST" });
