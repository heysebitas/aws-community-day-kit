import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { EmailTemplate } from "@/models/email-template";
import { EmailCampana } from "@/models/email-campana";
import { EmailEnvio } from "@/models/email-envio";
import { Registration } from "@/models/registration";
import { SpeakerProfile } from "@/models/speaker-profile";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { User } from "@/models/user";
import { sanearAudiencia, resumenAudiencia, type Publico } from "@/lib/audiencias";
import { resolverAudiencia, CAMPO_ENVIADOS, type Destinatario } from "@/lib/audiencias-servidor";
import { armarDesdePlantilla, valoresDelEvento } from "@/lib/email-plantillas";
import { aplicarVariables, variablesUsadas, type Bloque } from "@/emails/bloques";
import { anadirEncuesta, anadirPasaporte, quitarQuienRespondio } from "@/lib/audiencias-extras";
import { enlacesActuales } from "@/lib/enlaces";
import { SurveyRecipient } from "@/models/survey-recipient";
import QRCode from "qrcode";
import { sendEmailBatchDetallado, MARKETING_EMAIL_FROM, type SendEmailOptions } from "@/lib/correo";
import { createLog } from "@/lib/log";
import { SLUG } from "@/config";

export const dynamic = "force-dynamic";
// Armar y mandar cuatrocientos correos no entra en los 15 s por defecto.
export const maxDuration = 300;

/** Mandar una plantilla a una audiencia. */

/** Cuántos por llamada. */
const TOPE_POR_TANDA = 300;

/** Dónde se anota, por público, que alguien ya recibió esta plantilla. */
interface Marcable {
  updateMany(filtro: Record<string, unknown>, cambio: Record<string, unknown>): unknown;
}

