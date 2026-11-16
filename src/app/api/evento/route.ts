import { datosDelEvento, idiomaPedido } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * Los datos públicos del evento en JSON: fecha, sede, tracks, speakers, agenda
 * y preguntas frecuentes. Es de sólo lectura y se puede pedir desde cualquier
 * origen, para que lo usen bots, asistentes y sitios de la comunidad.
 */
export async function GET(request: Request) {
  const idioma = idiomaPedido(new URL(request.url).searchParams.get("lang"));
  return Response.json(await datosDelEvento(idioma), {
    headers: { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" },
  });
}
