/**
 * Choques del programa: dos bloques a la misma hora en la misma sala, o uno
 * que termina antes de empezar.
 *
 * Trabaja en minutos desde medianoche: las horas del programa son «HH:mm» de un
 * solo día, así que no intervienen zonas horarias.
 */

export interface BloqueHorario {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  room: string;
}

/** "HH:mm" → minutos desde medianoche. `null` si no tiene esa forma. */
export function aMinutos(hhmm: unknown): number | null {
  if (typeof hhmm !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Si el bloque empieza y acaba en horas válidas, y en ese orden. */
export function rangoValido(inicio: unknown, fin: unknown): boolean {
  const a = aMinutos(inicio);
  const b = aMinutos(fin);
  return a !== null && b !== null && b > a;
}

/** Dos bloques se pisan si comparten sala y sus tramos se cruzan. */
export function sePisan(a: BloqueHorario, b: BloqueHorario): boolean {
  if (!a.room || !b.room) return false;
  // «Sala 2» y «sala 2 » son la misma.
  if (a.room.trim().toLowerCase() !== b.room.trim().toLowerCase()) return false;

  const a1 = aMinutos(a.startTime);
  const a2 = aMinutos(a.endTime);
  const b1 = aMinutos(b.startTime);
  const b2 = aMinutos(b.endTime);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return false;

  // Que uno acabe justo cuando empieza el otro no es un choque.
  return a1 < b2 && b1 < a2;
}

/** Los ids de los bloques que chocan con algún otro, para marcarlos en la pantalla. */
export function bloquesEnConflicto(bloques: BloqueHorario[]): Set<string> {
  const malos = new Set<string>();
  for (let i = 0; i < bloques.length; i++) {
    for (let j = i + 1; j < bloques.length; j++) {
      const a = bloques[i]!;
      const b = bloques[j]!;
      if (sePisan(a, b)) {
        malos.add(a._id);
        malos.add(b._id);
      }
    }
  }
  return malos;
}

/** Los que tienen la hora mal puesta: sin forma de "HH:mm" o al revés. */
export function bloquesConHoraInvalida(bloques: BloqueHorario[]): Set<string> {
  return new Set(
    bloques.filter((b) => !rangoValido(b.startTime, b.endTime)).map((b) => b._id),
  );
}
