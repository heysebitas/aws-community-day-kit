import { EVENTO } from "@/config";
import { basePath, cn } from "@/lib/utils";

/**
 * El logotipo del evento: el logo del programa y, al lado, el nombre en dos
 * renglones con la edición debajo. Sale en la barra, el menú móvil, el pie y
 * el panel, así que vive acá una sola vez.
 */
export function Marca({
  tono = "claro",
  alto = "h-9",
  soloLogoEnMovil = false,
  className,
}: {
  /** `claro` va sobre negro; `tinta`, sobre el bloque del tema. */
  tono?: "claro" | "tinta";
  alto?: string;
  /** En pantallas muy angostas deja sólo el logo, para no empujar lo que tenga al lado. */
  soloLogoEnMovil?: boolean;
  className?: string;
}) {
  const { logo, alt, lineas, logoTamano } = EVENTO.marca;
  const texto = tono === "tinta" ? "text-tinta" : "text-surface-50";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${basePath}${logo}`}
        alt={alt}
        // Reserva el espacio antes de que cargue el logo; `w-auto` lo ajusta a `alto`.
        width={logoTamano?.ancho ?? 304}
        height={logoTamano?.alto ?? 182}
        loading="eager"
        className={cn(alto, "w-auto shrink-0", tono === "tinta" && "brightness-0")}
      />
      <span className={cn("min-w-0 leading-tight", soloLogoEnMovil && "hidden xs:block")}>
        {lineas.map((l) => (
          <span key={l} className={cn("block truncate font-mono text-xs font-semibold tracking-wide", texto)}>
            {l}
          </span>
        ))}
        <span className={cn("block truncate font-mono text-xs tracking-widest", tono === "tinta" ? "text-tinta" : "text-acento")}>
          {EVENTO.edicion} {EVENTO.anio}
        </span>
      </span>
    </span>
  );
}
