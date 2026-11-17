import { routing } from "@/i18n/routing";

/** Rutas con sesión, token o datos de una persona: nunca se precargan. */
const EXCLUIDAS = ["admin", "api", "confirmar", "encuesta", "pasaporte"];

/** Prefetch moderado de todo el sitio salvo lo excluido, con y sin prefijo de idioma. */
export function reglasEspeculativas() {
  const bases = ["", ...routing.locales.map((l) => `/${l}`)];
  const excluidas = bases.flatMap((b) => EXCLUIDAS.map((r) => `${b}/${r}/*`));
  return {
    prefetch: [
      {
        where: {
          and: [
            { href_matches: "/*" },
            { not: { href_matches: [...excluidas, ...EXCLUIDAS.map((r) => `/${r}`)] } },
          ],
        },
        eagerness: "moderate",
      },
    ],
  };
}
