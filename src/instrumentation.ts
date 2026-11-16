/** Corre una vez al arrancar el servidor. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { comprobarEntorno } = await import("@/lib/env");
  comprobarEntorno();
}
