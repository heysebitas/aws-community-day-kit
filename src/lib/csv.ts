/**
 * CSV que Excel abre bien: con marca de orden de bytes al principio —sin ella
 * los acentos salen rotos en Windows— y saltos de línea `\r\n`.
 */

/** Entrecomilla la celda si lleva coma, comillas o saltos de línea. */
export function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Arma una fila a partir de celdas sueltas, escapando cada una. */
export function csvRow(cells: (string | null | undefined)[]): string {
  return cells.map((c) => escapeCsv(c ?? "")).join(",");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
