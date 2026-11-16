"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TarjetaSpeaker, W, H, type SpeakerEntry } from "@/app/api/og/speaker/[slug]/_tarjeta";
import { cn } from "@/lib/utils";
import { EVENTO } from "@/config";

/** La tarjeta, dibujada en el navegador y con asas para moverla. */

export interface Ajustes {
  talkTitleCard: string;
  roleCard: string;
  contentX: number;
  contentY: number;
  nameOffset: number;
  titleSize: number;
  nameSize: number;
  fotoX: number;
  fotoY: number;
  fotoZoom: number;
}

/** Qué se está arrastrando ahora mismo. */
type Asa = "foto" | "texto" | "raya" | null;

interface Props {
  speakers: SpeakerEntry[];
  track: string;
  fecha: string;
  sede: string;
  ciudad: string;
  dominio: string;
  qrDataUrl: string;
  ajustes: Ajustes;
  onChange: (cambio: Partial<Ajustes>) => void;
  /** Se llama al soltar, para guardar sin que el arrastre dispare mil veces. */
  onSoltar?: () => void;
  /** Con las guías puestas se ven los límites de cada zona. */
  guias: boolean;
}

const LOGOS = {
  awsLogo: "/images/logos/aws-logo.svg",
  eventLogo: EVENTO.marca.mascota ?? "",
};

