"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/** El nombre del speaker, escribiéndose. */

/** Si el sistema pide menos movimiento. */
function useMenosMovimiento() {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", avisar);
      return () => mq.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function NombreTecleado({ texto, className }: { texto: string; className?: string }) {
  const quieto = useMenosMovimiento();
  const [letras, setLetras] = useState(0);

  useEffect(() => {
    if (quieto) return;
    // ~38 ms por letra: rápido para no hacerse esperar, lento para que se lea
    // como escritura y no como un parpadeo.
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setLetras(i);
      if (i >= texto.length) clearInterval(t);
    }, 38);
    return () => clearInterval(t);
  }, [texto, quieto]);

  const visible = quieto ? texto : texto.slice(0, letras);
  const terminado = quieto || letras >= texto.length;

  return (
    <h1 className={cn("m-0", className)}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {visible}
        <span
          className={cn(
            "ml-1 inline-block w-[0.07em] bg-acento align-baseline",
            // El cursor sólo parpadea al terminar: mientras escribe ya hay
            // movimiento de sobra.
            terminado && "animate-pulse",
          )}
          style={{ height: "0.78em" }}
        />
      </span>
    </h1>
  );
}
