"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/block-section";

export type CodeSegment = { text: string; accent?: boolean };
/** Un párrafo = lista de segmentos; los `accent` van en el color del tema y en bold. */
export type CodeParagraph = CodeSegment[];

type Line = { number: number; segments: CodeSegment[] };

/**
 * Bloque de texto renderizado como si estuviera abierto en un editor: canaleta
 * con números de línea y wrap calculado a mano contra el ancho real del
 * contenedor (por eso la numeración coincide con lo que se ve, no con párrafos).
 */
export function CodeLines({
  paragraphs,
  tone = "ink",
  className,
}: {
  paragraphs: CodeParagraph[];
  tone?: Tone;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const layout = () => {
      const width = el.offsetWidth;
      if (!width) return;

      const cs = getComputedStyle(el);

      /** El ancho del texto se mide en un lienzo, no en el documento. */
      const lienzo = document.createElement("canvas").getContext("2d");
      if (!lienzo) return;
      lienzo.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

      /** El espaciado entre letras se suma a mano. */
      const espaciado = parseFloat(cs.letterSpacing) || 0;

      const fits = (text: string) =>
        lienzo.measureText(text).width + espaciado * text.length <= width;

      const out: Line[] = [];
      let n = 1;

      paragraphs.forEach((paragraph, pIndex) => {
        const words = paragraph.flatMap((seg) =>
          seg.text.split(/\s+/).filter(Boolean).map((word) => ({ word, accent: seg.accent })),
        );

        let plain = "";
        let segments: CodeSegment[] = [];

        const push = () => {
          if (segments.length) out.push({ number: n++, segments });
          plain = "";
          segments = [];
        };

        for (const { word, accent } of words) {
          const candidate = plain ? `${plain} ${word}` : word;
          if (plain && !fits(candidate)) push();
          plain = plain ? `${plain} ${word}` : word;
          const last = segments[segments.length - 1];
          if (last && !!last.accent === !!accent) last.text += ` ${word}`;
          else segments.push({ text: segments.length ? ` ${word}` : word, accent });
        }
        push();

        // Línea en blanco entre párrafos, numerada — igual que en un archivo real.
        if (pIndex < paragraphs.length - 1) out.push({ number: n++, segments: [] });
      });

      setLines(out);
    };

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paragraphs]);

  return (
    <div className={cn("font-mono text-sm leading-relaxed md:text-base", className)}>
      <div className="flex">
        {/* Canaleta de números */}
        <div
          className={cn(
            "mr-4 shrink-0 select-none text-right",
            tone === "block" ? "text-tinta/35" : "text-surface-600",
          )}
          aria-hidden="true"
        >
          {/* El número va en un pseudo-elemento: es decoración, no texto que leer. */}
          {lines.map((line) => (
            <div key={line.number} data-n={line.number} className="tabular-nums before:content-[attr(data-n)]" />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Medidor invisible: da el ancho real para calcular el wrap */}
          <div ref={ref} className="h-0 overflow-hidden" aria-hidden="true" />
          {lines.map((line) => (
            <div key={line.number} className="whitespace-pre-wrap break-words">
              {line.segments.length === 0 ? (
                "\u00A0"
              ) : (
                line.segments.map((seg, i) => (
                  <span
                    key={i}
                    className={cn(
                      seg.accent
                        ? tone === "block"
                          ? "font-bold text-acento-profundo"
                          : "font-bold text-acento"
                        : tone === "block"
                          ? "text-tinta/80"
                          : "text-surface-300",
                    )}
                  >
                    {seg.text}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
