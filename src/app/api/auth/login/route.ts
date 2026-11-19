import { ruta, logError } from "@/lib/api";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { createSession, setAuthCookie } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { rateLimit, getIp, isBlocked, recordFail, clearFails } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";
import { normalizeEmail } from "@/lib/normalize";

/** Un hash cualquiera, para gastar el mismo tiempo cuando la cuenta no existe. Se calcula la primera vez que hace falta. */
let hashDeRelleno: Promise<string> | undefined;
const HASH_DE_RELLENO = () => (hashDeRelleno ??= bcrypt.hash("relleno", 12));

export const POST = ruta(async (request: NextRequest) => {
  try {
    // La sede entera sale por una IP: por IP solo hay un tope alto contra barridos,
    // y los fallos se cuentan por IP y correo.
    const ip = getIp(request);
    const rl = rateLimit(`login-ip:${ip}`, 100, 15 * 60 * 1000);
    if (!rl.ok) {
      return Response.json(
        { code: "demasiados_intentos", error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // Si el body no es JSON válido (un objeto), es error del cliente (400), no un 500.
    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (typeof parsed !== "object" || parsed === null) throw new Error("invalid body");
      body = parsed as Record<string, unknown>;
    } catch {
      return Response.json({ code: "solicitud_invalida", error: "Solicitud inválida" }, { status: 400 });
    }
    const { email, password, captchaToken } = body;

    // Verifica el captcha primero, así cada intento consume un token nuevo (sin reuso).
    const okCaptcha = await verifyCaptcha(typeof captchaToken === "string" ? captchaToken : "");
    if (!okCaptcha) {
      return Response.json(
        { code: "captcha_invalido", error: "Captcha inválido o expirado. Recárgalo e intenta de nuevo." },
        { status: 400 },
      );
    }

    // Exige que email y password sean strings (evita inyección NoSQL y 500 con objetos).
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || password.length > 200) {
      return Response.json({ code: "credenciales_invalidas", error: "Credenciales inválidas" }, { status: 401 });
    }

    // El formato se valida en el servidor: una petición armada a mano se salta el del navegador.
    const checked = normalizeEmail(email);
    if (!checked.ok) {
      return Response.json({ code: "correo_invalido", error: checked.reason }, { status: 400 });
    }

    const claveFallos = `login:${ip}:${checked.value}`;
    const bloqueo = isBlocked(claveFallos, 10);
    if (bloqueo.blocked) {
      return Response.json(
        { code: "demasiados_intentos", error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(bloqueo.retryAfterMs / 1000)) } },
      );
    }

    await connectDB();

    const user = await User.findOne({ email: checked.value });
    // Se compara siempre, haya cuenta o no: si no, el tiempo de respuesta delata qué correos existen.
    const valid = await bcrypt.compare(password, user?.passwordHash || await HASH_DE_RELLENO());
    if (!user || !user.passwordHash || !valid) {
      recordFail(claveFallos, 10, 15 * 60 * 1000);
      return Response.json({ code: "credenciales_invalidas", error: "Credenciales inválidas" }, { status: 401 });
    }

    clearFails(claveFallos);
    const sessionId = await createSession(user._id.toString());
    await setAuthCookie(user._id.toString(), sessionId);
    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    await createLog({
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      action: "USER_LOGIN",
      target: user.email,
    });

    return Response.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    logError("auth/login POST", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "auth/login POST" });