const MODELOS: Record<Publico, Marcable> = {
  asistentes: Registration,
  speakers: SpeakerProfile,
  voluntarios: VolunteerSubmission,
  equipo: User,
};

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAccess("correos", "editar", ["admin", "organizer"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const slug = typeof body.plantilla === "string" ? body.plantilla : "";
    if (!slug) return Response.json({ error: "Falta la plantilla" }, { status: 400 });

    await connectDB();

    const plantilla = await EmailTemplate.findOne({ slug }).lean();
    if (!plantilla) return Response.json({ error: "No existe esa plantilla" }, { status: 404 });
    if (!plantilla.activa) {
      return Response.json({ error: "La plantilla está desactivada" }, { status: 400 });
    }

    // ── Prueba ───────────────────────────────────────────────────────────────
    // Una copia a una dirección, con valores de quien la pide. No cuenta como
    // campaña: mandarse una prueba no puede gastar el «ya lo recibió» de nadie.
    if (body.prueba === true || (typeof body.pruebaA === "string" && body.pruebaA.trim())) {
      /** Sin dirección, la prueba va a la cuenta de quien la pide. */
      const destino = typeof body.pruebaA === "string" && body.pruebaA.trim()
        ? body.pruebaA.trim()
        : (actor.email as string);
      if (!destino) return Response.json({ error: "Tu cuenta no tiene correo" }, { status: 400 });
      // Con los enlaces de verdad: una prueba que no los lleve no sirve para
      // comprobar justo lo que se quiere comprobar antes de mandar.
      const { variables: deEnlacesPrueba } = await enlacesActuales();
      const correo = await armarDesdePlantilla(
        plantilla,
        {
          ...deEnlacesPrueba,
          nombre: actor.name?.split(" ")[0] ?? "",
          nombreCompleto: actor.name ?? "",
          correo: destino,
          charla: "Título de ejemplo de una charla",
          modalidad: "Presencial",
        },
        ["presencial", "nacional"],
      );
      const [res] = await sendEmailBatchDetallado([{
        from: MARKETING_EMAIL_FROM,
        to: destino,
        subject: `[PRUEBA] ${correo.asunto}`,
        html: correo.html,
      }]);
      if (res?.error) return Response.json({ error: `No salió: ${res.error}` }, { status: 502 });
      return Response.json({ prueba: true, a: destino });
    }

    // ── Envío de verdad ──────────────────────────────────────────────────────
    /** Las plantillas de sistema no se mandan a una audiencia. */
    if (plantilla.deSistema) {
      return Response.json({
        error: "Esta plantilla la manda el sistema sola, a una persona a la vez. " +
               "Para escribirle a un grupo, crea una plantilla nueva.",
      }, { status: 400 });
    }

    const audiencia = sanearAudiencia(body.audiencia ?? plantilla.audiencia);
    if (!audiencia.length) {
      return Response.json({ error: "Esta plantilla no tiene audiencia" }, { status: 400 });
    }

    const evitarRepetidos = body.evitarRepetidos !== false;
    const totalEsperado = Number(body.totalEsperado);
    if (!Number.isInteger(totalEsperado) || totalEsperado < 0) {
      return Response.json({ error: "Falta totalEsperado" }, { status: 400 });
    }

    let todos = await resolverAudiencia(audiencia, {
      campana: evitarRepetidos ? slug : undefined,
    });

    /** Quién ya respondió la encuesta queda fuera. */
    if (body.excluirRespondidos === true) {
      todos = await quitarQuienRespondio(todos);
    }

    if (todos.length > totalEsperado) {
      return Response.json({
        error: `La audiencia creció: ahora son ${todos.length} y en pantalla había ${totalEsperado}. ` +
               `Vuelve a mirar el conteo antes de enviar.`,
        total: todos.length,
      }, { status: 409 });
    }

    if (!todos.length) {
      return Response.json({ error: "No hay nadie en esa audiencia" }, { status: 400 });
    }

    const tanda = todos.slice(0, TOPE_POR_TANDA);
    const resumen = resumenAudiencia(audiencia);

    // La campaña se crea antes de mandar. Si la función se muere a mitad, lo
    // que quedó registrado es «enviando» con sus envíos hechos hasta ahí, que
    // es recuperable; crearla después dejaría correos mandados sin rastro.
    const campana = await EmailCampana.create({
      plantilla: slug,
      nombrePlantilla: plantilla.nombre,
      /** El asunto con los datos del evento puestos, pero sin los de nadie. */
      asunto: aplicarVariables(plantilla.asunto, valoresDelEvento()),
      audiencia,
      resumenAudiencia: resumen,
      evitarRepetidos,
      estado: "enviando",
      total: tanda.length,
      lanzadaPor: actor.name,
    });

    /** Sólo se va a buscar lo que la plantilla usa. */
    const usadas = variablesUsadas(plantilla.bloques as Bloque[], plantilla.asunto, plantilla.preview);
    if (usadas.has("pasaporte")) await anadirPasaporte(tanda);
    const opsEncuesta = usadas.has("encuesta") ? await anadirEncuesta(tanda) : [];

    // Los enlaces del panel, una vez para toda la tanda.
    const { variables: deEnlaces } = await enlacesActuales();

    /** El pase con el QR, adjunto. */
    const adjuntarPase = body.adjuntarPase === true;

    const correos: SendEmailOptions[] = [];
    for (const d of tanda) {
      const correo = await armarDesdePlantilla(
        plantilla,
        { ...deEnlaces, ...d.valores },
        d.banderas,
      );

      let adjuntos: { filename: string; content: string }[] | undefined;
      if (adjuntarPase && d.qrCode && d.publico === "asistentes") {
        try {
          const png = await QRCode.toBuffer(d.qrCode, {
            type: "png", width: 360, margin: 2,
            color: { dark: "#111827", light: "#FFFFFF" },
          });
          adjuntos = [{ filename: `mi-pase-${SLUG}.png`, content: png.toString("base64") }];
        } catch {
          // Sin el QR el correo sigue valiendo: lleva el enlace al pase.
        }
      }

      correos.push({
        from: MARKETING_EMAIL_FROM,
        to: d.email,
        subject: correo.asunto,
        html: correo.html,
        ...(adjuntos ? { attachments: adjuntos } : {}),
      });
    }

    const resultados = await sendEmailBatchDetallado(correos);

    // ── Lo que pasó, persona por persona ─────────────────────────────────────
    const envios = tanda.map((d, i) => {
      const r = resultados[i] ?? { id: null, error: "sin respuesta" };
      return {
        campana: campana._id,
        plantilla: slug,
        email: d.email,
        nombre: d.nombre,
        publico: d.publico,
        personaId: d.id,
        resendId: r.id,
        estado: r.error ? ("fallido" as const) : ("enviado" as const),
        motivo: r.error,
      };
    });
    await EmailEnvio.insertMany(envios, { ordered: false });

    /** Los tokens de encuesta se guardan cuando los correos ya salieron. */
    if (opsEncuesta.length) await SurveyRecipient.bulkWrite(opsEncuesta, { ordered: false });

    const enviados = envios.filter((e) => e.estado === "enviado");
    const fallidos = envios.length - enviados.length;

    /** La marca de «ya lo recibió» se pone sólo a quien salió de verdad. */
    // Se recorre `envios`, que va alineado con `tanda` posición por posición.
    // Recorrer la lista ya filtrada de los que salieron marcaría a otra gente:
    // sus índices dejan de corresponder en cuanto uno falla.
    const porPublico = new Map<Publico, string[]>();
    envios.forEach((e, i) => {
      if (e.estado !== "enviado") return;
      const d: Destinatario = tanda[i];
      const lista = porPublico.get(d.publico) ?? [];
      lista.push(d.id);
      porPublico.set(d.publico, lista);
    });
    await Promise.all(
      [...porPublico].map(([publico, ids]) =>
        Promise.resolve(
          MODELOS[publico].updateMany(
            { _id: { $in: ids } },
            { $addToSet: { [CAMPO_ENVIADOS[publico]]: slug } },
          ),
        ),
      ),
    );

    await EmailCampana.findByIdAndUpdate(campana._id, {
      estado: "hecho",
      enviados: enviados.length,
      fallidos,
    });

    await createLog({
      userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
      action: "EMAIL_CAMPANA_ENVIADA",
      target: plantilla.nombre,
      targetId: String(campana._id),
      details: `${enviados.length} enviados · ${fallidos} fallidos · ${resumen}`,
    });

    // `restantes` sólo tiene sentido con el filtro de repetidos puesto: sin
    // él, volver a llamar le escribiría otra vez a los de esta tanda.
    // Los que fallaron cuentan: no quedaron marcados, así que vuelven a salir
    // en la siguiente tanda.
    const restantes = evitarRepetidos
      ? Math.max(0, todos.length - tanda.length) + fallidos
      : 0;

    return Response.json({
      ok: true,
      campanaId: String(campana._id),
      enviados: enviados.length,
      fallidos,
      restantes,
      // Para que el panel pueda decir «eran 412, mandé 300, quedan 112».
      totalAudiencia: todos.length,
      motivos: [...new Set(envios.filter((e) => e.motivo).map((e) => e.motivo))].slice(0, 5),
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    console.error("[campanas/enviar]", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
