/** Lo mínimo que el cliente usa de `useTranslations("Errores")`. */
type Traductor = {
  (clave: string, valores?: Record<string, string | number>): string;
  has: (clave: string) => boolean;
};

/** Códigos cuyo `error` del servidor dice algo más concreto (qué campo falló) que el texto genérico. */
const DETALLE_DEL_SERVIDOR = new Set(["datos_invalidos"]);

/**
 * El texto de un error de la API para mostrarlo en el idioma del sitio.
 *
 * El servidor devuelve `{ code, error }`: `code` se traduce con `Errores.<code>`;
 * si no hay código conocido se usa el `error` en español (compatibilidad) y,
 * al final, `respaldo`. En un 500 se añade la referencia de la petición.
 */
export function textoDeError(t: Traductor, datos: unknown, respaldo: string): string {
  const d = (datos && typeof datos === "object" ? datos : {}) as { code?: unknown; error?: unknown; requestId?: unknown };
  const code = typeof d.code === "string" ? d.code : "";
  const error = typeof d.error === "string" && d.error ? d.error : "";
  if (code && t.has(code) && !(DETALLE_DEL_SERVIDOR.has(code) && error)) {
    const base = t(code);
    return typeof d.requestId === "string" && t.has("con_referencia") && code === "error_interno"
      ? `${base} ${t("con_referencia", { id: d.requestId })}`
      : base;
  }
  return error || respaldo;
}
