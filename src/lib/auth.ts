import "server-only";
import jwt from "jsonwebtoken";
import { cache } from "react";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { PRODUCCION } from "./env";
import { COOKIE_SESION, COOKIE_SESION_VIEJA, DURACION_SESION, leerTokenSesion } from "./sesion";
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
  // La cookie vieja no debe sobrevivir al cierre de sesión.
  if (COOKIE_SESION_VIEJA !== COOKIE_SESION) cookieStore.delete(COOKIE_SESION_VIEJA);
}

/**
 * La sesión y el usuario se piden con lo que dice el token, no uno con el
 * resultado del otro, así que van en paralelo. `cache` lo resuelve una vez por
 * petición: `requireAuth` y `createLog` comparten la misma consulta.
 */
const usuarioDeSesion = cache(async (token: string): Promise<IUser | null> => {
  const payload = verifyToken(token);
  if (!payload) return null;

  await connectDB();

  const [session, user] = await Promise.all([
    Session.findOne({ sessionId: payload.sessionId, userId: payload.userId }).lean(),
    User.findById(payload.userId).lean(),
  ]);
  if (!session || !user) return null;

  // Una sola sesión viva por cuenta.
  if (user.currentSessionId !== payload.sessionId) return null;

  return user as unknown as IUser;
});

export async function getAuthUser(): Promise<IUser | null> {
  const cookieStore = await cookies();
  const token = leerTokenSesion((n) => cookieStore.get(n));
  if (!token) return null;
  return usuarioDeSesion(token);
}

/** Fallo de sesión o de permiso; `ruta()` lo traduce a su código HTTP. */
export class AuthError extends Error {
  constructor(readonly status: 401 | 403) {
    super(status === 401 ? "Unauthorized" : "Forbidden");
    this.name = "AuthError";
  }
}

/** Exige sesión y, si se pasan, uno de esos roles. Lanza `AuthError` (401 o 403). */
export async function requireAuth(roles?: string[]): Promise<IUser> {
  const user = await getAuthUser();
  if (!user) throw new AuthError(401);
  if (roles && !roles.includes(user.role)) throw new AuthError(403);
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
  if (!alcanza(user, seccion, minimo)) throw new AuthError(403);
  return user;
}

/** Igual, para las rutas que borran. */
export async function requireDelete(seccion: SeccionId, roles?: string[]): Promise<IUser> {
  const user = await requireAuth(roles);
  if (!puedeEliminar(user, seccion)) throw new AuthError(403);
  return user;
}

/** Para las rutas que sirven a más de una sección: basta con tener acceso a cualquiera. */
export async function requireAnyAccess(secciones: SeccionId[], minimo: Nivel, roles?: string[]): Promise<IUser> {
  const user = await requireAuth(roles);
  if (!secciones.some((s) => alcanza(user, s, minimo))) throw new AuthError(403);
  return user;
}
