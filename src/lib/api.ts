import { AuthError } from "@/lib/auth";

/** Cuerpo o parámetros mal formados: `ruta()` responde 400 con este mensaje. */
export class EntradaInvalida extends Error {
  readonly status = 400;
}

/**
 * Envuelve un handler de `src/app/api`: traduce `AuthError` a 401/403,
 * `EntradaInvalida` a 400 y cualquier otro fallo a un 500 con log (el mensaje y la etiqueta del log se pueden fijar por ruta).
 */
export function ruta<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
  opciones: { etiqueta?: string; error?: string } = {},
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof EntradaInvalida) return Response.json({ error: e.message }, { status: 400 });
      if (opciones.etiqueta) console.error(opciones.etiqueta, e);
      else console.error(e);
      return Response.json({ error: opciones.error ?? "Error interno" }, { status: 500 });
    }
  };
}
