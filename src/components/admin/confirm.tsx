"use client";

import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { CLASE_DIALOGO, useDialogo } from "@/hooks/use-dialogo";
import { AlertTriangle } from "lucide-react";
import { HardButton } from "@/components/admin/ui";

/** Confirmación propia, en vez del `confirm()` del navegador. */

export type ConfirmOptions = {
  title: string;
  /** Qué va a pasar exactamente. Es el sitio para decir lo que se borra. */
  message: string;
  /** Texto del botón que confirma. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para lo que no se puede deshacer. */
  tone?: "danger" | "accent";
};

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  const dialog = <ConfirmDialog opts={opts} onAnswer={answer} />;

  return { confirm, dialog };
}

function ConfirmDialog({
  opts,
  onAnswer,
}: {
  opts: ConfirmOptions | null;
  onAnswer: (value: boolean) => void;
}) {
  // Suele abrirse encima de un modal, que ya tiene el fondo congelado: el
  // candado lleva cuenta de cuántos hay para no soltarlo antes de tiempo.
  useScrollLock(!!opts);

  // Va por portal a `body`, encima del Modal.
  if (!opts || typeof window === "undefined") return null;
  return createPortal(<Caja opts={opts} onAnswer={onAnswer} />, document.body);
}

function Caja({ opts, onAnswer }: { opts: ConfirmOptions; onAnswer: (value: boolean) => void }) {
  const idTitulo = useId();
  // Escape cancela y el foco vuelve a lo que abrió la pregunta.
  const ref = useDialogo(() => onAnswer(false));
  const danger = opts.tone !== "accent";

  return (
    <dialog ref={ref} aria-labelledby={idTitulo} className={CLASE_DIALOGO}>
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4"
      onClick={() => onAnswer(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md border-2 bg-surface-800 outline-none ${
          danger ? "border-red-500 shadow-[8px_8px_0_0_rgba(239,68,68,0.35)]" : "border-acento shadow-[8px_8px_0_0_var(--color-acento-fuerte)]"
        }`}
      >
        <div className={`flex items-center gap-2 border-b-2 px-4 py-3 ${danger ? "border-red-500/60" : "border-acento/60"}`}>
          <AlertTriangle className={`h-4 w-4 shrink-0 ${danger ? "text-red-400" : "text-acento"}`} />
          <p id={idTitulo} className="dot-matrix m-0 text-lg leading-none text-surface-50">{opts.title}</p>
        </div>

        <p className="m-0 px-4 py-5 font-mono text-sm leading-relaxed text-surface-100">
          {opts.message}
        </p>

        <div className="grid grid-cols-2 gap-2 border-t-2 border-surface-600 px-4 py-3 sm:flex sm:justify-end">
          <HardButton tone="ghost" onClick={() => onAnswer(false)}>
            {opts.cancelLabel ?? "Cancelar"}
          </HardButton>
          <HardButton tone={danger ? "danger" : "accent"} onClick={() => onAnswer(true)}>
            {opts.confirmLabel ?? "Sí, continuar"}
          </HardButton>
        </div>
      </div>
    </div>
    </dialog>
  );
}
