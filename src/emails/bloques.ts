/** Los bloques de los que se compone un correo. */

export type TipoBloque =
  | "kicker"
  | "titulo"
  | "parrafo"
  | "boton"
  | "aviso"
  | "datos"
  | "pasos"
  | "cifra"
  | "cuentaRegresiva"
  | "imagen"
  | "separador";

interface Base {
  /** Identificador estable, para reordenar sin que React pierda el hilo. */
  id: string;
  /**
   * Muestra el bloque sólo si quien envía levanta esta bandera. Así un mismo
   * correo sirve para el presencial y para el online sin tener dos plantillas.
   */
  mostrarSi?: string;
}

export type Bloque =
  | (Base & { tipo: "kicker"; texto: string })
  | (Base & { tipo: "titulo"; texto: string; siVacio?: string })
  | (Base & { tipo: "parrafo"; texto: string; apagado?: boolean; siVacio?: string })
  | (Base & { tipo: "boton"; texto: string; enlace: string; contorno?: boolean })
  | (Base & { tipo: "aviso"; titulo?: string; texto: string })
  | (Base & { tipo: "datos"; filas: { etiqueta: string; valor: string }[] })
  | (Base & { tipo: "pasos"; items: string[] })
  | (Base & { tipo: "cifra"; valor: string; etiqueta: string })
  /**
   * El reloj hasta la apertura de puertas. Es una imagen que calcula
   * `/api/countdown` cuando el cliente de correo la pide, así que un correo
   * guardado hoy enseña la cuenta correcta mañana.
   */
  | (Base & { tipo: "cuentaRegresiva" })
  /**
   * Una imagen por URL. `alt` es obligatorio: muchos clientes no cargan
   * imágenes hasta que se les pide, y sin texto queda un hueco.
   */
  | (Base & { tipo: "imagen"; url: string; alt: string; enlace?: string })
  | (Base & { tipo: "separador" });

/** Las banderas con las que se puede condicionar un bloque. Las levanta quien envía según a quién le escribe. */
export const BANDERAS: { clave: string; explica: string }[] = [
  { clave: "presencial", explica: "Sólo si participa de forma presencial." },
  { clave: "online", explica: "Sólo si participa en línea." },
  { clave: "internacional", explica: "Sólo si viene de otro país." },
  { clave: "nacional", explica: "Sólo si es del país del evento." },
];

/** Cómo se llama cada bloque en el editor, y qué hace. */
export const CATALOGO: { tipo: TipoBloque; nombre: string; explica: string }[] = [
  { tipo: "kicker", nombre: "Rótulo", explica: "La línea pequeña en mayúsculas, encima del título." },
  { tipo: "titulo", nombre: "Título", explica: "El titular grande. Normalmente uno por correo." },
  { tipo: "parrafo", nombre: "Párrafo", explica: "Texto corrido. Puede ir apagado, para las notas al pie." },
  { tipo: "boton", nombre: "Botón", explica: "La acción principal. Sólido o de contorno." },
  { tipo: "aviso", nombre: "Aviso", explica: "Recuadro destacado, para lo que no se puede pasar por alto." },
  { tipo: "datos", nombre: "Ficha de datos", explica: "Filas de etiqueta y valor: fecha, lugar, hora." },
  { tipo: "pasos", nombre: "Pasos", explica: "Lista numerada de lo que viene después." },
  { tipo: "cifra", nombre: "Cifra", explica: "Un número grande con su etiqueta." },
  { tipo: "cuentaRegresiva", nombre: "Cuenta regresiva", explica: "El reloj animado hasta la hora de apertura. Se calcula al abrir el correo." },
  { tipo: "imagen", nombre: "Imagen", explica: "Una captura o un GIF, por URL. Lleva texto alternativo para cuando no cargan." },
  { tipo: "separador", nombre: "Separador", explica: "Una línea para cortar el correo en partes." },
];

/**
 * Una variable que se puede escribir en cualquier texto, como `{nombre}`. Se
 * sustituye al enviar, por destinatario. Sin valor queda vacía en vez de dejar
 * la llave a la vista.
 */
export interface Variable {
  clave: string;
  explica: string;
  /** Para agrupar las fichas en el editor. */
  grupo: "La persona" | "El evento" | "Sus enlaces" | "Enlaces del panel" | "Del envío";
}

