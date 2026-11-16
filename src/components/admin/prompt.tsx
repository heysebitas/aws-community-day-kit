"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { Pencil } from "lucide-react";
import { HardButton } from "@/components/admin/ui";

/** Pedir un texto, en vez del `prompt()` del navegador. */

export type PromptOptions = {
  title: string;
  /** Para qué es lo que se pide. Sale bajo el título. */
  message?: string;
  /** Lo que trae escrito al abrirse. Queda seleccionado. */
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tope de caracteres. El contador sale cuando quedan pocos. */
  maxLength?: number;
  /** Comprueba lo escrito y devuelve el error, o `null` si está bien. */
  validar?: (valor: string) => string | null;
};

export function usePrompt() {
  const [opts, setOpts] = useState<PromptOptions | null>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);

  const prompt = useCallback((options: PromptOptions) => {
    setOpts(options);
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = useCallback((value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  const dialog = <PromptDialog opts={opts} onAnswer={answer} />;

  return { prompt, dialog };
}

function PromptDialog({
  opts,
  onAnswer,
}: {
  opts: PromptOptions | null;
  onAnswer: (value: string | null) => void;
}) {
  // El candado del fondo vive acá, que es lo único que sobrevive al cierre.
  useScrollLock(!!opts);

  if (!opts) return null;
  if (typeof window === "undefined") return null;

  return <Caja opts={opts} onAnswer={onAnswer} />;
}

/** El cuerpo del diálogo, montado sólo mientras está abierto. */
function Caja({
  opts,
  onAnswer,
}: {
  opts: PromptOptions;
  onAnswer: (value: string | null) => void;
}) {
  const [valor, setValor] = useState(opts.initial ?? "");
  const campo = useRef<HTMLInputElement>(null);

  // El foco dentro y el texto seleccionado, para escribir encima sin borrar.
  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onAnswer(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onAnswer]);

  const limpio = valor.trim();
  const error = limpio ? (opts.validar?.(limpio) ?? null) : null;
  const puede = limpio.length > 0 && !error;

  const aceptar = () => { if (puede) onAnswer(limpio); };

  // Por portal a `body`, como la confirmación: la saca de cualquier ancestro
  // con `transform` o `filter`, que crean contexto de apilamiento propio y
  // dejarían el z-index sin efecto si se abre desde dentro de un modal.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={opts.title}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4"
      onClick={() => onAnswer(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border-2 border-acento bg-surface-800 shadow-[8px_8px_0_0_var(--color-acento-fuerte)] outline-none"
      >
        <div className="flex items-center gap-2 border-b-2 border-acento/60 px-4 py-3">
          <Pencil className="h-4 w-4 shrink-0 text-acento" />
          <p className="dot-matrix m-0 text-lg leading-none text-surface-50">{opts.title}</p>
        </div>

        <div className="flex flex-col gap-2 px-4 py-5">
          {opts.message && (
            <p className="m-0 font-mono text-[11px] leading-relaxed text-surface-300">{opts.message}</p>
          )}

          <input
            ref={campo}
            value={valor}
            maxLength={opts.maxLength}
            placeholder={opts.placeholder}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => {
              // Enter acepta, como en el nativo. Sin esto habría que soltar el
              // teclado para darle al botón, que es lo que más molesta de un
              // campo que se abre con el foco dentro.
              if (e.key === "Enter") { e.preventDefault(); aceptar(); }
            }}
            className="min-h-11 w-full border-2 border-surface-600 bg-surface-900 px-3 py-2 font-mono text-sm text-surface-100 placeholder:text-surface-500 outline-none transition-colors focus:border-acento"
          />

          {error && <p className="m-0 font-mono text-[11px] text-red-400">{error}</p>}

          {opts.maxLength && valor.length > opts.maxLength - 20 && (
            <p className="m-0 text-right font-mono text-[10px] text-surface-400">
              {opts.maxLength - valor.length} caracteres
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t-2 border-surface-600 px-4 py-3 sm:flex sm:justify-end">
          <HardButton tone="ghost" onClick={() => onAnswer(null)}>
            {opts.cancelLabel ?? "Cancelar"}
          </HardButton>
          <HardButton tone="accent" onClick={aceptar} disabled={!puede}>
            {opts.confirmLabel ?? "Crear"}
          </HardButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
