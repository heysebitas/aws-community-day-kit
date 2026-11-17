import React from "react";
import { cn } from "@/lib/utils";

function renderAnswer(text: string): React.ReactNode[] {
  const lines = text.split(/\n/);
  return lines.flatMap((line, li) => {
    const parts: React.ReactNode[] = line
      .split(/(https?:\/\/[^\s]+)/g)
      .map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={`${li}-${i}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-acento underline underline-offset-2 break-all transition-colors hover:text-acento-claro"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={`${li}-${i}`}>{part}</React.Fragment>
        ),
      );
    if (li < lines.length - 1) parts.push(<br key={`br-${li}`} />);
    return parts;
  });
}

interface AccordionButton {
  label: string;
  url: string;
}

interface AccordionItem {
  id: string;
  question: string;
  answer: string;
  buttons?: AccordionButton[];
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  return (
    <div className={cn("border-t-2 border-acento/30", className)}>
      {items.map((item, index) => (
        // Las respuestas están en el HTML (Ctrl+F y buscadores las ven); `name`
        // hace el grupo exclusivo donde el navegador lo soporta.
        <details
          key={item.id}
          name="faq"
          className="group border-b-2 border-acento/30 transition-colors duration-300 hover:bg-acento/[0.04] open:bg-acento/[0.07]"
        >
          <summary className="flex min-h-11 w-full cursor-pointer list-none items-start gap-4 px-3 py-5 text-left [&::-webkit-details-marker]:hidden">
            <span className="etiqueta mt-0.5 shrink-0 text-acento">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 font-display text-lg font-medium lowercase leading-snug tracking-tight text-surface-50 transition-colors duration-300 group-hover:text-acento group-open:text-acento md:text-xl">
              {item.question}
            </span>
            {/* Signo que gira de + a −: más legible que un chevron a la altura
                de un titular. */}
            <span
              className="mt-0.5 shrink-0 text-2xl leading-none text-acento transition-transform duration-300 group-open:rotate-[135deg]"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p className={`pl-11 pr-10 font-mono text-sm leading-relaxed text-surface-300 md:text-base ${item.buttons?.length ? "pb-3" : "pb-6"}`}>
            {renderAnswer(item.answer)}
          </p>
          {item.buttons && item.buttons.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-6 pl-11">
              {item.buttons.map((btn) => (
                <a
                  key={btn.url}
                  href={btn.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-acento px-4 py-1.5 font-mono text-sm text-acento transition-colors hover:bg-acento hover:text-tinta"
                >
                  {btn.label}
                </a>
              ))}
            </div>
          )}
        </details>
      ))}
    </div>
  );
}
