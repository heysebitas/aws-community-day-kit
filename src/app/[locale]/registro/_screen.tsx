"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { textoDeError } from "@/lib/errores-cliente";
import { FormShell } from "@/components/forms/form-shell";
import type { SummaryRow } from "@/components/forms/success-screen";
import { RegistroForm, type Responses } from "./_form";

/** Parte cliente del registro. */
export function RegistroScreen({
  isOpen,
  volunteersOpen,
  locale,
  title,
  lead,
  closedTitle,
  closedLead,
}: {
  isOpen: boolean;
  /** Si la convocatoria de voluntarios acepta postulaciones ahora mismo. */
  volunteersOpen: boolean;
  locale: string;
  title: string;
  lead: string;
  closedTitle: string;
  closedLead: string;
}) {
  const router = useRouter();
  const tErr = useTranslations("Errores");

  const handleSubmit = async (values: Responses, captchaToken: string, resumen: SummaryRow[]) => {
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: values, captchaToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(textoDeError(tErr, data, tErr("error_interno")));
    }

    // El nombre y la modalidad viajan a la pantalla de gracias por
    // sessionStorage y no por la URL: la tarjeta que se descarga lleva el
    // nombre impreso, pero no hace falta que quede en el historial ni que se
    // pueda compartir un enlace con el nombre de otra persona.
    try {
      const nombre = [values.firstName, values.lastName].filter(Boolean).join(" ");
      if (nombre) sessionStorage.setItem("scd:nombre", nombre);
      sessionStorage.setItem("scd:modalidad", values.attendance ?? "");
      // El repaso de lo enviado se muestra en /gracias, al final de todo.
      sessionStorage.setItem("scd:resumen", JSON.stringify(resumen));
      // El correo siembra la carita del pasaporte y la entidad va impresa en él.
      sessionStorage.setItem("scd:correo", values.email ?? "");
      sessionStorage.setItem("scd:entidad", values.entityName ?? "");
    } catch {
      // Modo privado o almacenamiento bloqueado: la tarjeta sale sin nombre.
    }

    router.push(locale === "en" ? "/en/registro/gracias" : "/registro/gracias");
  };

  return (
    <FormShell title={title} lead={lead} className="max-w-3xl">
      {isOpen ? (
        <RegistroForm onSubmit={handleSubmit} volunteersOpen={volunteersOpen} />
      ) : (
        <div className="py-12 text-center">
          <p className="font-mono text-sm text-tinta/70">{closedTitle}</p>
          <p className="mt-2 font-mono text-xs text-tinta/70">{closedLead}</p>
        </div>
      )}
    </FormShell>
  );
}
