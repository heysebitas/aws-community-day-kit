import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { EmailTemplate } from "@/models/email-template";
import { EmailCampana } from "@/models/email-campana";
import { sanearAudiencia, resumenAudiencia } from "@/lib/audiencias";
import { resolverAudiencia } from "@/lib/audiencias-servidor";
import { armarDesdePlantilla, valoresDelEvento } from "@/lib/email-plantillas";
import { aplicarVariables, variablesUsadas, type Bloque } from "@/emails/bloques";
import { anadirEncuesta, anadirPasaporte, quitarQuienRespondio } from "@/lib/audiencias-extras";
import { enlacesActuales } from "@/lib/enlaces";
import QRCode from "qrcode";
import { sendEmailBatchDetallado, enviarPorTramos, MARKETING_EMAIL_FROM, type SendEmailOptions } from "@/lib/correo";
import { registrarTramo } from "@/models/envios-masivos";
import { tomarCerrojo, soltarCerrojo } from "@/models/email-cerrojo";
import { createLog } from "@/lib/log";
import { SLUG } from "@/config";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";
// Armar y mandar cuatrocientos correos no entra en los 15 s por defecto.
export const maxDuration = 300;

/** Mandar una plantilla a una audiencia. */

/** Cuántos por llamada. */
const TOPE_POR_TANDA = 300;

/** Cada cuántos correos se anota lo enviado; con adjunto van de uno en uno y tardan más. */
const TRAMO = 50;
const TRAMO_CON_ADJUNTO = 25;
/** No se abren tramos nuevos pasado este tiempo: queda margen bajo `maxDuration`. */
const LIMITE_MS = 240_000;
/** Debe superar `maxDuration`: si la función muere sin soltarlo, caduca solo. */
const CADUCA_CERROJO_MS = 6 * 60_000;

export const POST = ruta(async (request: NextRequest) => {
  let cerrojo: string | null = null;
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

    // Un envío por plantilla a la vez: dos clics, o dos personas, no la mandan dos veces.
    // Se toma antes de resolver la audiencia para que la segunda no vea lo que la primera aún no anotó.
    if (!(await tomarCerrojo(`campana:${slug}`, actor.name ?? "", CADUCA_CERROJO_MS))) {
      return Response.json({ error: "Esta plantilla ya se está enviando. Espera a que termine." }, { status: 409 });
    }
    cerrojo = `campana:${slug}`;

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
    // Sus tokens se guardan por tramo, cuando esos correos ya salieron.
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

    // Se registra tras cada tramo, no al final: un corte deja anotado lo ya enviado.
    let enviados = 0, fallidos = 0;
    const motivos = new Set<string>();
    let hechos = 0;
    try {
      hechos = await enviarPorTramos(
        correos,
        adjuntarPase ? TRAMO_CON_ADJUNTO : TRAMO,
        async (inicio, resultados) => {
          const r = await registrarTramo({
            campana: campana._id,
            plantilla: slug,
            gente: tanda.slice(inicio, inicio + resultados.length),
            resultados,
            opsEncuesta: opsEncuesta.slice(inicio, inicio + resultados.length),
          });
          enviados += r.enviados;
          fallidos += r.fallidos;
          r.motivos.forEach((m) => motivos.add(m));
        },
        LIMITE_MS,
      );
    } catch (e) {
      await EmailCampana.findByIdAndUpdate(campana._id, {
        estado: "error", enviados, fallidos, error: (e as Error).message,
      });
      throw e;
    }

    await EmailCampana.findByIdAndUpdate(campana._id, { estado: "hecho", enviados, fallidos });

    await createLog({
      userId: actor._id.toString(), userName: actor.name, userRole: actor.role,
      action: "EMAIL_CAMPANA_ENVIADA",
      target: plantilla.nombre,
      targetId: String(campana._id),
      details: `${enviados} enviados · ${fallidos} fallidos · ${resumen}`,
    });

    // `restantes` sólo tiene sentido con el filtro de repetidos puesto: sin
    // él, volver a llamar le escribiría otra vez a los de esta tanda.
    // Los que fallaron cuentan: no quedaron marcados, así que vuelven a salir
    // en la siguiente tanda.
    const restantes = evitarRepetidos
      ? Math.max(0, todos.length - hechos) + fallidos
      : 0;

    return Response.json({
      ok: true,
      campanaId: String(campana._id),
      enviados: enviados,
      fallidos,
      restantes,
      // Para que el panel pueda decir «eran 412, mandé 300, quedan 112».
      totalAudiencia: todos.length,
      motivos: [...motivos].slice(0, 5),
    });
  } finally {
    if (cerrojo) await soltarCerrojo(cerrojo).catch(() => {});
  }
}, { etiqueta: "[campanas/enviar]" });
