"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { CanvasProfile } from "./_datos";

export function useLista(perfiles: CanvasProfile[], indice: number, setIndice: (i: number) => void, buscar: string, filtroEstado: string, filtroSubida: string) {
  /** La lista que se recorre: la búsqueda más los dos filtros. */
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return perfiles
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => {
        const texto = !q || p.name.toLowerCase().includes(q) || (p.talkTitle ?? "").toLowerCase().includes(q);
        const estado = filtroEstado === "all" || p.status === filtroEstado;
        const subida =
          filtroSubida === "all" ||
          (filtroSubida === "si" ? p.cardApproved : !p.cardApproved);
        return texto && estado && subida;
      });
  }, [perfiles, buscar, filtroEstado, filtroSubida]);

  /** Dónde cae la persona abierta dentro de la lista filtrada. */
  const posicion = lista.findIndex(({ i }) => i === indice);

  const irA = useCallback(
    (salto: number) => {
      if (!lista.length) return;
      const actual = lista.findIndex(({ i }) => i === indice);
      // Si la persona abierta se quedó fuera del filtro, se entra por el borde.
      const siguiente = actual < 0 ? (salto > 0 ? 0 : lista.length - 1) : actual + salto;
      const destino = lista[Math.min(lista.length - 1, Math.max(0, siguiente))];
      if (destino) setIndice(destino.i);
    },
    [lista, indice],
  );

  /** Cuántos hay en cada estado, para enseñarlo en el desplegable. */
  const cuenta = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of perfiles) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [perfiles]);

  const subidas = useMemo(() => perfiles.filter((p) => p.cardApproved).length, [perfiles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dentroDeCampo = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName);
      if (dentroDeCampo) return;
      if (e.key === "ArrowLeft") irA(-1);
      if (e.key === "ArrowRight") irA(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [irA]);

  /** A quién se le sube la tarjeta con el botón de lote. */
  const hayFiltro = filtroEstado !== "all" || filtroSubida !== "all" || !!buscar.trim();

  return { lista, hayFiltro, posicion, irA, cuenta, subidas };
}
