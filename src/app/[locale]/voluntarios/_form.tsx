"use client";

import { useVoluntariosForm } from "./_use-form";
import { BloquePersona } from "./_bloque-persona";
import { BloqueEvento } from "./_bloque-evento";
import { BloqueCierre } from "./_bloque-cierre";

export function VoluntariosForm(props: Parameters<typeof useVoluntariosForm>[0]) {
  const f = useVoluntariosForm(props);
  return (
    <form onSubmit={f.handleSubmit} className="flex flex-col gap-6" noValidate>
      <BloquePersona f={f} />
      <BloqueEvento f={f} />
      <BloqueCierre f={f} />
    </form>
  );
}

export type { VolunteerValues } from "./_use-form";
