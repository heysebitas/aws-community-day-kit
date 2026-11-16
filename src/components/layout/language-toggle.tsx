"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { IDIOMAS } from "@/config";
import { cn } from "@/lib/utils";

const NOMBRE: Record<string, string> = { es: "Español", en: "English", pt: "Português" };

/** Un botón por idioma de la edición. Con uno solo no se muestra. */
export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  if (IDIOMAS.length < 2) return null;

  return (
    <div className="flex items-center border-2 border-acento/40">
      {IDIOMAS.map((idioma) => (
        <button
          key={idioma}
          onClick={() => idioma !== locale && router.replace(pathname, { locale: idioma })}
          className={cn(
            "px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors",
            idioma === locale ? "bg-acento text-surface-900" : "text-surface-400 hover:text-surface-200",
          )}
          // El nombre accesible empieza por lo que se ve («ES»), que es lo que
          // pide la regla label-content-name-mismatch. El texto va en mayúsculas
          // en el marcado, no sólo por el CSS, para que coincidan tal cual.
          aria-label={`${idioma.toUpperCase()}, ${NOMBRE[idioma] ?? idioma}`}
          aria-pressed={idioma === locale}
          lang={idioma}
        >
          {idioma.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
