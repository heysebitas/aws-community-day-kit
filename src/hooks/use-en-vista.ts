"use client";

import { useEffect, useState, type RefObject } from "react";

/** Si el elemento está en pantalla. `una` lo deja en true tras la primera vez. */
export function useEnVista(
  ref: RefObject<Element | null>,
  { margen = "0px", una = false }: { margen?: string; una?: boolean } = {},
) {
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisto(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        setVisto(e.isIntersecting);
        if (e.isIntersecting && una) io.disconnect();
      },
      { rootMargin: margen },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margen, una]);
  return visto;
}
