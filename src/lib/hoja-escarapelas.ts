/**
 * Cuántas escarapelas caben en una hoja y cuántas hojas o etiquetas gasta un
 * lote. Sin dependencias de servidor: el panel lo usa para avisar antes de imprimir.
 */

export type Papel = "rollo" | "a4" | "carta";

/** Ancho × alto en mm. */
export const HOJAS: Record<Exclude<Papel, "rollo">, [number, number]> = {
  a4: [210, 297],
  carta: [215.9, 279.4],
};

/** Lo que casi ninguna impresora de oficina alcanza a imprimir en el borde. */
export const BORDE_HOJA_MM = 5;

export type PlanHoja = {
  cols: number; rows: number; porHoja: number;
  /** La escarapela va girada 90° en la hoja porque así caben más. */
  girada: boolean;
  /** Ancho y alto de la hoja en mm. */
  hoja: [number, number];
};

export const papelDe = (v: unknown): Papel => (v === "a4" || v === "carta" ? v : "rollo");

/** La rejilla que más escarapelas mete en la hoja, probando también con la escarapela girada. */
export function planDeHoja(papel: Exclude<Papel, "rollo">, anchoMm: number, altoMm: number): PlanHoja {
  const hoja = HOJAS[papel];
  const util = [hoja[0] - 2 * BORDE_HOJA_MM, hoja[1] - 2 * BORDE_HOJA_MM];
  // Un poco de holgura: 0,01 mm de redondeo no debe quitar una fila entera.
  const caben = (total: number, lado: number) => (lado > 0 ? Math.floor((total + 0.01) / lado) : 0);
  const recta = { cols: caben(util[0]!, anchoMm), rows: caben(util[1]!, altoMm), girada: false };
  const girada = { cols: caben(util[0]!, altoMm), rows: caben(util[1]!, anchoMm), girada: true };
  const mejor = girada.cols * girada.rows > recta.cols * recta.rows ? girada : recta;
  return { ...mejor, porHoja: mejor.cols * mejor.rows, hoja };
}

/** Escarapelas que entran en cada hoja o etiqueta del preset (0 si no cabe ninguna). */
export function porPagina(p: { papel?: unknown; widthMm: number; heightMm: number; perLabel?: number }): number {
  const papel = papelDe(p.papel);
  if (papel === "rollo") return p.perLabel === 2 ? 2 : 1;
  return planDeHoja(papel, p.widthMm, p.heightMm).porHoja;
}

/** Hojas o etiquetas que gasta un lote, contando las casillas que se saltan en la primera hoja. */
export function paginasDeLote(personas: number, porPag: number, saltar = 0): number {
  if (personas <= 0 || porPag <= 0) return 0;
  return Math.ceil((personas + saltar) / porPag);
}
