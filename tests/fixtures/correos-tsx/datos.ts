/** Datos fijos de prueba (inventados) para los cuatro correos y el texto visible que se compara. */

export const INVITACION = {
  name: "Ana Prueba Ejemplo",
  role: "organizer",
  createPasswordUrl: "https://ejemplo.test/admin/crear-clave/tok_abc123",
};

export const PASAPORTE = {
  name: "Luis Muestra",
  confirmUrl: "https://ejemplo.test/confirmar-cambios/tok_xyz789",
  changes: [
    { label: "LinkedIn", value: "https://linkedin.com/in/luis-muestra" },
    { label: "Foto", value: "actualizada" },
  ],
};

export const PROPUESTA = {
  firstName: "Marta",
  lastName: "Demo",
  email: "marta@ejemplo.test",
  talkTitle: "Serverless sin miedo",
  talkAbstract: "Primera línea del resumen.\nSegunda línea con más detalle.",
  sessionType: "in-person",
  audienceLevel: "intermediate",
  track: "",
  language: "es",
  countryCity: "Ciudad Ficticia",
  tagline: "Ingeniera de nube",
  requirements: "Proyector HDMI",
  coSpeakerNames: ["Pablo Uno", "Rosa Dos"],
  slug: "marta-demo",
};

export const CERTIFICADO = { name: "Carla Ejemplo Muestra" };

/** Texto que ve quien lee el correo: sin etiquetas, sin entidades y con los espacios colapsados. */
export function textoVisible(html: string): string {
  return html
    .replace(/<(style|head|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&zwnj;|&#8203;|&#x200C;|[‌​ ͏­]/gi, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    // React parte el texto con comentarios al mezclar variables: dejan un espacio antes de la puntuación.
    .replace(/ ([.,;:])/g, "$1")
    .trim();
}
