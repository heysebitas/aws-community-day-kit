/**
 * CSV que Excel abre bien: con marca de orden de bytes al principio —sin ella
 * los acentos salen rotos en Windows— y saltos de línea `\r\n`.
 */

/**
 * Con estos caracteres al principio, Excel y Google Sheets leen la celda como
 * fórmula y la ejecutan al abrir el archivo. Los datos vienen de formularios
 * públicos, así que cualquiera puede escribir `=HYPERLINK(...)` en su nombre.
 */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

/** Entrecomilla la celda si lleva coma, comillas o saltos de línea. */
export function escapeCsv(value: string): string {
  // El apóstrofo delante es lo que evita la fórmula: las hojas lo leen como
  // marca de texto y muestran el valor tal cual, sin ejecutarlo.
  const texto = INICIO_DE_FORMULA.test(value) ? `'${value}` : value;
  if (texto.includes(",") || texto.includes('"') || texto.includes("\n") || texto.includes("\r")) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Arma una fila a partir de celdas sueltas, escapando cada una. */
export function csvRow(cells: (string | null | undefined)[]): string {
  return cells.map((c) => escapeCsv(c ?? "")).join(",");
}

export function csvResponse(csv: string, filename: string): Response {
  // La marca de orden de bytes al principio: sin ella Excel no reconoce el
  // UTF-8 y las tildes y la eñe salen rotas.
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
