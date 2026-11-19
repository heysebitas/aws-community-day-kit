"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { CLASE_DIALOGO, useDialogo } from "@/hooks/use-dialogo";

/** Ventana modal. */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Id del encabezado propio, cuando el título no va en la barra. */
  labelledBy?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function Modal(props: ModalProps) {
  const { open } = props;

  // El fondo no se mueve mientras esto esté abierto. Ver `useScrollLock`: el
  // candado va en el `<html>`, que es quien desplaza la página.
  useScrollLock(open);

  if (typeof window === "undefined") return null;

  return createPortal(
    open ? <Caja {...props} /> : null,
    document.body,
  );
}

function Caja({ onClose, title, labelledBy, children, className, size = "md" }: ModalProps) {
  const idTitulo = useId();
  const ref = useDialogo(onClose);

  return (
    <dialog ref={ref} aria-labelledby={title ? idTitulo : labelledBy} className={CLASE_DIALOGO}>
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <div
            className="entra-fundido absolute inset-0 bg-black/70 backdrop-blur-sm sm:backdrop-blur-none"
            onClick={onClose}
          />
          <div
            className={cn(
              "entra-modal",
              "relative flex max-h-[92vh] w-full flex-col border-2 border-surface-500 bg-surface-800",
              "shadow-[0_-8px_0_0_rgba(0,0,0,0.35)] sm:max-h-[88vh] sm:shadow-[8px_8px_0_0_rgba(0,0,0,0.55)]",
              sizeStyles[size],
              className,
            )}
          >
            {title && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-surface-600 bg-surface-800 px-4 py-3 sm:px-5">
                <h2 id={idTitulo} className="dot-matrix m-0 min-w-0 truncate text-lg leading-none text-surface-50 sm:text-xl">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-surface-600 text-surface-300 transition-colors hover:border-acento hover:text-acento"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              {children}
            </div>
          </div>
        </div>
    </dialog>
  );
}
