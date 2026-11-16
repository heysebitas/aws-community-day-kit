"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Monitor, Smartphone, TriangleAlert } from "lucide-react";
import { SectionHead } from "@/components/admin/ui";
import { PlantillaBloques } from "@/emails/plantilla-bloques";
import { dibujarCorreo } from "@/emails/dibujar";
import { valoresDelEvento } from "@/emails/valores-evento";
import { aplicarVariables, type Bloque } from "@/emails/bloques";
import { ENLACES, variablesDeEnlaces } from "@/data/enlaces";
import { cn } from "@/lib/utils";

/** Cómo se ve el correo, mientras se escribe. */

/** Los datos de una persona, inventados. */
const EJEMPLO: Record<string, string> = {
  nombre: "Camila",
  nombreCompleto: "Camila Rojas Vergara",
  correo: "camila@ejemplo.cl",
  charla: "Del caos a las respuestas: tu primera ruta en datos",
  sala: "Auditorio · Piso -1",
  hora: "11:15 – 12:15",
  pase: "https://ejemplo/pase",
  qr: "https://ejemplo/qr.png",
  confirmar: "https://ejemplo/confirmar",
  pasaporte: "https://ejemplo/pasaporte",
  encuesta: "https://ejemplo/encuesta",
};

/** Las variantes que se pueden mirar, y qué banderas levanta cada una. */
const MODALIDADES = [
  { clave: "presencial", etiqueta: "Presencial", modalidad: "Presencial" },
  { clave: "online", etiqueta: "Online", modalidad: "Track Online (en vivo)" },
] as const;

const PROCEDENCIAS = [
  { clave: "nacional", etiqueta: "Del país" },
  { clave: "internacional", etiqueta: "De fuera" },
] as const;

const PASTILLA = "border-2 px-2 py-0.5 font-mono text-[11px] transition-colors";

