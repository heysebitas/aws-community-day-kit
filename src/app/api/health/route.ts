import { ruta, logError } from "@/lib/api";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIN_CACHE = { "Cache-Control": "no-store" };
const ESPERA_BASE_MS = 3000;

/**
 * Salud del contenedor. Sin `?db=1` sólo dice que el proceso responde; con él
 * hace un `ping` a Mongo. Nunca devuelve datos ni el motivo del fallo.
 */
export const GET = ruta(async (request: Request) => {
  // Holgado: el HEALTHCHECK de Docker y un monitor externo piden desde pocas IP.
  const limite = rateLimit(`health:${getIp(request)}`, 120, 60_000);
  if (!limite.ok) {
    return new NextResponse(null, {
      status: 429,
      headers: { ...SIN_CACHE, "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) },
    });
  }

  if (new URL(request.url).searchParams.get("db") !== "1") {
    return NextResponse.json({ ok: true }, { headers: SIN_CACHE });
  }

  try {
    await Promise.race([
      (async () => {
        await connectDB();
        await mongoose.connection.db!.admin().ping();
      })(),
      new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo agotado")), ESPERA_BASE_MS).unref()),
    ]);
    return NextResponse.json({ ok: true }, { headers: SIN_CACHE });
  } catch (e) {
    logError("health GET", e);
    return NextResponse.json({ ok: false }, { status: 503, headers: SIN_CACHE });
  }
}, { etiqueta: "health GET" });
