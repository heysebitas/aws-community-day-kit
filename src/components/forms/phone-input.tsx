"use client";

import { useTranslations } from "next-intl";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { COUNTRIES, DEFAULT_COUNTRY, digitsOnly, findCountry, type Country } from "@/lib/normalize";
import { cn } from "@/lib/utils";

/** Teléfono con indicativo de país. */

type Tono = "block" | "ink";

const ESTILOS: Record<Tono, {
  label: string; req: string; boton: string; campo: string; borde: string; bordeError: string;
  menu: string; buscador: string; opcion: string; opcionActiva: string; tenue: string; error: string;
}> = {
  block: {
    label: "text-tinta/85",
    req: "text-acento-profundo",
    boton: "border-tinta/75 bg-papel/80 text-tinta hover:border-tinta",
    campo: "bg-papel/80 text-tinta placeholder:text-tinta/70 focus:border-tinta",
    borde: "border-tinta/75",
    bordeError: "border-error",
    menu: "border-tinta bg-acento shadow-[6px_6px_0_0_rgba(0,0,0,0.5)]",
    buscador: "border-tinta/75 bg-papel/80 text-tinta placeholder:text-tinta/70",
    opcion: "text-tinta/85",
    opcionActiva: "bg-tinta text-acento",
    tenue: "text-tinta/70",
    error: "text-error",
  },
  ink: {
    label: "text-surface-50 font-semibold",
    req: "text-acento",
    boton: "border-surface-600 bg-surface-800 text-surface-100 hover:border-acento",
    campo: "bg-surface-800 text-surface-50 placeholder:text-surface-300 focus:border-acento",
    borde: "border-surface-600",
    bordeError: "border-red-400",
    menu: "border-acento bg-surface-800 shadow-[6px_6px_0_0_rgba(0,0,0,0.6)]",
    buscador: "border-surface-600 bg-surface-900 text-surface-50 placeholder:text-surface-300",
    opcion: "text-surface-200",
    opcionActiva: "bg-acento text-tinta",
    tenue: "text-surface-300",
    error: "text-red-300",
  },
};

export function PhoneInput({
  countryCode,
  onCountryChange,
  value,
  onChange,
  error,
  label,
  required,
  tone = "block",
}: {
  countryCode: string;
  onCountryChange: (code: string) => void;
  /** Número local, sin indicativo. */
  value: string;
  onChange: (local: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  /** `block` sobre el lila de los formularios, `ink` sobre fondo oscuro. */
  tone?: Tono;
}) {
  const s = ESTILOS[tone];
  const t = useTranslations("Forms");
  const country = findCountry(countryCode);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = COUNTRIES.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  // Cierra al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Al abrir, el foco va al buscador. El reset del filtro se hace en el
  // handler (`toggle`), no acá: cambiar estado dentro de un efecto encadena
  // renders de más.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const toggle = () => {
    setOpen((o) => {
      if (!o) {
        setQuery("");
        setActive(0);
      }
      return !o;
    });
  };

  const pick = (c: Country) => {
    onCountryChange(c.code);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
    }
  };

  const expected = Array.isArray(country.digits)
    ? `${country.digits[0]}–${country.digits[1]}`
    : String(country.digits);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className={cn("font-mono text-sm", s.label)}>
          {label}
          {required && <span className={cn("ml-1", s.req)}>*</span>}
        </label>
      )}

      <div ref={boxRef} className="relative flex">
        {/* Indicativo */}
        <button
          type="button"
          onClick={toggle}
          onKeyDown={onKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex shrink-0 items-center gap-2 border-2 border-r-0 px-3 py-3 font-mono text-sm transition-colors",
            s.boton,
          )}
        >
          {/* `font-flag` antepone la fuente de banderas (ver globals.css):
              sin ella Windows dibuja dos letras sueltas en vez del emoji. */}
          <span aria-hidden="true" className="font-flag text-base leading-none">
            {country.flag}
          </span>
          <span className="tabular-nums">{country.dial}</span>
          <svg viewBox="0 0 24 24" className={cn("h-3 w-3 transition-transform", open && "rotate-180")} aria-hidden="true">
            <path d="M5 9l7 7 7-7" stroke="currentColor" strokeWidth="2.5" fill="none" />
          </svg>
        </button>

        {/* Número: sólo dígitos, sin autocompletado del navegador */}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(digitsOnly(e.target.value).slice(0, 15))}
          onPaste={(e) => {
            // Al pegar "+56 9 8765 4321" se quedan sólo los dígitos.
            e.preventDefault();
            const text = e.clipboardData.getData("text");
            onChange(digitsOnly(text).slice(0, 15));
          }}
          placeholder={"0".repeat(Array.isArray(country.digits) ? country.digits[0] : country.digits)}
          aria-label={label ?? t("phone_label")}
          className={cn(
            "w-full border-2 px-4 py-3 font-mono text-sm tabular-nums outline-none transition-colors",
            s.campo,
            error ? s.bordeError : s.borde,
          )}
        />

        {/* Desplegable */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute left-0 top-full z-30 mt-1 w-[min(20rem,100%)] border-2",
                s.menu,
              )}
            >
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t("phone_search")}
                aria-label={t("phone_search_aria")}
                className={cn(
                  "w-full border-b-2 px-3 py-2.5 font-mono text-sm outline-none",
                  s.buscador,
                )}
              />
              <ul role="listbox" className="max-h-60 overflow-y-auto">
                {filtered.length === 0 && (
                  <li className={cn("px-3 py-3 font-mono text-xs", s.tenue)}>{t("phone_no_results")}</li>
                )}
                {filtered.map((c, i) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={c.code === country.code}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(c)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left font-mono text-sm transition-colors",
                        i === active ? s.opcionActiva : s.opcion,
                      )}
                    >
                      <span aria-hidden="true" className="font-flag text-base leading-none">
                        {c.flag}
                      </span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="tabular-nums opacity-70">{c.dial}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between gap-3">
        {error ? (
          <span className={cn("font-mono text-xs", s.error)}>{error}</span>
        ) : (
          <span className={cn("font-mono text-xs", s.tenue)}>
            {country.name} · {expected} dígitos
          </span>
        )}
        <span className={cn("ml-auto shrink-0 font-mono text-xs tabular-nums", s.tenue)}>
          {value.length}
        </span>
      </div>
    </div>
  );
}

export { DEFAULT_COUNTRY };
