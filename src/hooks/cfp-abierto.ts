// Sin "use client": lo usan el layout (servidor) y el provider (cliente).
/** Si la convocatoria sigue abierta en `ahora` (ms). */
export function cfpAbierto(cierre: string, ahora: number): boolean {
  return ahora <= new Date(cierre).getTime();
}
