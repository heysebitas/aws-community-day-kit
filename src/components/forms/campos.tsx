import { labelOf, type Locale } from "@/data/attendee-form";
import { type Option } from "@/data/volunteer-form";
import { cn } from "@/lib/utils";

/** Fila de dos campos que se alinean entre sí. */
export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto_auto] sm:gap-y-0">
      {children}
    </div>
  );
}

/** Un campo: etiqueta, pista, control y error. */
export function Field({
  label, hint, error, required, htmlFor, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:row-span-4 sm:grid sm:grid-rows-subgrid">
      <label htmlFor={htmlFor} className="font-mono text-sm font-semibold text-tinta">
        {label} {required && <span className="text-acento-profundo">*</span>}
      </label>
      {hint ? (
        <p className="m-0 mt-1 font-mono text-xs text-tinta/70">{hint}</p>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="m-0 mt-1.5 font-mono text-xs text-error">{error}</p>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

export const inputCls =
  "w-full border-2 border-tinta/75 bg-papel/80 px-4 py-3 font-mono text-sm text-tinta " +
  "placeholder:text-tinta/70 transition-all " +
  "focus:-translate-y-px focus:border-tinta focus:bg-white " +
  "focus:shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]";

/** Botonera de una sola opción. La elegida va en negro, como en el resto. */
export function Choice({
  options, value, onChange, cols = 2, locale,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  cols?: 2 | 3;
  locale: Locale;
}) {
  return (
    <div className={cn("grid gap-3", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "border-2 px-3 py-3.5 font-mono text-sm font-bold transition-all",
            value === o.value
              ? "border-tinta bg-tinta text-acento shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
              : "border-tinta/75 bg-papel/80 text-tinta hover:-translate-y-px hover:border-tinta hover:shadow-[3px_3px_0_0_var(--color-tinta)]",
          )}
        >
          {labelOf(o, locale)}
        </button>
      ))}
    </div>
  );
}

/** Separador de bloque, con el mismo letrero de puntos del resto del sitio. */
export function Bloque({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t-2 border-tinta/20 pt-6">
      <p className="m-0 etiqueta leading-none text-tinta/70">{children}</p>
    </div>
  );
}
