import { idiomaPedido, llmsTxt } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** El índice del sitio para asistentes de IA (llmstxt.org). `?lang=en` lo da en otro idioma. */
export async function GET(request: Request) {
  const idioma = idiomaPedido(new URL(request.url).searchParams.get("lang"));
  return new Response(await llmsTxt(idioma), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