export function Lienzo({
  speakers, track, fecha, sede, ciudad, dominio, qrDataUrl,
  ajustes, onChange, onSoltar, guias,
}: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const capaFoto = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.5);
  const [asa, setAsa] = useState<Asa>(null);

  const unSpeaker = speakers.length === 1;
  const hayFoto = !!speakers[0]?.photo;

  /** La tarjeta se dibuja siempre a 1080 y se encoge para caber. */
  const ALTO_RESERVADO = 300;
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => {
      const porAncho = el.clientWidth / W;
      const porAlto = (window.innerHeight - ALTO_RESERVADO) / H;
      setEscala(Math.max(0.2, Math.min(1, porAncho, porAlto)));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    window.addEventListener("resize", medir);
    return () => { obs.disconnect(); window.removeEventListener("resize", medir); };
  }, []);

  /** Arrastre: se calcula contra la posición inicial, no acumulando deltas. */
  const empezar = useCallback(
    (quien: Exclude<Asa, null>) => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setAsa(quien);

      const x0 = e.clientX;
      const y0 = e.clientY;
      const inicio = { ...ajustes };

      const mover = (ev: PointerEvent) => {
        const dx = (ev.clientX - x0) / escala;
        const dy = (ev.clientY - y0) / escala;

        if (quien === "foto") {
          // Arrastrar hacia la derecha enseña lo que hay a la izquierda, así
          // que el porcentaje baja: se mueve la foto, no la ventana.
          onChange({
            fotoX: acotar(inicio.fotoX - (dx / 490) * 100, 0, 100),
            fotoY: acotar(inicio.fotoY - (dy / H) * 100, 0, 100),
          });
        } else if (quien === "texto") {
          onChange({
            contentX: Math.round(acotar(inicio.contentX + dx, 120, W - 220)),
            contentY: Math.round(acotar(inicio.contentY + dy, 60, inicio.nameOffset - 80)),
          });
        } else {
          onChange({
            nameOffset: Math.round(acotar(inicio.nameOffset + dy, inicio.contentY + 80, H - 240)),
          });
        }
      };

      const soltar = () => {
        setAsa(null);
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        onSoltar?.();
      };

      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    },
    [ajustes, escala, onChange, onSoltar],
  );

  /** La rueda sobre la foto acerca y aleja. */
  // El zoom se guarda en una referencia para que el oyente de la rueda —que se
  // registra una sola vez— lea siempre el valor de ahora sin volver a montarse
  // en cada paso.
  const zoomRef = useRef(ajustes.fotoZoom);
  useEffect(() => { zoomRef.current = ajustes.fotoZoom; }, [ajustes.fotoZoom]);

  useEffect(() => {
    const el = capaFoto.current;
    if (!el || !unSpeaker || !hayFoto) return;
    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      const paso = e.deltaY > 0 ? -0.06 : 0.06;
      onChange({ fotoZoom: Math.round(acotar(zoomRef.current + paso, 1, 3) * 100) / 100 });
    };
    el.addEventListener("wheel", alRodar, { passive: false });
    return () => el.removeEventListener("wheel", alRodar);
  }, [hayFoto, onChange, unSpeaker]);

  // Las asas se dibujan en coordenadas de tarjeta dentro de la capa escalada.
  const zona = (estilo: React.CSSProperties, quien: Exclude<Asa, null>, etiqueta: string, clase?: string) => (
    <div
      role="button"
      tabIndex={-1}
      aria-label={etiqueta}
      title={etiqueta}
      onPointerDown={empezar(quien)}
      style={estilo}
      className={cn(
        "absolute touch-none select-none transition-colors",
        asa === quien ? "bg-acento/15" : "hover:bg-acento/10",
        guias && "outline-dashed outline-2 outline-acento/40",
        clase,
      )}
    />
  );

  return (
    <div ref={caja} className="w-full">
      <div
        className="relative overflow-hidden border-2 border-surface-600 bg-surface-900"
        style={{ width: W * escala, height: H * escala, maxWidth: "100%" }}
      >
        {/* La tarjeta tal cual, a tamaño real y encogida con transform: así no
            hay dos maquetas que mantener y lo que se ve es lo que se publica. */}
        <div
          style={{
            width: W, height: H, transform: `scale(${escala})`, transformOrigin: "top left",
            position: "absolute", top: 0, left: 0,
          }}
        >
          <TarjetaSpeaker
            speakers={speakers}
            title={ajustes.talkTitleCard}
            speakerLine={ajustes.roleCard}
            track={track}
            fecha={fecha} sede={sede} ciudad={ciudad} dominio={dominio}
            qrDataUrl={qrDataUrl}
            {...LOGOS}
            contentX={ajustes.contentX}
            contentY={ajustes.contentY}
            nameOffset={ajustes.nameOffset}
            titleSize={ajustes.titleSize}
            nameSize={ajustes.nameSize}
            fotoX={ajustes.fotoX}
            fotoY={ajustes.fotoY}
            fotoZoom={ajustes.fotoZoom}
            // El nombre con el que la registra satori no existe en el
            // navegador: acá la fuente es la que carga next/font.
            fontFamily="var(--font-jetbrains), ui-monospace, monospace"
          />
        </div>

        {/* Las asas van encima, también escaladas, para que coincidan con lo
            que tapan sin tener que repetir la aritmética. */}
        <div
          style={{
            width: W, height: H, transform: `scale(${escala})`, transformOrigin: "top left",
            position: "absolute", top: 0, left: 0,
          }}
        >
          {unSpeaker && hayFoto && (
            <div
              ref={capaFoto}
              role="button"
              tabIndex={-1}
              aria-label="Arrastra para encuadrar la foto · rueda para acercar"
              title="Arrastra para encuadrar la foto · rueda para acercar"
              onPointerDown={empezar("foto")}
              style={{ top: 0, left: 8, width: 490, height: H, cursor: asa === "foto" ? "grabbing" : "grab" }}
              className={cn(
                "absolute touch-none select-none transition-colors",
                asa === "foto" ? "bg-acento/15" : "hover:bg-acento/10",
                guias && "outline-dashed outline-2 outline-acento/40",
              )}
            />
          )}

          {unSpeaker &&
            zona({ top: ajustes.contentY, left: ajustes.contentX, width: W - ajustes.contentX - 60, height: ajustes.nameOffset - ajustes.contentY, cursor: asa === "texto" ? "grabbing" : "move" },
              "texto", "Arrastra el bloque de texto")}

          {unSpeaker &&
            zona({ top: ajustes.nameOffset - 14, left: ajustes.contentX, width: W - ajustes.contentX - 60, height: 28, cursor: "ns-resize" },
              "raya", "Arrastra la raya del nombre")}
        </div>
      </div>
    </div>
  );
}

function acotar(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
