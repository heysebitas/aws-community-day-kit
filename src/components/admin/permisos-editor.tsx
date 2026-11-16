"use client";

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SECCIONES, NIVELES, permisosCompletos, permisosVacios,
  type Nivel, type Permiso, type SeccionId,
} from "@/lib/permisos";

/** Las casillas de «qué puede tocar» de una cuenta de organizador. */

const OPCIONES: { valor: Nivel; label: string; Icon: React.ElementType }[] = [
  { valor: "no", label: "Nada", Icon: EyeOff },
  { valor: "ver", label: "Ver", Icon: Eye },
  { valor: "editar", label: "Editar", Icon: Pencil },
];

export function PermisosEditor({
  valor,
  onChange,
}: {
  valor: Permiso[];
  onChange: (p: Permiso[]) => void;
}) {
  const nivelDe = (id: SeccionId): Nivel =>
    valor.find((p) => p.seccion === id)?.nivel ?? "no";
  const borraDe = (id: SeccionId): boolean =>
    valor.find((p) => p.seccion === id)?.eliminar === true;

  const set = (id: SeccionId, cambio: Partial<Permiso>) =>
    onChange(
      SECCIONES.map((s) => {
        const actual = valor.find((p) => p.seccion === s.id) ?? {
          seccion: s.id, nivel: "no" as Nivel, eliminar: false,
        };
        if (s.id !== id) return actual;
        const siguiente = { ...actual, ...cambio };
        // Bajar de «editar» apaga el borrado: si no, quedaría guardado y
        // volvería a aparecer al subir el nivel otra vez.
        if (siguiente.nivel !== "editar") siguiente.eliminar = false;
        return siguiente;
      }),
    );

  const cuantas = valor.filter((p) => p.nivel !== "no").length;
  const grupos = [...new Set(SECCIONES.map((s) => s.grupo))];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 font-mono text-xs text-surface-300">
          {cuantas === SECCIONES.length
            ? "Acceso a todo el panel de organizador"
            : cuantas === 0
              ? "Sólo entra y ve los números del evento"
              : `${cuantas} de ${SECCIONES.length} secciones`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(permisosCompletos())}
            className="border-2 border-surface-600 px-2.5 py-1 font-mono text-[11px] text-surface-200 transition-colors hover:border-acento hover:text-acento"
          >
            Marcar todo
          </button>
          <button
            type="button"
            onClick={() => onChange(permisosVacios())}
            className="border-2 border-surface-600 px-2.5 py-1 font-mono text-[11px] text-surface-200 transition-colors hover:border-acento hover:text-acento"
          >
            Quitar todo
          </button>
        </div>
      </div>

      <div className="flex max-h-[26rem] flex-col gap-4 overflow-y-auto overscroll-contain border-2 border-surface-600 bg-surface-800 p-3">
        {grupos.map((grupo) => (
          <div key={grupo}>
            <p className="dot-matrix m-0 mb-2 text-sm leading-none text-surface-300">
              {grupo.toLowerCase()}
            </p>

            <div className="flex flex-col gap-2">
              {SECCIONES.filter((s) => s.grupo === grupo).map((s) => {
                const nivel = nivelDe(s.id);
                return (
                  <div key={s.id} className="border-2 border-surface-600 bg-surface-900 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-surface-50">
                        {s.label}
                      </span>

                      <div className="flex">
                        {OPCIONES.map(({ valor: v, label, Icon }, i) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => set(s.id, { nivel: v })}
                            aria-pressed={nivel === v}
                            className={cn(
                              "flex min-h-8 items-center gap-1.5 border-2 px-2.5 font-mono text-[11px] transition-colors",
                              i > 0 && "-ml-0.5",
                              nivel === v
                                ? "relative z-10 border-acento bg-acento font-bold text-surface-900"
                                : "border-surface-600 text-surface-300 hover:border-surface-500 hover:text-surface-100",
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {nivel !== "no" && (
                      <p className="m-0 mt-2 font-mono text-[11px] leading-relaxed text-surface-400">
                        {nivel === "ver" ? "Mira, no cambia nada. " : ""}
                        {s.explica}
                      </p>
                    )}

                    {s.borrable && nivel === "editar" && (
                      <button
                        type="button"
                        onClick={() => set(s.id, { eliminar: !borraDe(s.id) })}
                        aria-pressed={borraDe(s.id)}
                        className={cn(
                          "mt-2 flex min-h-8 items-center gap-2 border-2 px-2.5 font-mono text-[11px] transition-colors",
                          borraDe(s.id)
                            ? "border-red-500 bg-red-500/15 text-red-300"
                            : "border-surface-600 text-surface-400 hover:border-surface-500",
                        )}
                      >
                        <Trash2 className="h-3 w-3" />
                        {borraDe(s.id) ? "Puede borrar" : "No puede borrar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="m-0 font-mono text-[11px] leading-relaxed text-surface-400">
        El tablero y los números del evento los ve cualquiera que entre al panel:
        no hay nada que cambiar ahí. Lo que es sólo de admin —cuentas, pasaportes,
        certificados, encuesta, consola, reportes, actividad y
        configuración— no se puede dar a un organizador.
      </p>
    </div>
  );
}

/** Para pintar en la tabla qué tiene una cuenta, sin abrir el formulario. */
export function resumenPermisos(permisos: Permiso[] | undefined, role: string): string {
  if (role !== "organizer") return "—";
  if (!permisos?.length) return "Todo";
  const con = permisos.filter((p) => p.nivel !== "no");
  if (con.length === 0) return "Sólo números";
  if (con.length === SECCIONES.length && con.every((p) => p.nivel === "editar")) return "Todo";
  return `${con.length} de ${SECCIONES.length}`;
}

export { NIVELES };
