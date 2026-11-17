import {
  BigStat, Callout, DetailBox, Divider, EmailLayout, HardButton,
  Heading, Kicker, Paragraph, Steps,
} from "./_kit";
import { aplicarVariables, bloquesVisibles, textoConAlternativa, type Bloque } from "./bloques";
import { SITIO } from "@/config";


/**
 * Dibuja un correo a partir de sus bloques, con el kit. Es el único
 * renderizador de las plantillas editables.
 */
export function PlantillaBloques({
  bloques,
  preview,
  strip,
  valores = {},
  banderas = [],
  extra,
}: {
  bloques: Bloque[];
  preview?: string;
  strip?: string;
  valores?: Record<string, string>;
  /** Qué condiciones cumple quien recibe. Ver `bloquesVisibles`. */
  banderas?: string[];
  /** Lo que añade el código detrás de los bloques: datos que cambian en cada correo, como la copia de lo que alguien envió. */
  extra?: React.ReactNode;
}) {
  const v = (texto: string) => aplicarVariables(texto, valores);
  const visibles = bloquesVisibles(bloques, banderas);

  return (
    <EmailLayout preview={preview ? v(preview) : undefined} strip={strip}>
      {visibles.map((b) => {
        switch (b.tipo) {
          case "kicker":
            return <Kicker key={b.id}>{v(b.texto)}</Kicker>;

          case "titulo":
            return <Heading key={b.id}>{textoConAlternativa(b.texto, b.siVacio, valores)}</Heading>;

          case "parrafo":
            return <Paragraph key={b.id} muted={b.apagado}>{textoConAlternativa(b.texto, b.siVacio, valores)}</Paragraph>;

          case "boton": {
            /** Un botón sin enlace no sale. Pasa cuando su enlace es una variable que todavía no tiene valor. */
            const destino = v(b.enlace).trim();
            if (!destino) return null;
            return (
              <HardButton key={b.id} href={destino} variant={b.contorno ? "outline" : "solid"}>
                {v(b.texto)}
              </HardButton>
            );
          }

          case "aviso":
            return (
              <Callout key={b.id} title={b.titulo ? v(b.titulo) : undefined}>
                {v(b.texto)}
              </Callout>
            );

          case "datos": {
            /* Una fila sin valor no sale: una variable opcional no deja la etiqueta suelta. */
            const filas = b.filas
              .map((f) => ({ label: v(f.etiqueta), value: v(f.valor) }))
              .filter((f) => f.value.trim());
            if (!filas.length) return null;
            return <DetailBox key={b.id} rows={filas} />;
          }

          case "pasos":
            return <Steps key={b.id} items={b.items.map((i) => v(i))} />;

          case "cifra":
            return <BigStat key={b.id} value={v(b.valor)} label={v(b.etiqueta)} />;

          case "cuentaRegresiva":
            /* Es una imagen porque el correo no corre JavaScript. La URL es absoluta: un correo no tiene origen contra el que resolverla. */
            return (
              <table key={b.id} width="100%" cellPadding="0" cellSpacing="0" role="presentation"
                style={{ margin: "4px 0 22px" }}>
                <tbody>
                  <tr>
                    <td align="center">
                      <img
                        src={`${SITIO}/api/countdown`}
                        alt="Cuenta regresiva hasta la apertura de puertas"
                        width="528"
                        style={{ display: "block", width: "100%", maxWidth: "528px", border: 0 }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            );

          case "imagen": {
            if (!b.url) return null; // sin URL no hay nada que enseñar
            const img = (
              <img
                src={v(b.url)}
                alt={v(b.alt)}
                width="528"
                style={{ display: "block", width: "100%", maxWidth: "528px", border: 0 }}
              />
            );
            return (
              <table key={b.id} width="100%" cellPadding="0" cellSpacing="0" role="presentation"
                style={{ margin: "4px 0 22px" }}>
                <tbody>
                  <tr>
                    <td align="center">
                      {b.enlace ? <a href={v(b.enlace)}>{img}</a> : img}
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          }

          case "separador":
            return <Divider key={b.id} />;
        }
      })}
      {extra}
    </EmailLayout>
  );
}

export default PlantillaBloques;
