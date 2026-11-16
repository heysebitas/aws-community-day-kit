import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { EmailCampana } from "@/models/email-campana";
import { EmailEnvio, ESTADOS_ENVIO, type EstadoEnvio } from "@/models/email-envio";

export const dynamic = "force-dynamic";

/** Una campaña, persona por persona. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAccess("correos", "ver", ["admin", "organizer"]);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Id inválido" }, { status: 400 });
    }

    await connectDB();

    const campana = await EmailCampana.findById(id).lean();
    if (!campana) return Response.json({ error: "No encontrada" }, { status: 404 });

    const pedido = request.nextUrl.searchParams.get("estado");
    const estado = ESTADOS_ENVIO.includes(pedido as EstadoEnvio) ? (pedido as EstadoEnvio) : null;

    const consulta: Record<string, unknown> = { campana: campana._id };
    if (estado) consulta.estado = estado;

    // Los fallos primero: es lo que se viene a ver.
    const ORDEN: Record<EstadoEnvio, number> = {
      rebotado: 0, queja: 1, fallido: 2, enviado: 3, entregado: 4,
    };

    const envios = await EmailEnvio.find(consulta).limit(1000).lean();
    envios.sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || a.nombre.localeCompare(b.nombre));

    const porEstado: Record<string, number> = {};
    for (const e of await EmailEnvio.aggregate<{ _id: string; n: number }>([
      { $match: { campana: campana._id } },
      { $group: { _id: "$estado", n: { $sum: 1 } } },
    ])) {
      porEstado[e._id] = e.n;
    }

    return Response.json({
      campana: {
        id: String(campana._id),
        plantilla: campana.plantilla,
        nombrePlantilla: campana.nombrePlantilla,
        asunto: campana.asunto,
        resumenAudiencia: campana.resumenAudiencia,
        estado: campana.estado,
        total: campana.total,
        enviados: campana.enviados,
        fallidos: campana.fallidos,
        lanzadaPor: campana.lanzadaPor,
        createdAt: campana.createdAt,
        entregas: porEstado,
      },
      envios: envios.map((e) => ({
        id: String(e._id),
        email: e.email,
        nombre: e.nombre,
        publico: e.publico,
        estado: e.estado,
        motivo: e.motivo,
        actualizadoEn: e.updatedAt,
      })),
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    console.error("[campanas/detalle]", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
