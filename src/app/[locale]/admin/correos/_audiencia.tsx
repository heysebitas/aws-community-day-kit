"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Send, TestTube2, Trash2, Users } from "lucide-react";
import { HardButton, Panel } from "@/components/admin/ui";
import { useConfirm } from "@/components/admin/confirm";
import { PUBLICOS, publicoDe, type Audiencia, type Publico } from "@/lib/audiencias";
import { cn } from "@/lib/utils";

/** A quién se le manda esto. */

export interface Conteo {
  total: number;
  porSegmento: { resumen: string; total: number }[];
  repetidos: number;
}

const BOTONCITO =
  "border-2 px-2 py-0.5 font-mono text-[11px] transition-colors";

export function EditorAudiencia({
  slug,
  audiencia,
  onChange,
  onEnviado,
  puedeEnviar,
  usa,
}: {
  slug: string;
  audiencia: Audiencia;
  onChange: (a: Audiencia) => void;
  /** Se llama al terminar un envío, para que la página recargue el historial. */
  onEnviado: (resultado: { enviados: number; fallidos: number; restantes: number }) => void;
  puedeEnviar: boolean;
  /** Qué variables usa la plantilla. */
  usa: Set<string>;
}) {
  const { confirm, dialog } = useConfirm();
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [contando, setContando] = useState(false);
  const [evitarRepetidos, setEvitarRepetidos] = useState(true);
  const [adjuntarPase, setAdjuntarPase] = useState(false);
  const [excluirRespondidos, setExcluirRespondidos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // ── El conteo, con freno para no pedir uno por casilla ──────────────────
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (reloj.current) clearTimeout(reloj.current);
    if (!audiencia.length) { setConteo(null); return; }

    reloj.current = setTimeout(async () => {
      setContando(true);
      try {
        const r = await fetch("/api/admin/campanas/contar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audiencia, plantilla: slug, evitarRepetidos }),
        });
        if (r.ok) setConteo(await r.json());
      } catch {
        /* se queda el anterior; mejor un número desactualizado a la vista que ninguno */
      } finally {
        setContando(false);
      }
    }, 350);

    return () => { if (reloj.current) clearTimeout(reloj.current); };
  }, [audiencia, slug, evitarRepetidos]);

  // ── Edición de los segmentos ────────────────────────────────────────────
  const anadir = () =>
    onChange([...audiencia, { publico: "asistentes" as Publico, filtros: {} }]);

  const quitar = (i: number) => onChange(audiencia.filter((_, k) => k !== i));

  const cambiarPublico = (i: number, publico: Publico) =>
    // Los filtros no se conservan: son de otro público y no significan nada acá.
    onChange(audiencia.map((s, k) => (k === i ? { publico, filtros: {} } : s)));

  const alternar = (i: number, filtro: string, valor: string) =>
    onChange(audiencia.map((s, k) => {
      if (k !== i) return s;
      const actuales = s.filtros?.[filtro] ?? [];
      const nuevos = actuales.includes(valor)
        ? actuales.filter((v) => v !== valor)
        : [...actuales, valor];
      const filtros = { ...s.filtros };
      // Un filtro sin valores se borra en vez de quedarse vacío: vacío y
      // ausente significan lo mismo y así no se guarda ruido.
      if (nuevos.length) filtros[filtro] = nuevos;
      else delete filtros[filtro];
      return { ...s, filtros };
    }));

  // ── Envío ───────────────────────────────────────────────────────────────
  async function prueba() {
    setProbando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/admin/campanas/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantilla: slug, prueba: true }),
      });
      const d = await r.json();
      setAviso(r.ok ? `Prueba enviada a ${d.a}.` : (d.error as string));
    } catch {
      setAviso("No se pudo mandar la prueba.");
    } finally {
      setProbando(false);
    }
  }

  async function enviar() {
    if (!conteo) return;

    // Lo que sale de acá no se recoge. La confirmación lleva el número y a
    // quién va, para que lo último que se lea antes de mandar no sea «¿seguro?»
    // sino «a 412 personas: Speakers — estado: Aceptada».
    const ok = await confirm({
      title: `Enviar a ${conteo.total} ${conteo.total === 1 ? "persona" : "personas"}`,
      message:
        conteo.porSegmento.map((s) => `· ${s.resumen} (${s.total})`).join(" · ") +
        " — el correo sale ya y no se puede recoger ni editar después.",
      confirmLabel: "Enviar",
      tone: "danger",
    });
    if (!ok) return;

    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/admin/campanas/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantilla: slug,
          audiencia,
          evitarRepetidos,
          adjuntarPase: usa.has("pase") || usa.has("qr") ? adjuntarPase : false,
          excluirRespondidos: usa.has("encuesta") ? excluirRespondidos : false,
          // El número que había en pantalla. Si al resolver sale más gente, el
          // servidor rechaza el envío en vez de mandarlo a quien no se vio.
          totalEsperado: conteo.total,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setAviso(d.error as string); return; }
      onEnviado(d);
      setAviso(
        `${d.enviados} enviados` +
        (d.fallidos ? `, ${d.fallidos} fallidos` : "") +
        (d.restantes ? ` · quedan ${d.restantes}, vuelve a darle para la siguiente tanda` : ""),
      );
    } catch {
      setAviso("El envío se cortó. Mira el historial antes de repetirlo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {audiencia.map((seg, i) => {
        const def = publicoDe(seg.publico);
        return (
          <div key={i} className="border-2 border-surface-600 bg-surface-800">
            <div className="flex items-center justify-between gap-2 border-b-2 border-surface-600 px-3 py-2">
              <select
                value={seg.publico}
                onChange={(e) => cambiarPublico(i, e.target.value as Publico)}
                className="min-h-8 border-2 border-surface-600 bg-surface-900 px-2 font-mono text-xs font-bold text-acento outline-hidden focus:border-acento"
              >
                {PUBLICOS.map((p) => (
                  <option key={p.clave} value={p.clave}>{p.nombre}</option>
                ))}
              </select>
              <button type="button" onClick={() => quitar(i)} aria-label="Quitar este grupo"
                className="p-1 text-surface-400 transition-colors hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 p-3">
              <p className="m-0 font-mono text-[11px] text-surface-400">{def?.explica}</p>

              {def?.filtros.map((f) => {
                const puestos = seg.filtros?.[f.clave] ?? [];
                return (
                  <div key={f.clave} className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-surface-400">
                      {f.etiqueta}
                      {!puestos.length && <span className="ml-1.5 normal-case text-surface-300">· sin filtrar</span>}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {f.opciones.map((o) => {
                        const activa = puestos.includes(o.valor);
                        return (
                          <button
                            key={o.valor}
                            type="button"
                            aria-pressed={activa}
                            onClick={() => alternar(i, f.clave, o.valor)}
                            className={cn(
                              BOTONCITO,
                              activa
                                ? "border-acento bg-acento/15 text-acento"
                                : "border-surface-600 text-surface-300 hover:border-surface-500",
                            )}
                          >
                            {o.etiqueta}
                          </button>
                        );
                      })}
                    </div>
                    {f.explica && (
                      <span className="font-mono text-[10px] text-surface-300">{f.explica}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={anadir}
        className="flex items-center justify-center gap-1.5 border-2 border-dashed border-surface-600 p-2.5 font-mono text-[11px] uppercase tracking-wider text-surface-400 transition-colors hover:border-acento hover:text-acento">
        <Plus className="h-3.5 w-3.5" /> añadir otro grupo
      </button>

      {audiencia.length > 1 && (
        <p className="m-0 font-mono text-[11px] leading-relaxed text-surface-400">
          Los grupos se suman y nadie recibe el correo dos veces. Si alguien está en varios,
          se le escribe con los datos del primero en la lista — puesto «Speakers» arriba,
          se le habla de su charla.
        </p>
      )}

      {/* ── El número ──────────────────────────────────────────────────── */}
      <Panel label="a cuánta gente le llega">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl leading-none text-surface-50">
            {conteo ? conteo.total : audiencia.length ? "—" : 0}
          </span>
          <span className="font-mono text-xs text-surface-400">
            {contando ? "contando…" : "personas"}
          </span>
        </div>

        {conteo && conteo.porSegmento.length > 0 && (
          <ul className="m-0 mt-2.5 list-none space-y-1 p-0">
            {conteo.porSegmento.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-2 font-mono text-[11px]">
                <span className="min-w-0 flex-1 text-surface-300">{s.resumen}</span>
                <span className="shrink-0 text-surface-400">{s.total}</span>
              </li>
            ))}
            {conteo.repetidos > 0 && (
              <li className="font-mono text-[11px] text-surface-400">
                {conteo.repetidos} estaban en más de un grupo y se cuentan una vez.
              </li>
            )}
          </ul>
        )}

        <label className="mt-3 flex items-start gap-2 border-t-2 border-surface-600 pt-2.5">
          <input type="checkbox" checked={evitarRepetidos} className="mt-0.5"
            onChange={(e) => setEvitarRepetidos(e.target.checked)} />
          <span className="font-mono text-[11px] leading-relaxed text-surface-300">
            No escribirle a quien ya recibió esta plantilla.
            <span className="block text-surface-300">
              Quítalo sólo para reenviar a propósito, como un «último llamado» que va dos días seguidos.
            </span>
          </span>
        </label>

        {(usa.has("pase") || usa.has("qr")) && (
          <label className="mt-2 flex items-start gap-2">
            <input type="checkbox" checked={adjuntarPase} className="mt-0.5"
              onChange={(e) => setAdjuntarPase(e.target.checked)} />
            <span className="font-mono text-[11px] leading-relaxed text-surface-300">
              Adjuntar el pase con el QR como imagen.
              <span className="block text-surface-300">
                Para el recordatorio del día antes, por si llegan sin señal. Sólo lo lleva
                quien va presencial.
              </span>
            </span>
          </label>
        )}

        {usa.has("encuesta") && (
          <label className="mt-2 flex items-start gap-2">
            <input type="checkbox" checked={excluirRespondidos} className="mt-0.5"
              onChange={(e) => setExcluirRespondidos(e.target.checked)} />
            <span className="font-mono text-[11px] leading-relaxed text-surface-300">
              No escribirle a quien ya respondió la encuesta.
              <span className="block text-surface-300">
                Cada persona recibe su enlace propio, y el suyo se conserva entre reenvíos.
              </span>
            </span>
          </label>
        )}
      </Panel>

      {/* ── Los botones ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <HardButton tone="ghost" icon={probando ? Loader2 : TestTube2}
          onClick={() => void prueba()} disabled={probando}>
          {probando ? "Mandando…" : "Prueba a mi correo"}
        </HardButton>
        <HardButton
          icon={enviando ? Loader2 : Send}
          onClick={() => void enviar()}
          disabled={enviando || !puedeEnviar || !conteo?.total || contando}
        >
          {enviando
            ? "Enviando…"
            : conteo?.total
              ? `Enviar a ${conteo.total}`
              : "Sin destinatarios"}
        </HardButton>
      </div>

      {!puedeEnviar && (
        <p className="m-0 flex items-start gap-1.5 font-mono text-[11px] text-amber-300">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Tienes esta sección en sólo lectura: puedes mirar a quién iría, pero no enviar.
        </p>
      )}

      {aviso && (
        <p className="m-0 border-2 border-surface-600 bg-surface-800 p-2.5 font-mono text-[11px] text-surface-200">
          {aviso}
        </p>
      )}

      {dialog}
    </div>
  );
}
