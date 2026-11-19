import type { Bloque } from "./bloques";
import type { Audiencia } from "@/lib/audiencias";
import { SISTEMA, type SlugSistema } from "@/models/email-template";
import { EVENTO } from "@/config";

/** El contenido de fábrica de las plantillas de correo. */

let n = 0;
/** Ids estables dentro de la semilla, para que dos siembras den lo mismo. */
const id = () => `s${++n}`;

export interface Semilla {
  /** De sistema, una clave de `SISTEMA`; de campaña, una propia y estable. */
  slug: SlugSistema | string;
  nombre: string;
  descripcion: string;
  asunto: string;
  preview: string;
  strip?: string;
  bloques: Bloque[];

  /** `false` para las de campaña: vienen sembradas con su audiencia, pero las manda una persona. */
  deSistema?: boolean;
  /** Qué la dispara. Las de sistema lo sacan de `SISTEMA`; las de campaña, de acá. */
  disparador?: string;
  /** A quién va, sólo para las de campaña. */
  audiencia?: Audiencia;

  /**
   * Su contenido no se edita desde el panel y cada siembra la reescribe desde
   * acá. Para las que tienen que decir exactamente lo que dicen.
   */
  bloqueada?: boolean;
}

const TODAS: Semilla[] = [
  {
    slug: "speaker_aprobado",
    nombre: "Speaker aceptado",
    descripcion: "Le avisa que su propuesta entró, con la carta en PDF adjunta.",
    asunto: "¡Has sido aceptado como Speaker — {evento}!",
    preview: "Tu propuesta fue seleccionada para el {evento}",
    strip: "PROPUESTA ACEPTADA ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "propuesta aceptada" },
      { id: id(), tipo: "titulo", texto: "{nombre}, tu charla entró." },
      {
        id: id(), tipo: "parrafo",
        texto: "Tu propuesta fue seleccionada para el {evento}. Adjuntamos la carta de invitación en PDF, por si la necesitas para tu universidad o tu trabajo.",
      },
      { id: id(), tipo: "aviso", titulo: "qué sigue", texto: "Te vamos a escribir con tu sala y tu hora en cuanto cerremos la agenda. Mientras tanto, entra al grupo de WhatsApp: ahí se coordina todo." },

      // Al que participa en línea no se le manda la dirección.
      { id: id(), tipo: "datos", filas: [
        { etiqueta: "Tu charla", valor: "{charla}" },
        { etiqueta: "Modalidad", valor: "{modalidad}" },
        { etiqueta: "Fecha", valor: "{fecha}" },
      ] },
      { id: id(), mostrarSi: "presencial", tipo: "datos", filas: [
        { etiqueta: "Lugar", valor: "{sede}" },
        { etiqueta: "Dirección", valor: "{direccion}" },
      ] },

      { id: id(), mostrarSi: "online", tipo: "parrafo", texto: "Tu charla va por el Track Online. Te mandamos el enlace de la transmisión y la fecha de la pre-grabación más adelante." },
      { id: id(), mostrarSi: "internacional", tipo: "aviso", titulo: "si vienes de fuera", texto: "Si necesitas una carta para visado o para tu institución, respóndenos este correo y te la preparamos." },

      { id: id(), tipo: "boton", texto: "Entrar al grupo de WhatsApp", enlace: "{grupoWhatsapp}" },
      { id: id(), tipo: "parrafo", texto: "¿Te surgió algo y ya no puedes? Respóndenos este correo cuanto antes.", apagado: true },
    ],
  },

  {
    slug: "speaker_rechazado",
    nombre: "Speaker no seleccionado",
    descripcion: "Le avisa que no quedó, agradece y le invita como asistente.",
    asunto: "Actualización sobre tu postulación como speaker — {evento}",
    preview: "Sobre tu propuesta para el {evento}",
    strip: "GRACIAS POR POSTULAR ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "sobre tu propuesta" },
      { id: id(), tipo: "titulo", texto: "{nombre}, esta vez no." },
      {
        id: id(), tipo: "parrafo",
        texto: "Tu propuesta no quedó en la agenda de este año. Te lo decimos directo porque mereces una respuesta clara y no un silencio.",
      },
      {
        id: id(), tipo: "parrafo",
        texto: "Recibimos muchas más propuestas que espacios en la agenda, y la decisión se tomó sobre lo que proponía cada una: el tema, el nivel y a quién le servía. Que no haya quedado no dice nada de ti como speaker.",
      },
      {
        id: id(), tipo: "parrafo",
        texto: "Nos encantaría verte igual el {fecha}. La entrada es gratuita y el cupo es limitado.",
      },
      { id: id(), tipo: "boton", texto: "Registrarme como asistente", enlace: "{sitio}/registro" },
      { id: id(), tipo: "parrafo", texto: "Y postula de nuevo en {anioSiguiente} — nos gusta ver caras repetidas.", apagado: true },
    ],
  },

  {
    slug: "speaker_postulacion",
    nombre: "Postulación recibida",
    descripcion: "Acuse de recibo al enviar una propuesta, con copia de lo enviado.",
    asunto: "Recibimos tu propuesta — {charla}",
    preview: "Recibimos tu propuesta: {charla}",
    strip: "POSTULACIÓN RECIBIDA ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "postulación recibida" },
      { id: id(), tipo: "titulo", texto: "{nombre}, la tenemos." },
      {
        id: id(), tipo: "parrafo",
        texto: "Tu propuesta para el {evento} quedó registrada. Abajo va una copia de lo que enviaste, para que la tengas.",
      },
      {
        id: id(), tipo: "aviso", titulo: "qué pasa ahora",
        texto: "El comité lee y evalúa cada propuesta por lo que propone: el título, el nivel y el abstract. Te escribimos por correo con la respuesta, salga como salga.",
      },
      { id: id(), tipo: "datos", filas: [{ etiqueta: "Tu charla", valor: "{charla}" }] },
      { id: id(), tipo: "separador" },
      { id: id(), tipo: "kicker", texto: "copia de tu propuesta" },
      {
        // Las filas sin valor no salen: así el track, los co-speakers y los requerimientos son opcionales.
        id: id(), tipo: "datos", filas: [
          { etiqueta: "Título", valor: "{charla}" },
          { etiqueta: "Descripción", valor: "{resumen}" },
          { etiqueta: "Modalidad", valor: "{modalidad}" },
          { etiqueta: "Nivel", valor: "{nivel}" },
          { etiqueta: "Track", valor: "{track}" },
          { etiqueta: "Idioma", valor: "{idioma}" },
          { etiqueta: "Ciudad", valor: "{ubicacion}" },
          { etiqueta: "Tu rol", valor: "{cargo}" },
          { etiqueta: "Co-speakers", valor: "{coSpeakers}" },
          { etiqueta: "Requerimientos", valor: "{requerimientos}" },
        ],
      },
      {
        id: id(), tipo: "parrafo", apagado: true,
        texto: "La propuesta no se puede editar desde el sitio. Si viste algo mal en esta copia, respóndenos este correo antes del cierre y lo corregimos.",
      },
      { id: id(), tipo: "separador" },
      { id: id(), tipo: "boton", texto: "Ver el sitio", enlace: "{sitio}" },
    ],
  },

  {
    slug: "invitacion_panel",
    nombre: "Invitación al panel",
    descripcion: "Le da acceso al panel a una persona del equipo, con el enlace para crear su contraseña.",
    asunto: "Invitación al panel — {evento}",
    preview: "Tu cuenta del panel está lista — crea tu contraseña",
    strip: "ACCESO AL PANEL ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "cuenta creada" },
      { id: id(), tipo: "titulo", texto: "Bienvenido/a, {nombre}.", siVacio: "Tu cuenta está lista." },
      {
        id: id(), tipo: "parrafo",
        texto: "Te creamos una cuenta en el panel del {evento}. Falta un paso: definir tu contraseña.",
      },
      { id: id(), tipo: "datos", filas: [
        { etiqueta: "Nombre", valor: "{nombreCompleto}" },
        { etiqueta: "Rol", valor: "{rol}" },
        { etiqueta: "Panel", valor: "{dominio}/admin" },
      ] },
      { id: id(), tipo: "boton", texto: "Crear mi contraseña", enlace: "{enlaceClave}" },
      {
        id: id(), tipo: "aviso", titulo: "importante",
        texto: "Este enlace es de un solo uso y caduca. Si expira, pídele a un administrador que te reenvíe la invitación.",
      },
      { id: id(), tipo: "separador" },
      { id: id(), tipo: "parrafo", apagado: true, texto: "Si el botón no abre, copia y pega este enlace en tu navegador:" },
      { id: id(), tipo: "parrafo", texto: "{enlaceClave}" },
      {
        id: id(), tipo: "parrafo", apagado: true,
        texto: "¿No esperabas este correo? Ignóralo — sin crear la contraseña, la cuenta no se activa.",
      },
    ],
  },

  {
    slug: "pasaporte_confirmar",
    nombre: "Confirmar cambios del pasaporte",
    descripcion: "Pide confirmar los cambios que alguien pidió en un pasaporte, con el enlace de un solo uso.",
    asunto: "Confirma los cambios en tu pasaporte — {evento}",
    preview: "Confirma los cambios en tu pasaporte",
    strip: "CONFIRMA LOS CAMBIOS ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "verificación" },
      { id: id(), tipo: "titulo", texto: "{nombre}, confirma estos cambios.", siVacio: "Confirma estos cambios." },
      {
        id: id(), tipo: "parrafo",
        texto: "Alguien pidió actualizar tu pasaporte con los datos de abajo. Si fuiste tú, confirma; si no reconoces esto, ignora el correo y no pasa nada.",
      },
      {
        // Sólo salen las filas que cambian: las demás llegan sin valor.
        id: id(), tipo: "datos", filas: [
          { etiqueta: "Builder Center", valor: "{builderCenter}" },
          { etiqueta: "LinkedIn", valor: "{linkedin}" },
          { etiqueta: "Instagram", valor: "{instagram}" },
          { etiqueta: "X / Twitter", valor: "{x}" },
          { etiqueta: "GitHub", valor: "{github}" },
          { etiqueta: "TikTok", valor: "{tiktok}" },
          { etiqueta: "Foto", valor: "{foto}" },
        ],
      },
      { id: id(), tipo: "boton", texto: "Sí, aplicar los cambios", enlace: "{enlaceConfirmar}" },
      {
        id: id(), tipo: "aviso", titulo: "seguridad",
        texto: "Este enlace es de un solo uso y caduca pronto. Sin confirmar, tu pasaporte se queda exactamente como está.",
      },
    ],
  },

  {
    slug: "voluntario_certificado",
    nombre: "Certificado de voluntariado",
    descripcion: "Acompaña al PDF del certificado que se manda a cada voluntario.",
    asunto: "Tu certificado de voluntariado — {evento}",
    preview: "Tu certificado de voluntariado está adjunto",
    strip: "TU CERTIFICADO ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "gracias" },
      { id: id(), tipo: "titulo", texto: "{nombre}, lo lograste." },
      {
        id: id(), tipo: "parrafo",
        texto: "Adjunto va tu certificado de voluntariado del {evento}. Es tuyo: súbelo a LinkedIn, ponlo en tu CV, enséñaselo a quien quieras.",
      },
      {
        id: id(), tipo: "parrafo",
        texto: "Un evento así se ve fácil desde afuera justamente porque alguien lo sostuvo desde adentro. Ese alguien fuiste tú.",
      },
      { id: id(), tipo: "boton", texto: "Ver quién más estuvo", enlace: "{sitio}/directorio", contorno: true },
      {
        id: id(), tipo: "parrafo", apagado: true,
        texto: "Si tu nombre está mal escrito en el certificado, respóndenos y lo reemitimos el mismo día.",
      },
    ],
  },

  {
    slug: "voluntario_aprobado",
    nombre: "Voluntario aceptado",
    descripcion: "Le avisa que quedó en el equipo, con la logística del día.",
    asunto: "¡Has sido aceptado como Voluntario — {evento}!",
    preview: "Quedaste en el equipo de voluntarios del {evento}",
    strip: "ERES PARTE DEL EQUIPO ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "postulación aprobada" },
      { id: id(), tipo: "titulo", texto: "{nombre}, estás dentro." },
      {
        id: id(), tipo: "parrafo",
        texto: "Quedaste en el equipo de voluntarios del {evento}. Sin ustedes esto no pasa — gracias por meterle el hombro.",
      },
      {
        id: id(), tipo: "aviso", titulo: "qué sigue",
        texto: "Te vamos a escribir con los turnos, el punto de encuentro y la jornada de montaje. Mantén este correo a mano.",
      },
      { id: id(), tipo: "datos", filas: [
        { etiqueta: "Evento", valor: "{fecha}" },
        { etiqueta: "Puertas", valor: "{horaPuertas}" },
        { etiqueta: "Lugar", valor: "{sede}" },
      ] },
      { id: id(), tipo: "parrafo", texto: "¿Te surgió algo y ya no puedes? Respóndenos este correo cuanto antes para reorganizar los turnos.", apagado: true },
    ],
  },

  {
    slug: "registro_presencial",
    nombre: "Registro confirmado · presencial",
    descripcion: "Al registrarse para ir al evento. Lleva el pase con QR.",
    asunto: "Tu cupo está reservado — {evento}",
    preview: "Nos vemos el {fecha} en {sede}",
    strip: "CUPO RESERVADO ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "cupo reservado" },
      { id: id(), tipo: "titulo", texto: "{nombre}, nos vemos allá." },
      {
        id: id(), tipo: "parrafo",
        texto: "Tu registro para el {evento} está confirmado. Adjuntamos tu pase: muéstralo en la entrada, en el teléfono o impreso.",
      },
      { id: id(), tipo: "datos", filas: [
        { etiqueta: "Fecha", valor: "{fecha}" },
        { etiqueta: "Lugar", valor: "{sede}" },
        { etiqueta: "Dirección", valor: "{direccion}" },
      ] },
      { id: id(), tipo: "boton", texto: "Cómo llegar", enlace: "{comoLlegar}", contorno: true },
      { id: id(), tipo: "datos", filas: [{ etiqueta: "PIN de tu pasaporte", valor: "{pin}" }] },
      { id: id(), tipo: "parrafo", texto: "Guárdalo: no va en tu escarapela. Lo pides para editar tu pasaporte y para que los stands te pongan sellos." },
      { id: id(), tipo: "boton", texto: "Ver mi pasaporte", enlace: "{pasaporte}", contorno: true },
    ],
  },

  {
    slug: "registro_online",
    nombre: "Registro confirmado · online",
    descripcion: "Al registrarse para seguir el evento por internet.",
    asunto: "Tu cupo online está reservado — {evento}",
    preview: "Nos vemos en línea el {fecha}",
    strip: "CUPO RESERVADO ·",
    bloques: [
      { id: id(), tipo: "kicker", texto: "cupo reservado" },
      { id: id(), tipo: "titulo", texto: "{nombre}, nos vemos en línea." },
      {
        id: id(), tipo: "parrafo",
        texto: "Tu registro para el {evento} está confirmado. Unos días antes del evento te mandamos el enlace de la transmisión a este mismo correo.",
      },
      { id: id(), tipo: "datos", filas: [{ etiqueta: "Fecha", valor: "{fecha}" }] },
    ],
  },

  // ── De campaña ─────────────────────────────────────────────────────────────

  {
    slug: "vispera_asistentes",
    nombre: "Es mañana · asistentes",
    descripcion: "La víspera del evento: hora, cómo llegar y el pase otra vez.",
    asunto: "{nombre}, es mañana",
    preview: "Esto es todo lo que necesitas saber para llegar.",
    strip: "ES MAÑANA ·",
    deSistema: false,
    disparador: "Se manda la víspera, desde Campañas",
    audiencia: [{ publico: "asistentes", filtros: { modalidad: ["in-person"] } }],
    bloques: [
      { id: id(), tipo: "kicker", texto: "mañana" },
      { id: id(), tipo: "titulo", texto: "{nombre}, mañana nos vemos." },
      {
        id: id(), tipo: "parrafo",
        texto: "Ya está. Después de meses armando esto, mañana es el día. Te dejamos lo justo para que llegues sin pensar en nada.",
      },
      { id: id(), tipo: "cuentaRegresiva" },

      { id: id(), tipo: "datos", filas: [
        { etiqueta: "Cuándo", valor: "{fecha}" },
        { etiqueta: "A qué hora", valor: "{horaPuertas} — a esa hora abrimos" },
        { etiqueta: "Dónde", valor: "{sede}" },
        { etiqueta: "Dirección", valor: "{direccion}" },
      ] },

      { id: id(), tipo: "boton", texto: "Abrir en el mapa", enlace: "{comoLlegar}" },

      { id: id(), tipo: "separador" },

      { id: id(), tipo: "kicker", texto: "tu pase" },
      {
        id: id(), tipo: "parrafo",
        texto: "Va otra vez adjunto a este correo, por si lo perdiste de vista. No hace falta que lo imprimas: con mostrarlo en el teléfono en la entrada basta. Lo escanean, te damos tu escarapela y entras.",
      },
      { id: id(), tipo: "boton", texto: "Ver mi pase", enlace: "{pase}", contorno: true },

      { id: id(), tipo: "separador" },

      { id: id(), tipo: "kicker", texto: "antes de salir" },
      { id: id(), tipo: "pasos", items: [
        "Carga el teléfono. Vas a sacar más fotos de las que crees.",
        "Trae tu botellón de agua: hay dónde llenarlo.",
        "Llega con algo de margen: la fila de la entrada es más corta a primera hora.",
        "Ropa cómoda. Son muchas horas y se pasa de una sala a otra.",
      ] },

      {
        id: id(), tipo: "parrafo", apagado: true,
        texto: "Si al final no vas a poder venir, respóndenos este correo. Hay lista de espera y alguien se queda con tu cupo.",
      },
    ],
  },

  {
    slug: "vispera_speakers",
    nombre: "Es mañana · speakers",
    descripcion: "La víspera, para quienes dan charla presencial. Sin QR: su escarapela está lista.",
    asunto: "{nombre}, mañana te toca",
    preview: "No necesitas nada para entrar. Te contamos cómo va tu día.",
    strip: "ES MAÑANA ·",
    deSistema: false,
    disparador: "Se manda la víspera, desde Campañas",
    audiencia: [{
      publico: "speakers",
      filtros: { modalidad: ["presencial"], estado: ["accepted", "scheduled"] },
    }],
    bloques: [
      { id: id(), tipo: "kicker", texto: "mañana" },
      { id: id(), tipo: "titulo", texto: "{nombre}, mañana te toca." },
      {
        id: id(), tipo: "parrafo",
        texto: "Mañana subes al escenario. Lo tuyo ya está resuelto de nuestro lado, así que esto es corto.",
      },
      { id: id(), tipo: "cuentaRegresiva" },

      { id: id(), tipo: "datos", filas: [
        { etiqueta: "Tu charla", valor: "{charla}" },
        { etiqueta: "Sala", valor: "{sala}" },
        { etiqueta: "Hora", valor: "{hora}" },
      ] },

      { id: id(), tipo: "separador" },

      {
        id: id(), tipo: "aviso", titulo: "no necesitas código ni pase",
        texto: "A ti no te mandamos QR porque no te hace falta. Llega a la entrada, di que eres speaker y te damos tu escarapela, que ya está impresa con tu nombre esperándote.",
      },

      { id: id(), tipo: "datos", filas: [
        { etiqueta: "Cuándo", valor: "{fecha}" },
        { etiqueta: "Puertas", valor: "{horaPuertas}" },
        { etiqueta: "Dónde", valor: "{sede}" },
        { etiqueta: "Dirección", valor: "{direccion}" },
      ] },

      { id: id(), tipo: "boton", texto: "Abrir en el mapa", enlace: "{comoLlegar}" },

      { id: id(), tipo: "separador" },

      { id: id(), tipo: "kicker", texto: "para que vaya fino" },
      { id: id(), tipo: "pasos", items: [
        "Llega con tiempo a tu sala, unos quince minutos antes. Así probamos sonido y pantalla sin prisa.",
        "Trae tu adaptador si tu portátil no tiene HDMI. Tenemos algunos, pero no para todos a la vez.",
        "Deja una copia de tus diapositivas en la nube, por si el portátil decide portarse mal.",
      ] },

      {
        id: id(), tipo: "parrafo", apagado: true,
        texto: "¿Se te complicó algo a última hora? Respóndenos este correo y lo resolvemos.",
      },
    ],
  },

  {
    slug: "pasaporte_que_es",
    nombre: "Qué es el pasaporte digital",
    descripcion: "Explica para qué sirve el pasaporte y qué se hace con él el día del evento.",
    asunto: "Tu pasaporte del {evento}",
    preview: "Tu perfil, tus sellos y lo que te llevas del día. Te explicamos.",
    strip: "PASAPORTE DIGITAL ·",
    deSistema: false,
    disparador: "Se manda antes del evento, desde Campañas",
    audiencia: [
      { publico: "asistentes", filtros: { modalidad: ["in-person"] } },
      { publico: "speakers", filtros: { modalidad: ["presencial"], estado: ["accepted", "scheduled"] } },
    ],
    bloques: [
      { id: id(), tipo: "kicker", texto: "pasaporte digital" },
      { id: id(), tipo: "titulo", texto: "{nombre}, tienes un pasaporte.", siVacio: "Tienes un pasaporte." },
      {
        id: id(), tipo: "parrafo",
        texto: "Es una página tuya, con tu nombre y tus redes, que existe desde que te registraste. Funciona como una tarjeta de presentación que no se arruga en el bolsillo: la abres, la muestran y listo.",
      },

      { id: id(), tipo: "boton", texto: "Ver mi pasaporte", enlace: "{pasaporte}" },

      { id: id(), tipo: "separador" },

      { id: id(), tipo: "kicker", texto: "para qué sirve" },
      { id: id(), tipo: "pasos", items: [
        "Para que te encuentren. Pones tu LinkedIn, tu GitHub y lo que quieras, y quien escanee tu escarapela llega ahí.",
        "Para coleccionar sellos. Cada stand que visitas te pone el suyo. Es media broma y media competencia, y funciona.",
        "Para guardar el día. Queda registro de las charlas a las que entraste, y de ahí sale tu certificado.",
      ] },

      { id: id(), tipo: "separador" },

      {
        id: id(), tipo: "aviso", titulo: "complétalo antes de venir",
        texto: "Tarda dos minutos y cambia bastante: un pasaporte con foto y redes se ve mucho mejor que uno vacío cuando alguien lo abre delante de ti.",
      },

      {
        id: id(), tipo: "parrafo", apagado: true,
        texto: "El pasaporte es tuyo y lo ves sólo tú hasta que lo compartes. Puedes editarlo cuando quieras desde ese mismo enlace.",
      },
    ],
  },

  {
    slug: "encuesta_final",
    nombre: "Encuesta final",
    descripcion: "La encuesta del programa, con las tres respuestas que hay que acertar.",
    asunto: "{nombre}, nos faltas tú (3 minutos)",
    preview: "La encuesta del evento. Te dejamos las tres respuestas exactas para que no falles ninguna.",
    strip: "ÚLTIMA COSA ·",
    deSistema: false,
    bloqueada: true,
    disparador: "Se manda después del evento, desde Campañas",
    audiencia: [
      { publico: "asistentes", filtros: { modalidad: ["in-person"] } },
      { publico: "speakers", filtros: { estado: ["accepted", "scheduled"] } },
      { publico: "voluntarios", filtros: {} },
    ],
    bloques: [
      { id: id(), tipo: "kicker", texto: "última cosa" },
      { id: id(), tipo: "titulo", texto: "{nombre}, nos faltas tú." },
      {
        id: id(), tipo: "parrafo",
        texto: "AWS mide cada Student Community Day con una encuesta suya. De lo que salga ahí depende que {ciudad} vuelva a tener uno el año que viene. Son tres minutos y es anónima.",
      },

      { id: id(), tipo: "separador" },

      {
        id: id(), tipo: "aviso",
        titulo: "ojo con estas tres preguntas",
        texto: "El formulario es de AWS y lo comparten todos los eventos del mundo, así que pide identificar cuál fue el tuyo. Si te equivocas, tu respuesta se cuenta para otro evento y a nosotros no nos llega. Son las tres de abajo, copiadas tal cual.",
      },

      { id: id(), tipo: "datos", filas: [
        { etiqueta: "1 · Which event did you attend?", valor: "{encuestaEvento}" },
        { etiqueta: "2 · Event Date", valor: "{encuestaFecha}  (el mes va primero)" },
        { etiqueta: "3 · Who hosted the event?", valor: "{encuestaAnfitrion}" },
      ] },

      {
        id: id(), tipo: "parrafo",
        texto: "La fecha es la que más se falla: el formulario está en formato de Estados Unidos y espera el mes antes que el día. Es {encuestaFecha}: primero el mes y después el día.",
      },


      { id: id(), tipo: "boton", texto: "Responder la encuesta", enlace: "{encuesta}" },
    ],
  },
];

/** La de la encuesta sólo existe si la edición definió `detalles.encuesta`. */
export const SEMILLAS: Semilla[] = TODAS.filter((s) => s.slug !== "encuesta_final" || !!EVENTO.detalles.encuesta);

const faltan = Object.keys(SISTEMA).filter((s) => !SEMILLAS.some((x) => x.slug === s));
if (faltan.length) throw new Error(`Faltan semillas para: ${faltan.join(", ")}`);
