/** Entradas del navegador que decide `esModesto`; se pasan aparte para probarlas. */
export type SenalesDispositivo = {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

const LENTAS = ["slow-2g", "2g", "3g"];

/** Verdadero si el dispositivo o la red son modestos. Falso en el servidor. */
export function esModesto(n: SenalesDispositivo | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  if (!n) return false;
  const c = n.connection;
  return (
    (n.deviceMemory !== undefined && n.deviceMemory <= 2) ||
    (n.hardwareConcurrency !== undefined && n.hardwareConcurrency <= 4) ||
    !!c?.saveData ||
    (!!c?.effectiveType && LENTAS.includes(c.effectiveType))
  );
}

/** Misma lógica en una línea para el `<head>`: pone `modesto` en `<html>` antes de pintar. Mantener en sincronía con `esModesto`. */
export const SCRIPT_MODESTO =
  "(function(n,c){if(n.deviceMemory<=2||n.hardwareConcurrency<=4||c&&(c.saveData||/^(slow-)?[23]g$/.test(c.effectiveType)))document.documentElement.classList.add('modesto')})(navigator,navigator.connection)";
