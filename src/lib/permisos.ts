/**
 * Qué puede tocar cada cuenta de organizador.
 *
 * El rol dice a qué panel se entra; esto, hasta dónde se llega en cada sección:
 *
 *   no      la sección no existe para esa cuenta
 *   ver     entra y mira; no crea, no edita, no exporta
 *   editar  todo lo anterior, y cambiar
 *
 * Borrar va aparte (`eliminar`) y apagado por omisión: es lo único sin vuelta
 * atrás. Admin entra a todo; voluntario y badges no usan esta tabla.
 *
 * Es puro —sin base de datos— porque lo importan el menú, el formulario de
 * cuentas y las rutas.
 */

/** Los tres niveles, de menos a más. El orden importa: `NIVELES.indexOf`. */
export const NIVELES = ["no", "ver", "editar"] as const;
export type Nivel = (typeof NIVELES)[number];

export type SeccionId =
  | "registrations"
  | "volunteers"
  | "speakers"
  | "programa"
  | "checkin"
  | "print"
  | "escaner_checkin"
  | "escaner_salas"
  | "escaner_almuerzos"
  | "escaner_badges"
  | "correos"
  | "faq";

export interface Seccion {
  id: SeccionId;
  /** Cómo se llama en el menú. */
  label: string;
  /** El grupo del menú donde vive, para agrupar las casillas igual que el panel. */
  grupo: string;
  /** Qué hace de verdad quien tiene «editar». Se muestra bajo la casilla. */
  explica: string;
  /** Si tiene sentido ofrecer la casilla de borrar. */
  borrable?: boolean;
  /** Las rutas del panel que cubre. La primera es la del menú; las demás, subpáginas bajo el mismo permiso. */
  rutas: string[];
}

/** El catálogo: de acá salen las casillas del formulario de cuentas, el menú lateral y el portero de las rutas. */
export const SECCIONES: Seccion[] = [
  {
    id: "registrations",
    label: "Asistentes",
    grupo: "Personas",
    explica: "Registrar a mano, editar datos, hacer check-in, reenviar el correo y exportar la lista.",
    rutas: ["/admin/registrations"],
  },
  {
    id: "volunteers",
    label: "Voluntarios",
    grupo: "Personas",
    explica: "Aprobar postulaciones, editar datos y exportar la lista.",
    rutas: ["/admin/volunteers"],
  },
  {
    id: "speakers",
    label: "Speakers",
    grupo: "Personas",
    explica: "Aprobar y rechazar propuestas, editar fichas, publicar en el sitio y exportar.",
    borrable: true,
    rutas: ["/admin/speakers"],
  },
  {
    id: "programa",
    label: "Programa",
    grupo: "Programa",
    explica: "Armar el horario, agendar a quien falta y administrar los salones.",
    borrable: true,
    rutas: ["/admin/programa"],
  },
  {
    id: "checkin",
    label: "Check-in",
    grupo: "Evento",
    explica: "Buscar a alguien y marcar su entrada el día del evento.",
    rutas: ["/admin/check-in"],
  },
  {
    id: "print",
    label: "Impresión",
    grupo: "Evento",
    explica: "Imprimir escarapelas y marcar las que ya se entregaron.",
    rutas: ["/admin/print"],
  },
  {
    id: "escaner_checkin",
    label: "Escáner · Check-in",
    grupo: "Escáner",
    explica: "El escáner de la puerta.",
    rutas: ["/admin/escaner/check-in"],
  },
  {
    id: "escaner_salas",
    label: "Escáner · Salas",
    grupo: "Escáner",
    explica: "Registrar quién entra a cada sala.",
    rutas: ["/admin/escaner/salas"],
  },
  {
    id: "escaner_almuerzos",
    label: "Escáner · Almuerzos",
    grupo: "Escáner",
    explica: "Marcar almuerzos y refrigerios entregados.",
    rutas: ["/admin/escaner/almuerzos"],
  },
  {
    id: "escaner_badges",
    label: "Escáner · Dar badges",
    grupo: "Escáner",
    explica: "Sellar el pasaporte. Qué badges puede dar se elige aparte, más abajo.",
    rutas: ["/admin/escaner/badges"],
  },
  {
    id: "correos",
    label: "Correos",
    grupo: "Sistema",
    explica: "Editar las plantillas, armar campañas y mandarlas. Quién puede mandar se decide acá.",
    borrable: true,
    rutas: ["/admin/correos"],
  },
  {
    id: "faq",
    label: "FAQ",
    grupo: "Sistema",
    explica: "Escribir y ordenar las preguntas frecuentes del sitio.",
    borrable: true,
    rutas: ["/admin/faq"],
  },
];

