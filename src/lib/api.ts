import { AsyncLocalStorage } from "node:async_hooks";
import { AuthError } from "@/lib/auth";

/** Cuerpo o parámetros mal formados: `ruta()` responde 400 con este mensaje. */
export class EntradaInvalida extends Error {
  readonly status = 400;
  /** Código para que el cliente traduzca el error (`Errores.<code>`). */
  readonly code?: string;
  constructor(mensaje: string, code?: string) {
    super(mensaje);
    this.code = code;
  }
}

const contexto = new AsyncLocalStorage<{ id: string }>();

/** Id de la petición en curso (dentro de `ruta()`), o undefined fuera de ella. */
export function idPeticion(): string | undefined {
  return contexto.getStore()?.id;
}

/** Escribe un error con la etiqueta y el id de la petición; para los `catch` que antes callaban. */
export function logError(etiqueta: string, e: unknown): void {
  const id = idPeticion();
  console.error(id ? `[${id}] ${etiqueta}` : etiqueta, e);
}

const ID_VALIDO = /^[A-Za-z0-9._-]{8,64}$/;

function idDe(args: unknown[]): string {
  const req = args[0];
  if (req instanceof Request) {
    const dado = req.headers.get("x-request-id");
    if (dado && ID_VALIDO.test(dado)) return dado;
  }
  return crypto.randomUUID();
}

function conId(res: Response, id: string): Response {
  try {
    res.headers.set("x-request-id", id);
    return res;
  } catch {
    // Cabeceras inmutables (respuesta de un fetch): se copia la respuesta.
    const copia = new Response(res.body, res);
    copia.headers.set("x-request-id", id);
    return copia;
  }
}

/**
 * Envuelve un handler de `src/app/api`: traduce `AuthError` a 401/403,
 * `EntradaInvalida` a 400 y cualquier otro fallo a un 500 con log (el mensaje y la etiqueta del log se pueden fijar por ruta).
 * Cada petición lleva un id (`x-request-id` si viene, o uno nuevo) en el log y en la respuesta.
 */
export function ruta<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
  opciones: { etiqueta?: string; error?: string; code?: string } = {},
) {
  return (...args: A): Promise<Response> => {
    const id = idDe(args);
    return contexto.run({ id }, async () => {
      try {
        return conId(await handler(...args), id);
      } catch (e) {
        if (e instanceof AuthError) {
          return conId(Response.json({ code: e.status === 401 ? "no_autenticado" : "sin_permiso", error: e.message }, { status: e.status }), id);
        }
        if (e instanceof EntradaInvalida) {
          return conId(Response.json({ code: e.code ?? "entrada_invalida", error: e.message }, { status: 400 }), id);
        }
        logError(opciones.etiqueta ?? "ruta", e);
        return conId(
          Response.json({ code: opciones.code ?? "error_interno", error: opciones.error ?? "Error interno", requestId: id }, { status: 500 }),
          id,
        );
      }
    });
  };
}
