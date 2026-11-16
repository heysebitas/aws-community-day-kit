import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { PasswordToken } from "@/models/password-token";
import { getIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return Response.json({ valid: false, reason: "not_found" }, { status: 400 });
  }

  try {
    const rl = rateLimit(`token:${getIp(request)}`, 20, 15 * 60 * 1000);
    if (!rl.ok) return Response.json({ error: "Demasiados intentos. Intenta en unos minutos." }, { status: 429 });

    await connectDB();

    const passwordToken = await PasswordToken.findOne({ token });

    if (!passwordToken) {
      return Response.json({ valid: false, reason: "not_found" });
    }

    if (passwordToken.usedAt) {
      return Response.json({ valid: false, reason: "used" });
    }

    if (passwordToken.expiresAt <= new Date()) {
      return Response.json({ valid: false, reason: "expired" });
    }

    return Response.json({ valid: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
