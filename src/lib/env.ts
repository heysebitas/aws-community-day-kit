/**
 * Las variables de entorno, leídas y comprobadas en un solo sitio.
 *
 * `comprobarEntorno()` corre al arrancar el servidor (`src/instrumentation.ts`).
 * En producción se niega a arrancar si falta algo de lo que depende la
 * seguridad; en desarrollo sólo avisa, para que el kit se pueda probar sin
 * ninguna cuenta externa.
 */

export const PRODUCCION = process.env.NODE_ENV === "production";

/**
 * Modo demo: base en memoria, correos a la consola y captcha apagado.
 * Hay que pedirlo a propósito para que nunca se active solo en un despliegue real.
 */
export const DEMO = process.env.MODO_DEMO === "1";

const tiene = (nombre: string) => !!process.env[nombre]?.trim();

type Nivel = "error" | "aviso";
type Hallazgo = { nivel: Nivel; texto: string };

export function revisarEntorno(): Hallazgo[] {
  const h: Hallazgo[] = [];
  const falta = (nivel: Nivel, nombre: string, consecuencia: string) => {
    if (!tiene(nombre)) h.push({ nivel, texto: `${nombre} no está definida: ${consecuencia}` });
  };

  if (!DEMO) falta("error", "MONGODB_URI", "no hay base de datos.");

  const secreto = process.env.JWT_SECRET ?? "";
  if (!secreto) h.push({ nivel: "error", texto: "JWT_SECRET no está definida: nadie puede iniciar sesión." });
  else if (secreto.length < 32) {
    h.push({ nivel: PRODUCCION ? "error" : "aviso", texto: "JWT_SECRET tiene menos de 32 caracteres: genera una con `openssl rand -base64 48`." });
  }

  if (!DEMO) {
    falta(PRODUCCION ? "error" : "aviso", "TURNSTILE_SECRET_KEY", "los formularios públicos quedan sin captcha.");
    falta("aviso", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "el captcha no se puede mostrar.");
  }

  const proveedor = process.env.CORREO_PROVEEDOR || (tiene("RESEND_API_KEY") ? "resend" : "");
  if (!proveedor) h.push({ nivel: "aviso", texto: "No hay proveedor de correo (RESEND_API_KEY o CORREO_PROVEEDOR=ses): los correos sólo se escriben en la consola." });
  if (proveedor === "resend") falta("aviso", "RESEND_WEBHOOK_SECRET", "no se registran entregas ni rebotes.");

  for (const v of ["AWS_REGION", "AWS_S3_BUCKET", "AWS_S3_PUBLIC_URL"]) {
    falta("aviso", v, "no se pueden subir fotos ni archivos.");
  }

  if (PRODUCCION && DEMO) {
    h.push({ nivel: "aviso", texto: "MODO_DEMO=1 en producción: los datos se pierden al reiniciar y el captcha está apagado." });
  }

  return h;
}

export function comprobarEntorno(): void {
  const hallazgos = revisarEntorno();
  for (const { nivel, texto } of hallazgos) {
    (nivel === "error" ? console.error : console.warn)(`[entorno] ${nivel === "error" ? "ERROR" : "aviso"}: ${texto}`);
  }
  const errores = hallazgos.filter((x) => x.nivel === "error");
  if (PRODUCCION && errores.length) {
    throw new Error(`Faltan ${errores.length} variables de entorno obligatorias. Revisa .env.example.`);
  }
}
