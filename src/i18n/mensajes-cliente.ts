/**
 * Qué namespaces de `src/messages` viajan al navegador. Todo lo que pasa por
 * `NextIntlClientProvider` se serializa en el HTML, así que cada provider lleva
 * sólo lo que usan los componentes cliente que cuelgan de él
 * (`tests/mensajes-cliente.test.ts` lo comprueba).
 */

/** Layout raíz: navbar y secciones de la portada que siguen siendo cliente. */
export const MENSAJES_COMUN = [
  "Nav",
  "Strip",
  "Hero",
  "About",
  "Keynotes",
  "Tracks",
  "Speakers",
  "Agenda",
  "Venue",
  "Sponsors",
  "Organizers",
  "FAQ",
  "Registration",
  "Comunidades",
] as const;

/**
 * Rutas con su propio provider (layout de la ruta). Reemplaza al del raíz sólo
 * para lo que cuelga de esa ruta; la navbar y el pie siguen con el común.
 * `"todo"` lleva el catálogo entero.
 */
export const MENSAJES_RUTA = {
  registro: ["Forms", "Strip"],
  voluntarios: ["Forms", "Strip"],
  speakers: ["Forms", "Strip", "CFP"],
  pasaporte: [],
  confirmar: [],
  "confirmar-cambios": [],
  directorio: ["Speakers"],
  admin: "todo",
} as const satisfies Record<string, readonly string[] | "todo">;

export type RutaConMensajes = keyof typeof MENSAJES_RUTA;

export function pick<T extends Record<string, unknown>>(mensajes: T, namespaces: readonly string[]): Partial<T> {
  return Object.fromEntries(namespaces.filter((n) => n in mensajes).map((n) => [n, mensajes[n]])) as Partial<T>;
}
