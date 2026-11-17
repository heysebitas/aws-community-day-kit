export type RespuestaJson<T> = { ok: boolean; status: number; data: T; error: string | null };

type Avisar = (mensaje: string, tipo?: "success" | "error" | "info") => void;

type Opciones = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Si se pasa, un fallo (red o estado no 2xx) se avisa con él; normalmente `useToast().toast`. */
  avisar?: Avisar;
  /** Texto cuando la respuesta fallida no trae `error`. */
  errorPorDefecto?: string;
  /** Texto cuando no hay respuesta (red caída). */
  errorDeRed?: string;
};

/** fetch + parseo JSON sin lanzar: un cuerpo ilegible o un corte de red no rompen al llamador. */
export async function pedirJson<T = Record<string, unknown>>(
  url: string,
  { body, avisar, errorPorDefecto = "Error", errorDeRed = "Error de conexión", headers, ...resto }: Opciones = {},
): Promise<RespuestaJson<T>> {
  const init: RequestInit = { ...resto };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json", ...(headers as Record<string, string> | undefined) };
  } else if (headers) init.headers = headers;
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => ({}))) as T;
    const msg = (data as { error?: unknown }).error;
    const error = res.ok ? null : typeof msg === "string" && msg ? msg : errorPorDefecto;
    if (error) avisar?.(error, "error");
    return { ok: res.ok, status: res.status, data, error };
  } catch {
    avisar?.(errorDeRed, "error");
    return { ok: false, status: 0, data: {} as T, error: errorDeRed };
  }
}
