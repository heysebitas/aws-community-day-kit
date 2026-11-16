import { idiomaPedido, llmsFull } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** Todo lo público del evento en un solo documento Markdown. `?lang=en` lo da en otro idioma. */
export async function GET(request: Request) {
  const idioma = idiomaPedido(new URL(request.url).searchParams.get("lang"));
  return new Response(await llmsFull(idioma), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
