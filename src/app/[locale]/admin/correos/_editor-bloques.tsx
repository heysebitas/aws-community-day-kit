"use client";

import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { BANDERAS, CATALOGO, bloqueNuevo, nuevoId, type Bloque, type TipoBloque } from "@/emails/bloques";
import { ImageUpload } from "@/components/ui/image-upload";
import { cn } from "@/lib/utils";

/** El editor de bloques de un correo. */

const CAMPO =
  "w-full border-2 border-surface-600 bg-surface-900 px-3 py-2 font-mono text-sm " +
  "text-surface-100 placeholder:text-surface-400 outline-hidden transition-colors focus:border-acento";

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">{children}</span>;
}

export function EditorBloques({
  bloques,
  onChange,
}: {
  bloques: Bloque[];
  onChange: (b: Bloque[]) => void;
}) {
  const cambiar = (id: string, campos: Record<string, unknown>) =>
    onChange(bloques.map((b) => (b.id === id ? ({ ...b, ...campos } as Bloque) : b)));

  const mover = (i: number, hacia: -1 | 1) => {
    const j = i + hacia;
    if (j < 0 || j >= bloques.length) return;
    const copia = [...bloques];
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
    onChange(copia);
  };

  const quitar = (id: string) => onChange(bloques.filter((b) => b.id !== id));

  const duplicar = (b: Bloque) => {
    const i = bloques.findIndex((x) => x.id === b.id);
    const copia = [...bloques];
    copia.splice(i + 1, 0, { ...b, id: nuevoId() });
    onChange(copia);
  };

  const anadir = (tipo: TipoBloque) => onChange([...bloques, bloqueNuevo(tipo)]);

  return (
    <div className="flex flex-col gap-3">
      {bloques.map((b, i) => {
        const nombre = CATALOGO.find((c) => c.tipo === b.tipo)?.nombre ?? b.tipo;
        return (
          <div key={b.id} className="border-2 border-surface-600 bg-surface-800">
            <div className="flex items-center justify-between gap-2 border-b-2 border-surface-600 px-3 py-2">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-acento">
                  {nombre}
                </span>
                {b.mostrarSi && (
                  <span className="border-2 border-surface-600 px-1.5 font-mono text-[10px] text-surface-300">
                    sólo {b.mostrarSi}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0}
                  aria-label="Subir" title="Subir"
                  className="p-1 text-surface-400 transition-colors hover:text-surface-50 disabled:opacity-30">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === bloques.length - 1}
                  aria-label="Bajar" title="Bajar"
                  className="p-1 text-surface-400 transition-colors hover:text-surface-50 disabled:opacity-30">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => duplicar(b)} aria-label="Duplicar" title="Duplicar"
                  className="p-1 text-surface-400 transition-colors hover:text-surface-50">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => quitar(b.id)} aria-label="Quitar" title="Quitar"
                  className="p-1 text-surface-400 transition-colors hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3">
              {(b.tipo === "kicker" || b.tipo === "titulo") && (
                <input className={CAMPO} value={b.texto} onChange={(e) => cambiar(b.id, { texto: e.target.value })} />
              )}

              {b.tipo === "parrafo" && (
                <>
                  <textarea rows={3} className={cn(CAMPO, "resize-y")} value={b.texto}
                    onChange={(e) => cambiar(b.id, { texto: e.target.value })} />
                  <label className="flex items-center gap-2 font-mono text-xs text-surface-300">
                    <input type="checkbox" checked={!!b.apagado}
                      onChange={(e) => cambiar(b.id, { apagado: e.target.checked })} />
                    Apagado — para notas al pie
                  </label>
                </>
              )}

              {b.tipo === "boton" && (
                <>
                  <Etiqueta>Texto del botón</Etiqueta>
                  <input className={CAMPO} value={b.texto} onChange={(e) => cambiar(b.id, { texto: e.target.value })} />
                  <Etiqueta>A dónde lleva</Etiqueta>
                  <input className={CAMPO} value={b.enlace} placeholder="https://…"
                    onChange={(e) => cambiar(b.id, { enlace: e.target.value })} />
                  <label className="flex items-center gap-2 font-mono text-xs text-surface-300">
                    <input type="checkbox" checked={!!b.contorno}
                      onChange={(e) => cambiar(b.id, { contorno: e.target.checked })} />
                    De contorno — para la acción secundaria
                  </label>
                  {b.enlace && !/^https?:\/\/|^\{/.test(b.enlace) && (
                    <p className="m-0 font-mono text-[11px] text-amber-300">
                      El enlace debería empezar por https:// o ser una variable.
                    </p>
                  )}
                </>
              )}

              {b.tipo === "aviso" && (
                <>
                  <Etiqueta>Título del recuadro</Etiqueta>
                  <input className={CAMPO} value={b.titulo ?? ""} onChange={(e) => cambiar(b.id, { titulo: e.target.value })} />
                  <Etiqueta>Texto</Etiqueta>
                  <textarea rows={3} className={cn(CAMPO, "resize-y")} value={b.texto}
                    onChange={(e) => cambiar(b.id, { texto: e.target.value })} />
                </>
              )}

              {b.tipo === "datos" && (
                <>
                  {b.filas.map((f, fi) => (
                    <div key={fi} className="flex gap-2">
                      <input className={cn(CAMPO, "w-1/3")} value={f.etiqueta} placeholder="Etiqueta"
                        onChange={(e) => cambiar(b.id, {
                          filas: b.filas.map((x, k) => (k === fi ? { ...x, etiqueta: e.target.value } : x)),
                        })} />
                      <input className={CAMPO} value={f.valor} placeholder="Valor"
                        onChange={(e) => cambiar(b.id, {
                          filas: b.filas.map((x, k) => (k === fi ? { ...x, valor: e.target.value } : x)),
                        })} />
                      <button type="button" aria-label="Quitar fila"
                        onClick={() => cambiar(b.id, { filas: b.filas.filter((_, k) => k !== fi) })}
                        className="shrink-0 px-2 text-surface-400 transition-colors hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => cambiar(b.id, { filas: [...b.filas, { etiqueta: "", valor: "" }] })}
                    className="self-start border-2 border-surface-600 px-2.5 py-1 font-mono text-[11px] text-surface-300 transition-colors hover:border-acento hover:text-acento">
                    + fila
                  </button>
                </>
              )}

              {b.tipo === "pasos" && (
                <>
                  {b.items.map((it, ii) => (
                    <div key={ii} className="flex gap-2">
                      <span className="w-6 shrink-0 pt-2 text-right font-mono text-xs text-surface-300">{ii + 1}.</span>
                      <input className={CAMPO} value={it}
                        onChange={(e) => cambiar(b.id, {
                          items: b.items.map((x, k) => (k === ii ? e.target.value : x)),
                        })} />
                      <button type="button" aria-label="Quitar paso"
                        onClick={() => cambiar(b.id, { items: b.items.filter((_, k) => k !== ii) })}
                        className="shrink-0 px-2 text-surface-400 transition-colors hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => cambiar(b.id, { items: [...b.items, ""] })}
                    className="self-start border-2 border-surface-600 px-2.5 py-1 font-mono text-[11px] text-surface-300 transition-colors hover:border-acento hover:text-acento">
                    + paso
                  </button>
                </>
              )}

              {b.tipo === "cifra" && (
                <div className="flex gap-2">
                  <input className={cn(CAMPO, "w-24")} value={b.valor} placeholder="24"
                    onChange={(e) => cambiar(b.id, { valor: e.target.value })} />
                  <input className={CAMPO} value={b.etiqueta} placeholder="de octubre"
                    onChange={(e) => cambiar(b.id, { etiqueta: e.target.value })} />
                </div>
              )}

              {b.tipo === "imagen" && (
                <>
                  <Etiqueta>La imagen</Etiqueta>
                  {/* Se sube desde acá y se queda con su URL pública: un
                      correo pide la imagen al abrirse, así que tiene que
                      estar colgada en algún sitio de todos modos. */}
                  <ImageUpload
                    value={b.url}
                    onChange={(url) => cambiar(b.id, { url })}
                    folder="emails"
                    aspectRatio="wide"
                  />
                  <Etiqueta>Texto alternativo</Etiqueta>
                  <input
                    className={CAMPO} value={b.alt}
                    placeholder="Qué se ve en la imagen, en una línea"
                    onChange={(e) => cambiar(b.id, { alt: e.target.value })}
                  />
                  <p className="m-0 font-mono text-[11px] text-surface-400">
                    Muchos clientes de correo no cargan las imágenes hasta que se lo pides.
                    Sin esto, ahí queda un hueco en blanco.
                  </p>
                  <Etiqueta>A dónde lleva (opcional)</Etiqueta>
                  <input
                    className={CAMPO} value={b.enlace ?? ""} placeholder="https://… o {encuesta}"
                    onChange={(e) => cambiar(b.id, { enlace: e.target.value || undefined })}
                  />
                </>
              )}

              {b.tipo === "cuentaRegresiva" && (
                <p className="m-0 font-mono text-[11px] text-surface-400">
                  El reloj hasta que abren las puertas. Se calcula solo cuando se abre el correo,
                  así que no tiene nada que configurar.
                </p>
              )}

              {b.tipo === "separador" && (
                <p className="m-0 font-mono text-[11px] text-surface-400">Una línea. No tiene nada que configurar.</p>
              )}

              {/* Cuándo sale este bloque. Es lo que permite que un mismo
                  correo sirva para el presencial y para el online sin tener
                  dos plantillas que se desincronizan. */}
              <label className="mt-1 flex items-center gap-2 border-t-2 border-surface-600 pt-2">
                <span className="font-mono text-[11px] text-surface-400">Mostrar</span>
                <select
                  value={b.mostrarSi ?? ""}
                  onChange={(e) => cambiar(b.id, { mostrarSi: e.target.value || undefined })}
                  className="min-h-8 border-2 border-surface-600 bg-surface-900 px-2 font-mono text-[11px] text-surface-100 outline-hidden focus:border-acento"
                >
                  <option value="">siempre</option>
                  {BANDERAS.map((f) => (
                    <option key={f.clave} value={f.clave} title={f.explica}>sólo si {f.clave}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        );
      })}

      {/* Añadir */}
      <div className="border-2 border-dashed border-surface-600 p-3">
        <p className="m-0 mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-surface-400">
          <Plus className="h-3.5 w-3.5" /> añadir bloque
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATALOGO.map((c) => (
            <button key={c.tipo} type="button" onClick={() => anadir(c.tipo)} title={c.explica}
              className="border-2 border-surface-600 px-2.5 py-1.5 font-mono text-xs text-surface-200 transition-colors hover:border-acento hover:text-acento">
              {c.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