export function Vista({
  bloques,
  preview,
  asunto,
  usa,
}: {
  bloques: Bloque[];
  preview: string;
  asunto: string;
  /** Las variables que menciona la plantilla, para avisar de las que faltan. */
  usa: Set<string>;
}) {
  const [telefono, setTelefono] = useState(false);
  const [modalidad, setModalidad] = useState<"presencial" | "online">("presencial");
  const [procedencia, setProcedencia] = useState<"nacional" | "internacional">("nacional");

  const [enlaces, setEnlaces] = useState<Record<string, string> | null>(null);
  const [html, setHtml] = useState("");
  const marco = useRef<HTMLIFrameElement>(null);

  // Los enlaces configurados, una vez. Son los mismos para todas las plantillas.
  useEffect(() => {
    let vivo = true;
    fetch("/api/event-config")
      .then((r) => r.json())
      .then((d) => { if (vivo) setEnlaces((d.enlaces ?? {}) as Record<string, string>); })
      .catch(() => { if (vivo) setEnlaces({}); });
    return () => { vivo = false; };
  }, []);

  const valores = useMemo(() => {
    const deEnlaces = variablesDeEnlaces(enlaces ?? {});
    const m = MODALIDADES.find((x) => x.clave === modalidad)!;

    // El grupo depende de la variante, igual que al aprobar a un speaker: el
    // del track online si lo hay, y si no el general.
    const grupo = modalidad === "online" && enlaces?.grupoSpeakersOnline
      ? enlaces.grupoSpeakersOnline
      : enlaces?.grupoSpeakers;

    return {
      ...valoresDelEvento(),
      ...EJEMPLO,
      ...deEnlaces,
      ...(grupo ? { grupoWhatsapp: grupo } : {}),
      modalidad: m.modalidad,
    };
  }, [enlaces, modalidad]);

  const banderas = useMemo(() => [modalidad, procedencia], [modalidad, procedencia]);

  /** Se vuelve a dibujar en cuanto cambia algo. */
  useEffect(() => {
    if (enlaces === null) return;
    let vivo = true;
    const t = setTimeout(() => {
      void dibujarCorreo(PlantillaBloques({ bloques, preview, valores, banderas }))
        .then((h) => { if (vivo) setHtml(h); })
        .catch(() => { /* se queda lo anterior, mejor que una pantalla en blanco */ });
    }, 80);
    return () => { vivo = false; clearTimeout(t); };
  }, [bloques, preview, valores, banderas, enlaces]);

  /** El HTML entra reescribiendo el documento del marco, no por `srcdoc`. */
  useEffect(() => {
    const doc = marco.current?.contentDocument;
    if (!doc || !html) return;
    const arriba = doc.documentElement?.scrollTop ?? 0;
    doc.open();
    doc.write(html);
    doc.close();
    doc.documentElement.scrollTop = arriba;
  }, [html]);

  const pesoKb = Math.round((new Blob([html]).size / 1024) * 10) / 10;

  /** Los enlaces del panel que la plantilla usa y están sin poner. */
  const faltan = useMemo(() => {
    if (!enlaces) return [];
    return ENLACES.filter(
      (e) => e.variable && usa.has(e.variable) && !enlaces[e.clave]?.trim(),
    );
  }, [enlaces, usa]);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <SectionHead title="cómo se ve" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setTelefono(false)} aria-pressed={!telefono}
            aria-label="Ver en pantalla de escritorio" title="Escritorio"
            className={cn("border-2 p-1.5", !telefono ? "border-acento text-acento" : "border-surface-600 text-surface-400")}>
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setTelefono(true)} aria-pressed={telefono}
            aria-label="Ver en pantalla de teléfono" title="Teléfono"
            className={cn("border-2 p-1.5", telefono ? "border-acento text-acento" : "border-surface-600 text-surface-400")}>
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Qué variante se está mirando ──────────────────────────────── */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-2 border-surface-600 bg-surface-800 p-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-surface-400">viendo como</span>
        <div className="flex gap-1">
          {MODALIDADES.map((m) => (
            <button key={m.clave} type="button" onClick={() => setModalidad(m.clave)}
              aria-pressed={modalidad === m.clave}
              className={cn(PASTILLA, modalidad === m.clave
                ? "border-acento bg-acento/15 text-acento"
                : "border-surface-600 text-surface-300 hover:border-surface-500")}>
              {m.etiqueta}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PROCEDENCIAS.map((p) => (
            <button key={p.clave} type="button" onClick={() => setProcedencia(p.clave)}
              aria-pressed={procedencia === p.clave}
              className={cn(PASTILLA, procedencia === p.clave
                ? "border-acento bg-acento/15 text-acento"
                : "border-surface-600 text-surface-300 hover:border-surface-500")}>
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {/* La bandeja de entrada: asunto y preview, lo primero que decide si
          alguien abre el correo. */}
      <div className="mb-2 border-2 border-surface-600 bg-surface-800 p-3">
        <p className="m-0 truncate font-mono text-sm font-bold text-surface-50">
          {aplicarVariables(asunto, valores) || <span className="text-surface-400">(sin asunto)</span>}
        </p>
        <p className="m-0 mt-0.5 truncate font-mono text-xs text-surface-400">
          {aplicarVariables(preview, valores) || "(sin texto de vista previa)"}
        </p>
      </div>

      {/* ── El correo ─────────────────────────────────────────────────── */}
      <div className={cn(telefono && "flex justify-center")}>
        <div
          className={cn(
            "border-2 border-surface-600 bg-white",
            telefono && "shadow-[8px_8px_0_0_rgba(0,0,0,0.45)]",
          )}
          // En teléfono es un marco del tamaño de uno de verdad, no la misma
          // caja encogida: 390 × 780 es lo que mide la pantalla de un móvil
          // corriente, y es el ancho con el que hay que juzgar si el texto cabe.
          style={telefono ? { width: 390, height: 780 } : undefined}
        >
          <iframe
            ref={marco}
            title="Vista previa del correo"
            className={cn("block w-full", telefono ? "h-full" : "h-[70vh]")}
          />
        </div>
      </div>

      {telefono && (
        <p className="m-0 mt-2 text-center font-mono text-[10px] text-surface-500">
          390 × 780 — lo que mide la pantalla de un teléfono corriente
        </p>
      )}

      {/* ── Avisos ────────────────────────────────────────────────────── */}
      {faltan.length > 0 && (
        <div className="mt-2 border-2 border-amber-400/50 bg-amber-400/10 p-2.5">
          <p className="m-0 flex items-start gap-1.5 font-mono text-[11px] leading-relaxed text-amber-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {faltan.length === 1 ? "Falta un enlace" : `Faltan ${faltan.length} enlaces`} y por eso
              {faltan.length === 1 ? " su botón no sale" : " sus botones no salen"}:{" "}
              {faltan.map((e) => e.etiqueta.toLowerCase()).join(", ")}.{" "}
              <Link href="/admin/config" className="underline">Ponlos en Configuración del evento</Link>.
            </span>
          </p>
        </div>
      )}

      <p className={cn("m-0 mt-2 font-mono text-[11px]", pesoKb > 100 ? "text-amber-300" : "text-surface-400")}>
        {pesoKb} KB
        {pesoKb > 100
          ? " — por encima de 102 KB Gmail recorta el correo y muestra «mensaje recortado»."
          : " · los datos de la persona son inventados; los enlaces, los de verdad."}
      </p>
    </>
  );
}
