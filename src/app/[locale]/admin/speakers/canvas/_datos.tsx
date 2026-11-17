"use client";

import { EVENTO, PAIS } from "@/config";

export interface CanvasProfile {
  slug: string;
  name: string;
  status: string;
  track?: string;
  photo?: string;
  talkTitle: string;
  talkTitleCard: string;
  tagline: string;
  role: string;
  company: string;
  companyLogo?: string;
  roleCard: string;
  coSpeakers?: { firstName?: string; lastName?: string; photo?: string; role?: string; tagline?: string; company?: string; companyLogo?: string }[];
  cardContentX: number | null;
  cardContentY: number | null;
  cardNameOffset: number | null;
  cardTitleSize: number | null;
  cardNameSize: number | null;
  cardPhotoX: number | null;
  cardPhotoY: number | null;
  cardPhotoZoom: number | null;
  cardApproved: boolean;
  cardImageUrl: string;
}

export const POR_DEFECTO = {
  contentX: 530, contentY: 180, nameOffset: 532, nameSize: 40,
  fotoX: 50, fotoY: 50, fotoZoom: 1,
};

/** Los estados por los que pasa una propuesta, con el nombre que se les da. */
export const ESTADOS = [
  { valor: "submitted", label: "Postulado" },
  { valor: "reviewing", label: "En revisión" },
  { valor: "accepted", label: "Aceptado" },
  { valor: "scheduled", label: "Agendado" },
  { valor: "waitlisted", label: "En lista de espera" },
  { valor: "rejected", label: "Descartado" },
] as const;

export const FECHA = new Date(EVENTO.inicio).toLocaleDateString(PAIS.locale, {
  day: "numeric", month: "long", year: "numeric", timeZone: EVENTO.zona,
});

export function Numero({
  label, value, onChange, min, max, step = 1, sufijo,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; sufijo?: string;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-xs text-surface-300">{label}</span>
      <input
        type="range"
        value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer appearance-none bg-surface-600 accent-acento"
      />
      <input
        type="number"
        value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 shrink-0 border-2 border-surface-600 bg-surface-800 px-2 py-1 text-center font-mono text-xs text-acento focus:border-acento focus:outline-hidden"
      />
      {sufijo && <span className="w-6 shrink-0 font-mono text-[10px] text-surface-300">{sufijo}</span>}
    </label>
  );
}
