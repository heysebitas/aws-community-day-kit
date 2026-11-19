/**
 * Ayudante común de los escáneres de staff. Convierte la respuesta del
 * servidor (o su ausencia) en algo que la puerta entiende: solo un 404 es
 * «No encontrado»; una sesión caída, un permiso, un límite o la red caída
 * tienen su propio aviso. Los textos viven en `Panel.escaneo` (es/en).
 */

export type FalloEscaneo = "sesion" | "permiso" | "reintenta" | "no_encontrado";
export type EstadoEscaneo = "ok" | "ya" | FalloEscaneo;

export const TIEMPO_MAX_MS = 8000;
/** Un 409 del mismo usuario de hace menos de esto es su propio doble escaneo: se muestra como éxito. */
export const VENTANA_MISMO_USUARIO_MS = 30_000;

/** Estado HTTP (0 = sin respuesta o tiempo agotado) → qué ve quien escanea. */
export function estadoDeHttp(status: number): EstadoEscaneo {
  if (status >= 200 && status < 300) return "ok";
  if (status === 409) return "ya";
  if (status === 401) return "sesion";
  if (status === 403) return "permiso";
  if (status === 404) return "no_encontrado";
  return "reintenta"; // 0, 429, 5xx y cualquier otro: no es culpa del código escaneado
}

/** ¿Merece otro intento automático? Solo lo transitorio. */
export function esTransitorio(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

/** Un 409 del mismo usuario hace menos de 30 s es su propio escaneo repetido: éxito. */
export function esRepeticionPropia(
  data: { checkedInBy?: string | null; checkedInAt?: string | null },
  usuarioId: string | undefined,
  ahora = Date.now(),
): boolean {
  if (!usuarioId || !data.checkedInBy || data.checkedInBy !== usuarioId || !data.checkedInAt) return false;
  const t = Date.parse(data.checkedInAt);
  return Number.isFinite(t) && ahora - t >= 0 && ahora - t < VENTANA_MISMO_USUARIO_MS;
}

export type RespuestaEscaneo<T> = { status: number; estado: EstadoEscaneo; data: T };

/** Idioma de la ruta actual, para mandar al login. */
function idiomaActual(): string {
  const m = /^\/(es|en)(\/|$)/.exec(window.location.pathname);
  return m?.[1] ?? "es";
}

/** 401: a iniciar sesión otra vez, con el aviso de que se abrió en otro dispositivo. */
export function irAlLoginPorSesion(): void {
  window.location.assign(`/${idiomaActual()}/admin/login?aviso=sesion`);
}

async function intentar<T>(url: string, init: RequestInit): Promise<{ status: number; data: T }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIEMPO_MAX_MS) });
    const data = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, data };
  } catch {
    return { status: 0, data: {} as T };
  }
}

/**
 * POST JSON con tiempo máximo de 8 s y un reintento si el fallo es transitorio.
 * Nunca lanza: sin respuesta, `status` es 0 y `estado` «reintenta». Con 401
 * lleva al login.
 */
export async function postEscaneo<T = Record<string, unknown>>(url: string, cuerpo: unknown): Promise<RespuestaEscaneo<T>> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  };
  let r = await intentar<T>(url, init);
  if (esTransitorio(r.status)) r = await intentar<T>(url, init);
  const estado = estadoDeHttp(r.status);
  if (estado === "sesion" && typeof window !== "undefined") irAlLoginPorSesion();
  return { ...r, estado };
}

/** Parámetros de la cámara compartidos por todos los escáneres. */
export function configCamara() {
  return {
    fps: 10,
    qrbox: (ancho: number, alto: number) => {
      const lado = Math.max(120, Math.floor(Math.min(ancho, alto) * 0.7));
      return { width: lado, height: lado };
    },
    formatsToSupport: [0], // Html5QrcodeSupportedFormats.QR_CODE
    videoConstraints: { facingMode: "environment", width: { ideal: 640 } },
  };
}

/** Pausa la cámara al ocultar la pestaña y la reanuda al volver. Devuelve la función que lo desengancha. */
export function pausarEnSegundoPlano(
  obtener: () => unknown,
  hayResultado: () => boolean,
): () => void {
  const alCambiar = () => {
    const s = obtener() as { pause: (v?: boolean) => void; resume: () => void } | null;
    if (!s) return;
    try {
      if (document.hidden) s.pause(true);
      else if (!hayResultado()) s.resume();
    } catch { /* detenido */ }
  };
  document.addEventListener("visibilitychange", alCambiar);
  return () => document.removeEventListener("visibilitychange", alCambiar);
}