/** Lo que ve cualquiera que entre al panel: los números del evento. */
export const RUTAS_LIBRES = ["/admin", "/admin/evento"];

/** Un permiso guardado: la sección y hasta dónde llega. */
export interface Permiso {
  seccion: SeccionId;
  nivel: Nivel;
  eliminar?: boolean;
}

/** Todo encendido menos borrar: lo que trae una cuenta nueva por defecto. */
export function permisosCompletos(): Permiso[] {
  return SECCIONES.map((s) => ({ seccion: s.id, nivel: "editar" as Nivel, eliminar: false }));
}

/** Lo mínimo: entra al panel y ve los números, nada más. */
export function permisosVacios(): Permiso[] {
  return SECCIONES.map((s) => ({ seccion: s.id, nivel: "no" as Nivel, eliminar: false }));
}

/** Deja la lista en forma antes de guardar: sin secciones inventadas ni repetidas, y con todas las del catálogo. */
export function sanearPermisos(entrada: unknown): Permiso[] {
  const dados = new Map<string, Permiso>();

  if (Array.isArray(entrada)) {
    for (const p of entrada) {
      if (!p || typeof p !== "object") continue;
      const { seccion, nivel, eliminar } = p as Record<string, unknown>;
      if (typeof seccion !== "string" || !SECCIONES.some((s) => s.id === seccion)) continue;
      if (typeof nivel !== "string" || !NIVELES.includes(nivel as Nivel)) continue;
      dados.set(seccion, {
        seccion: seccion as SeccionId,
        nivel: nivel as Nivel,
        // Borrar exige poder editar: marcarlo sobre «sólo ver» no significa nada.
        eliminar: nivel === "editar" && eliminar === true,
      });
    }
  }

  return SECCIONES.map(
    (s) => dados.get(s.id) ?? { seccion: s.id, nivel: "no" as Nivel, eliminar: false },
  );
}

/** Lo que hace falta saber de alguien para resolver un permiso. */
export interface SujetoPermisos {
  role: string;
  permisos?: Permiso[] | null;
}

/**
 * Hasta dónde llega esta persona en esta sección.
 *
 * Una cuenta de organizador sin permisos guardados los tiene todos: es el
 * estado de una cuenta recién creada, y «vacío» no puede significar «nada».
 */
export function nivelDe(usuario: SujetoPermisos | null | undefined, seccion: SeccionId): Nivel {
  if (!usuario) return "no";
  if (usuario.role !== "organizer") return "editar";
  if (!usuario.permisos?.length) return "editar";
  return usuario.permisos.find((p) => p.seccion === seccion)?.nivel ?? "no";
}

/** Si llega al nivel pedido (`ver` se cumple también teniendo `editar`). */
export function alcanza(
  usuario: SujetoPermisos | null | undefined,
  seccion: SeccionId,
  minimo: Nivel,
): boolean {
  return NIVELES.indexOf(nivelDe(usuario, seccion)) >= NIVELES.indexOf(minimo);
}

/** Si puede borrar en esta sección. Siempre apagado salvo que se marque. */
export function puedeEliminar(
  usuario: SujetoPermisos | null | undefined,
  seccion: SeccionId,
): boolean {
  if (!usuario) return false;
  if (usuario.role !== "organizer") return true;
  if (!usuario.permisos?.length) return true;
  const p = usuario.permisos.find((x) => x.seccion === seccion);
  return p?.nivel === "editar" && p.eliminar === true;
}

/**
 * La sección de una ruta del panel, o `null` si es de las que ve cualquiera.
 * Gana la coincidencia más larga, para que `/admin/escaner/check-in` no se
 * resuelva como `/admin/check-in`.
 */
export function seccionDeRuta(ruta: string): SeccionId | null {
  let mejor: { id: SeccionId; largo: number } | null = null;

  for (const s of SECCIONES) {
    for (const r of s.rutas) {
      if ((ruta === r || ruta.startsWith(`${r}/`)) && (!mejor || r.length > mejor.largo)) {
        mejor = { id: s.id, largo: r.length };
      }
    }
  }

  return mejor?.id ?? null;
}
