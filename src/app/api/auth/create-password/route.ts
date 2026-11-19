import { ruta, logError } from "@/lib/api";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { PasswordToken } from "@/models/password-token";
import { User } from "@/models/user";
import { Session } from "@/models/session";
import { getIp, rateLimit } from "@/lib/rate-limit";

export const POST = ruta(async (request: NextRequest) => {
  try {
    const rl = rateLimit(`token:${getIp(request)}`, 20, 15 * 60 * 1000);
    if (!rl.ok) return Response.json({ code: "demasiados_intentos", error: "Demasiados intentos. Intenta en unos minutos." }, { status: 429 });

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (typeof parsed !== "object" || parsed === null) throw new Error("invalid body");
      body = parsed as Record<string, unknown>;
    } catch {
      return Response.json({ code: "solicitud_invalida", error: "Solicitud inválida" }, { status: 400 });
    }
    const { token, password } = body;

    // Exige strings: un objeto en `token` (ej. {"$ne":null}) sería inyección NoSQL.
    if (typeof token !== "string" || typeof password !== "string" || !token || !password) {
      return Response.json({ code: "token_password_requeridos", error: "Token y contraseña son requeridos" }, { status: 400 });
    }

    if (password.length < 10 || password.length > 200) {
      return Response.json({ code: "password_longitud", error: "La contraseña debe tener entre 10 y 200 caracteres" }, { status: 400 });
    }

    await connectDB();

    const passwordToken = await PasswordToken.findOne({
      token,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!passwordToken) {
      return Response.json({ code: "token_invalido", error: "Token inválido o expirado" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.findByIdAndUpdate(passwordToken.userId, { passwordHash, currentSessionId: null });
    await PasswordToken.findByIdAndUpdate(passwordToken._id, { usedAt: new Date() });
    await Session.deleteMany({ userId: passwordToken.userId });

    return Response.json({ ok: true });
  } catch (e) {
    logError("auth/create-password POST", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "auth/create-password POST" });
