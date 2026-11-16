"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Desplegable con buscador, hecho a mano. */

export type SelectOption = {
  value: string;
  label: string;
  /** Encabezado bajo el que se agrupa. Sin esto, la lista va plana. */
  group?: string;
};

/**
 * Dos tonos, como en `PhoneInput`. `block` es el de siempre, para el bloque
 * lila de los formularios públicos; `ink` es el mismo desplegable sobre fondo
 * oscuro —modales, panel—. Sin esta variante, quien necesitaba un selector
 * sobre oscuro acababa poniendo un `<select>` nativo y el formulario dejaba de
 * parecerse al resto.
 */
type Tono = "block" | "ink";

const ESTILOS: Record<Tono, {
  boton: string; bordeNormal: string; bordeError: string; conValor: string; sinValor: string;
  menu: string; separador: string; lupa: string; buscador: string;
  grupo: string; opcion: string; opcionActiva: string; vacio: string;
}> = {
  block: {
    boton: "bg-papel/80 hover:border-tinta focus:border-tinta",
    bordeNormal: "border-tinta/75",
    bordeError: "border-error",
    conValor: "text-tinta",
    sinValor: "text-tinta/70",
    menu: "border-tinta bg-acento shadow-[6px_6px_0_0_rgba(0,0,0,0.35)]",
    separador: "border-tinta/25",
    lupa: "text-tinta/70",
    buscador: "bg-papel/80 text-tinta placeholder:text-tinta/70",
    grupo: "border-tinta/15 bg-tinta/5 text-acento-profundo",
    opcion: "text-tinta",
    opcionActiva: "bg-tinta text-acento",
    vacio: "text-tinta/70",
  },
  ink: {
    boton: "bg-surface-800 hover:border-acento focus:border-acento",
    bordeNormal: "border-surface-600",
    bordeError: "border-red-400",
    conValor: "text-surface-50",
    sinValor: "text-surface-300",
    menu: "border-acento bg-surface-800 shadow-[6px_6px_0_0_rgba(0,0,0,0.6)]",
    separador: "border-surface-600",
    lupa: "text-surface-300",
    buscador: "bg-surface-900 text-surface-50 placeholder:text-surface-300",
    grupo: "border-surface-700 bg-surface-900 text-acento",
    opcion: "text-surface-200",
    opcionActiva: "bg-acento text-tinta",
    vacio: "text-surface-300",
  },
};

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción",
  searchPlaceholder = "Buscar…",
  emptyLabel = "Sin resultados",
  id,
  invalid,
  className,
  tone = "block",
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  id?: string;
  invalid?: boolean;
  className?: string;
  /** `block` sobre el lila de los formularios, `ink` sobre fondo oscuro. */
  tone?: Tono;
}) {
  const s = ESTILOS[tone];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // Se busca sin tildes: quien escribe "tecnico" espera encontrar "técnico".
    const strip = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const nq = strip(q);
    return options.filter((o) => strip(o.label).includes(nq) || strip(o.group ?? "").includes(nq));
  }, [options, query]);

  // Cierra al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // El efecto sólo mueve el foco. Reiniciar el buscador desde acá seria
  // cambiar estado como reaccion a estado, que encadena un render de mas; se
  // hace en el manejador que abre, que es donde de verdad ocurre el evento.
  useEffect(() => {
    if (!open) return;
    // Se espera un cuadro: el desplegable acaba de entrar en el DOM.
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setQuery("");
        setActive(0);
      }
      return !wasOpen;
    });
  };

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) pick(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  /**
   * Cada opción con el encabezado que le toca, o null si sigue en el mismo
   * grupo que la anterior.
   */
  const rows = useMemo(
    () =>
      filtered.map((o, i) => ({
        option: o,
        header: o.group && o.group !== filtered[i - 1]?.group ? o.group : null,
      })),
    [filtered],
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 border-2 px-4 py-3 text-left font-mono text-sm transition-all focus:outline-none",
          s.boton,
          invalid ? s.bordeError : s.bordeNormal,
          selected ? s.conValor : s.sinValor,
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn("absolute left-0 right-0 top-full z-30 mt-1 border-2", s.menu)}
          >
            <div className={cn("relative border-b-2", s.separador)}>
              <Search
                className={cn(
                  "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
                  s.lupa,
                )}
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className={cn(
                  "w-full border-0 py-2.5 pl-9 pr-3 font-mono text-sm outline-none",
                  s.buscador,
                )}
              />
            </div>

            <ul role="listbox" className="m-0 max-h-64 list-none overflow-y-auto p-0">
              {filtered.length === 0 && (
                <li className={cn("px-3 py-3 font-mono text-xs", s.vacio)}>{emptyLabel}</li>
              )}
              {rows.map(({ option: o, header }, i) => (
                  <li key={o.value}>
                    {header && (
                      <p className={cn("etiqueta m-0 border-b px-3 py-1.5 leading-none", s.grupo)}>
                        {header}
                      </p>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={o.value === value}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(o.value)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left font-mono text-sm transition-colors",
                        i === active ? s.opcionActiva : s.opcion,
                      )}
                    >
                      <span className="min-w-0">{o.label}</span>
                      {o.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
