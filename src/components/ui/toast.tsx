"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

// Fondo sólido: el aviso flota sobre la pantalla y uno translúcido deja leer lo de debajo.
const styles = {
  success: "border-acento bg-surface-800",
  error: "border-red-500 bg-surface-800",
  info: "border-acento bg-surface-800",
};

/** El diálogo modal abierto más reciente: lo de fuera de él es inerte y queda bajo la capa superior. */
export function dialogoAbierto(doc: Pick<Document, "querySelectorAll">): HTMLElement | null {
  const abiertos = doc.querySelectorAll<HTMLElement>("dialog[open]");
  return abiertos.length ? abiertos[abiertos.length - 1]! : null;
}

const DURACION = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Dónde se montan los avisos: dentro del diálogo abierto, si lo hay.
  const [anfitrion, setAnfitrion] = useState<HTMLElement | null>(null);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setAnfitrion(dialogoAbierto(document));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    // Abrir o cerrar un `<dialog>` sólo cambia su atributo `open`.
    const ojo = new MutationObserver(() => setAnfitrion(dialogoAbierto(document)));
    ojo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => ojo.disconnect();
  }, []);

  const lista = (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {anfitrion ? createPortal(lista, anfitrion) : lista}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = icons[toast.type];
  // Con el puntero o el foco encima el reloj se detiene (WCAG 2.2.1) y sigue con lo que quedaba.
  const restante = useRef(DURACION);
  const inicio = useRef(0);
  const reloj = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const arrancar = useCallback(() => {
    clearTimeout(reloj.current);
    inicio.current = Date.now();
    reloj.current = setTimeout(() => onRemove(toast.id), restante.current);
  }, [toast.id, onRemove]);

  const encima = useRef(0);

  const pausar = () => {
    if (encima.current++ > 0) return;
    clearTimeout(reloj.current);
    restante.current = Math.max(1000, restante.current - (Date.now() - inicio.current));
  };

  const soltar = () => {
    encima.current = Math.max(0, encima.current - 1);
    if (encima.current === 0) arrancar();
  };

  useEffect(() => {
    arrancar();
    return () => clearTimeout(reloj.current);
  }, [arrancar]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      onMouseEnter={pausar}
      onMouseLeave={soltar}
      onFocus={pausar}
      onBlur={soltar}
      className={cn(
        "flex items-center gap-3 border-2 px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.6)]",
        styles[toast.type],
      )}
    >
      <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0", toast.type === "success" ? "text-acento" : toast.type === "error" ? "text-red-400" : "text-acento")} />
      <span className="font-mono text-sm text-surface-100">{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar aviso"
        className="ml-2 shrink-0 text-surface-400 hover:text-surface-200"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
