/** Los estados por los que pasa un correo enviado. */

export const ESTADOS_ENVIO = ["enviado", "entregado", "rebotado", "queja", "fallido"] as const;
export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

export const ETIQUETA_ENVIO: Record<EstadoEnvio, string> = {
  enviado: "Enviado",
  entregado: "Entregado",
  rebotado: "Rebotó",
  queja: "Marcado como spam",
  fallido: "No salió",
};