/**
 * El catálogo de variables. Un botón cuyo enlace se queda vacío no sale: eso
 * permite escribir un solo correo para quien tiene pase y para quien no.
 */
export const VARIABLES: Variable[] = [
  { clave: "nombre", explica: "El nombre de pila de quien recibe.", grupo: "La persona" },
  { clave: "nombreCompleto", explica: "Nombre y apellido.", grupo: "La persona" },
  { clave: "correo", explica: "Su dirección de correo.", grupo: "La persona" },
  { clave: "charla", explica: "El título de su charla, si es speaker.", grupo: "La persona" },
  { clave: "sala", explica: "Su sala, si ya está agendada.", grupo: "La persona" },
  { clave: "hora", explica: "La hora de su sesión.", grupo: "La persona" },
  { clave: "modalidad", explica: "Presencial u online, en palabras.", grupo: "La persona" },

  { clave: "evento", explica: "El nombre del evento.", grupo: "El evento" },
  { clave: "fecha", explica: "La fecha del evento.", grupo: "El evento" },
  { clave: "sede", explica: "La sede.", grupo: "El evento" },
  { clave: "fechaDia", explica: "La fecha con el día de la semana.", grupo: "El evento" },
  { clave: "horaPuertas", explica: "A qué hora abren las puertas, con la zona horaria.", grupo: "El evento" },
  { clave: "direccion", explica: "La dirección de la sede.", grupo: "El evento" },
  { clave: "ciudad", explica: "La ciudad del evento.", grupo: "El evento" },
  { clave: "pais", explica: "El país del evento.", grupo: "El evento" },
  { clave: "anioSiguiente", explica: "El año de la próxima edición.", grupo: "El evento" },
  { clave: "sitio", explica: "La dirección del sitio.", grupo: "El evento" },
  { clave: "dominio", explica: "El dominio, sin https.", grupo: "El evento" },
  { clave: "cfpCierre", explica: "Cuándo cierra el Call for Speakers.", grupo: "El evento" },
  { clave: "cfpSlides", explica: "Fecha límite para entregar las diapositivas.", grupo: "El evento" },
  { clave: "encuestaEvento", explica: "Cómo aparece el evento en la encuesta del programa.", grupo: "El evento" },
  { clave: "encuestaFecha", explica: "La fecha del evento como la pide la encuesta (mes/día/año).", grupo: "El evento" },
  { clave: "encuestaAnfitrion", explica: "Quién figura como anfitrión en la encuesta.", grupo: "El evento" },

  { clave: "pase", explica: "Su pase con el QR. Sólo quien va presencial.", grupo: "Sus enlaces" },
  { clave: "qr", explica: "Su código QR como imagen, para pegarlo en el correo.", grupo: "Sus enlaces" },
  { clave: "confirmar", explica: "Para que confirme su asistencia. Sólo presencial.", grupo: "Sus enlaces" },
  { clave: "pasaporte", explica: "Su pasaporte digital, si ya tiene uno.", grupo: "Sus enlaces" },
  { clave: "pin", explica: "El PIN de su pasaporte: con él lo edita y pide los sellos de los stands.", grupo: "Sus enlaces" },
  { clave: "encuesta", explica: "Su enlace personal a la encuesta. Se crea al mandarla.", grupo: "Sus enlaces" },

  { clave: "grupoWhatsapp", explica: "El grupo que le corresponde.", grupo: "Enlaces del panel" },
  { clave: "comoLlegar", explica: "El mapa de la sede.", grupo: "Enlaces del panel" },
  { clave: "plantillaDiapositivas", explica: "La plantilla oficial de diapositivas.", grupo: "Enlaces del panel" },
  { clave: "subirPresentacion", explica: "La carpeta donde suben su presentación.", grupo: "Enlaces del panel" },
  { clave: "transmision", explica: "La transmisión en vivo.", grupo: "Enlaces del panel" },
  { clave: "fotos", explica: "La galería de fotos.", grupo: "Enlaces del panel" },
  { clave: "grabaciones", explica: "Las grabaciones de las charlas.", grupo: "Enlaces del panel" },

  { clave: "enlaceClave", explica: "Invitación al panel: el enlace de un solo uso para crear la contraseña.", grupo: "Del envío" },
  { clave: "rol", explica: "Invitación al panel: el rol que se le dio.", grupo: "Del envío" },
  { clave: "enlaceConfirmar", explica: "Pasaporte: el enlace de un solo uso para confirmar los cambios.", grupo: "Del envío" },
  { clave: "builderCenter", explica: "Pasaporte: el cambio pedido en Builder Center, si lo hay.", grupo: "Del envío" },
  { clave: "linkedin", explica: "Pasaporte: el cambio pedido en LinkedIn, si lo hay.", grupo: "Del envío" },
  { clave: "instagram", explica: "Pasaporte: el cambio pedido en Instagram, si lo hay.", grupo: "Del envío" },
  { clave: "x", explica: "Pasaporte: el cambio pedido en X, si lo hay.", grupo: "Del envío" },
  { clave: "github", explica: "Pasaporte: el cambio pedido en GitHub, si lo hay.", grupo: "Del envío" },
  { clave: "tiktok", explica: "Pasaporte: el cambio pedido en TikTok, si lo hay.", grupo: "Del envío" },
  { clave: "foto", explica: "Pasaporte: el cambio pedido en la foto, si lo hay.", grupo: "Del envío" },
  { clave: "resumen", explica: "Postulación: la descripción de la propuesta.", grupo: "Del envío" },
  { clave: "nivel", explica: "Postulación: el nivel de la audiencia.", grupo: "Del envío" },
  { clave: "track", explica: "Postulación: el track elegido, si lo hay.", grupo: "Del envío" },
  { clave: "idioma", explica: "Postulación: el idioma de la charla.", grupo: "Del envío" },
  { clave: "ubicacion", explica: "Postulación: la ciudad de quien postula.", grupo: "Del envío" },
  { clave: "cargo", explica: "Postulación: su rol o titular.", grupo: "Del envío" },
  { clave: "coSpeakers", explica: "Postulación: los co-speakers, si los hay.", grupo: "Del envío" },
  { clave: "requerimientos", explica: "Postulación: lo que pidió para su sesión, si pidió algo.", grupo: "Del envío" },
];

