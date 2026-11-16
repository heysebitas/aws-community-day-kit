import { Suspense, createElement, type ReactElement } from "react";

/**
 * Dibuja un correo en el navegador, para la vista previa del editor: sin ida
 * y vuelta al servidor, lo escrito se ve al momento.
 */

/** El mismo que pone `@react-email/render`. */
const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ' +
  '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

/**
 * React añade un `<link rel="preload" as="image">` por cada imagen. En un
 * correo no sirven, y `@react-email/render` los quita al enviar.
 */
function sinPrecargas(html: string): string {
  return html.replace(/<link\b[^>]*\/?>/gi, (etiqueta) =>
    /\brel="preload"/.test(etiqueta) && /\bas="image"/.test(etiqueta) ? "" : etiqueta,
  );
}

export async function dibujarCorreo(nodo: ReactElement): Promise<string> {
  /**
   * El renderizador entra por importación dinámica: son unos 260 KB que sólo
   * hacen falta en la pantalla de correos.
   */
  const { renderToReadableStream } = await import("react-dom/server");

  const stream = await renderToReadableStream(
    // El `Suspense` hace que React emita los comentarios de frontera, igual que en el envío.
    createElement(Suspense, null, nodo),
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  );

  await stream.allReady;
  const html = await new Response(stream).text();

  return DOCTYPE + sinPrecargas(html).replace(/<!DOCTYPE.*?>/, "");
}
