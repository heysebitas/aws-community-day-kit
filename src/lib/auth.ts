import "server-only";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { PRODUCCION } from "./env";
import { COOKIE_SESION, DURACION_SESION } from "./sesion";
import { User, type IUser } from "@/models/user";
import { Session } from "@/models/session";
import { alcanza, puedeEliminar, type Nivel, type SeccionId } from "@/lib/permisos";

/**
 * Sesiones del panel.
 *
 * La cookie lleva un JWT firmado con el id del usuario y el de su sesión. La
 * firma sola no basta: en cada petición se comprueba además que esa sesión
 * exista en la base y sea la vigente del usuario, así que cerrar sesión —o
 * iniciarla en otro dispositivo— invalida la anterior al instante.
 */

interface JWTPayload {
  userId: string;
  sessionId: string;
}

function secreto(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET no está definida.");
  return s;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, secreto(), { expiresIn: DURACION_SESION, algorithm: "HS256" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    // El algoritmo se fija: sin esto se aceptaría cualquiera que la librería admita.
    return jwt.verify(token, secreto(), { algorithms: ["HS256"] }) as JWTPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(userId: string, sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESION, signToken({ userId, sessionId }), {
    httpOnly: true,
    secure: PRODUCCION,
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SESION);
}

export async function getAuthUser(): Promise<IUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  await connectDB();

  const session = await Session.findOne({ sessionId: payload.sessionId, userId: payload.userId });
  if (!session) return null;

  const user = await User.findById(payload.userId);
  if (!user) return null;

  // Una sola sesión viva por cuenta.
  if (user.currentSessionId !== payload.sessionId) return null;

  return user;
}

/** Exige sesión y, si se pasan, uno de esos roles. Lanza `Unauthorized` o `Forbidden`. */
export async function requireAuth(roles?: string[]): Promise<IUser> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  if (roles && !roles.includes(user.role)) throw new Error("Forbidden");
  return user;
}

export async function createSession(userId: string): Promise<string> {
  await connectDB();
  await Session.deleteMany({ userId });

  const sessionId = crypto.randomUUID();
  await Session.create({
    userId,
    sessionId,
    expiresAt: new Date(Date.now() + DURACION_SESION * 1000),
  });
  await User.findByIdAndUpdate(userId, { currentSessionId: sessionId });

  return sessionId;
}

/**
 * Como `requireAuth`, y además comprueba el permiso sobre una sección.
 *
 * El rol dice quién llega a la ruta; el permiso, qué puede hacer dentro. Va en
 * el servidor porque esconder un enlace del menú no impide llamar a la API.
 *
 *   await requireAccess("registrations", "ver", ["admin", "organizer"]);
 *
 * Sólo las cuentas de organizador pasan por la tabla de permisos.
 */
export async function requireAccess(seccion: SeccionId, minimo: Nivel, roles?: string[]): Promise<IUser> {
  const user = await requireAuth(roles);
  if (!alcanza(user, seccion, minimo)) throw new Error("Forbidden");
  return user;
}

/** Igual, para las rutas que borran. */
export async function requireDelete(seccion: SeccionId, roles?: string[]): Promise<IUser> {
  const user = await requireAuth(roles);
  if (!puedeEliminar(user, seccion)) throw new Error("Forbidden");
  return user;
}

/** Para las rutas que sirven a más de una sección: basta con tener acceso a cualquiera. */
export async function requireAnyAccess(secciones: SeccionId[], minimo: Nivel, roles?: string[]): Promise<IUser> {
  const user = await requireAuth(roles);
  if (!secciones.some((s) => alcanza(user, s, minimo))) throw new Error("Forbidden");
  return user;
}