/** Los grupos, en el orden en que salen en el editor. */
export const GRUPOS_VARIABLE = [...new Set(VARIABLES.map((v) => v.grupo))];

/** Qué variables menciona una plantilla, para no ir a buscar a la base las que no usa. */
export function variablesUsadas(bloques: Bloque[], ...textos: string[]): Set<string> {
  const usadas = new Set<string>();
  const mirar = (t: unknown) => {
    if (typeof t !== "string") return;
    for (const m of t.matchAll(/\{(\w+)\}/g)) usadas.add(m[1]!);
  };

  for (const t of textos) mirar(t);
  for (const b of bloques) {
    // Se recorren todos los campos sin mirar el tipo: un bloque nuevo no se queda fuera por olvido.
    for (const valor of Object.values(b as unknown as Record<string, unknown>)) {
      mirar(valor);
      if (Array.isArray(valor)) {
        for (const item of valor) {
          mirar(item);
          if (item && typeof item === "object") Object.values(item).forEach(mirar);
        }
      }
    }
  }
  return usadas;
}

/** Sustituye `{variable}` por su valor. Lo que no tenga valor queda vacío. */
export function aplicarVariables(texto: string, valores: Record<string, string>): string {
  return texto.replace(/\{(\w+)\}/g, (_, clave: string) => valores[clave] ?? "");
}

/** El texto del bloque: si alguna variable queda vacía y hay `siVacio`, se usa ese. */
export function textoConAlternativa(texto: string, siVacio: string | undefined, valores: Record<string, string>): string {
  if (siVacio && [...texto.matchAll(/\{(\w+)\}/g)].some((m) => !valores[m[1]!]?.trim())) {
    return aplicarVariables(siVacio, valores);
  }
  return aplicarVariables(texto, valores);
}

/** Un id corto y único dentro de una plantilla. */
export function nuevoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Un bloque recién creado, con valores de ejemplo que se entienden. */
export function bloqueNuevo(tipo: TipoBloque): Bloque {
  const id = nuevoId();
  switch (tipo) {
    case "kicker": return { id, tipo, texto: "sobre tu postulación" };
    case "titulo": return { id, tipo, texto: "{nombre}, estás dentro." };
    case "parrafo": return { id, tipo, texto: "Escribe acá el texto." };
    case "boton": return { id, tipo, texto: "Ver más", enlace: "{sitio}" };
    case "aviso": return { id, tipo, titulo: "qué sigue", texto: "Lo que tiene que saber." };
    case "datos": return { id, tipo, filas: [{ etiqueta: "Fecha", valor: "{fecha}" }] };
    case "pasos": return { id, tipo, items: ["Primer paso", "Segundo paso"] };
    case "cifra": return { id, tipo, valor: "24", etiqueta: "de octubre" };
    case "cuentaRegresiva": return { id, tipo };
    case "imagen": return { id, tipo, url: "", alt: "Descríbela en una línea" };
    case "separador": return { id, tipo };
  }
}

/** Deja en forma una lista de bloques que llega de fuera. Lo que no encaja se descarta. */
export function sanearBloques(entrada: unknown): Bloque[] {
  if (!Array.isArray(entrada)) return [];
  const texto = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
  const salida: Bloque[] = [];

  for (const b of entrada) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id ? o.id.slice(0, 32) : nuevoId();
    // Sólo banderas del catálogo: una inventada escondería el bloque para siempre.
    const mostrarSi = BANDERAS.some((f) => f.clave === o.mostrarSi)
      ? (o.mostrarSi as string)
      : undefined;

    switch (o.tipo) {
      case "kicker":
        salida.push({ id, mostrarSi, tipo: "kicker", texto: texto(o.texto, 200) });
        break;
      case "titulo":
        salida.push({
          id, mostrarSi, tipo: "titulo", texto: texto(o.texto, 200),
          siVacio: o.siVacio ? texto(o.siVacio, 200) : undefined,
        });
        break;
      case "parrafo":
        salida.push({
          id, mostrarSi, tipo: "parrafo", texto: texto(o.texto), apagado: o.apagado === true,
          siVacio: o.siVacio ? texto(o.siVacio) : undefined,
        });
        break;
      case "boton":
        salida.push({
          id, mostrarSi, tipo: "boton",
          texto: texto(o.texto, 80),
          enlace: texto(o.enlace, 500),
          contorno: o.contorno === true,
        });
        break;
      case "aviso":
        salida.push({ id, mostrarSi, tipo: "aviso", titulo: texto(o.titulo, 120), texto: texto(o.texto) });
        break;
      case "datos":
        salida.push({
          id, mostrarSi, tipo: "datos",
          filas: (Array.isArray(o.filas) ? o.filas : [])
            .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
            .map((f) => ({ etiqueta: texto(f.etiqueta, 80), valor: texto(f.valor, 300) }))
            .slice(0, 12),
        });
        break;
      case "pasos":
        salida.push({
          id, mostrarSi, tipo: "pasos",
          items: (Array.isArray(o.items) ? o.items : []).map((i) => texto(i, 300)).filter(Boolean).slice(0, 12),
        });
        break;
      case "cifra":
        salida.push({ id, mostrarSi, tipo: "cifra", valor: texto(o.valor, 20), etiqueta: texto(o.etiqueta, 80) });
        break;
      case "cuentaRegresiva":
        salida.push({ id, mostrarSi, tipo: "cuentaRegresiva" });
        break;
      case "imagen":
        salida.push({
          id, mostrarSi, tipo: "imagen",
          url: texto(o.url, 500), alt: texto(o.alt, 160),
          enlace: o.enlace ? texto(o.enlace, 500) : undefined,
        });
        break;
      case "separador":
        salida.push({ id, mostrarSi, tipo: "separador" });
        break;
      default:
        // Tipo desconocido: fuera. No se inventa un reemplazo.
        break;
    }
  }

  return salida.slice(0, 60);
}

/** Los bloques que corresponden a este destinatario: los que no llevan bandera y los de las banderas levantadas. */
export function bloquesVisibles(bloques: Bloque[], banderas: string[] = []): Bloque[] {
  const activas = new Set(banderas);
  return bloques.filter((b) => !b.mostrarSi || activas.has(b.mostrarSi));
}
