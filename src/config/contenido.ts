import type { Traducible } from "./tipos";

/** Los tipos de las listas de `evento/`: equipo, keynotes, patrocinadores, comunidades, grupos y tracks. */

export type Redes = Partial<Record<"awsBuilder" | "linkedin" | "github" | "instagram" | "x" | "web", string>>;

export type Organizador = {
  /** También es la semilla del avatar cuando no hay foto. */
  id: string;
  nombre: string;
  rol: string;
  /** Código ISO del país, si quieres que salga su bandera en la tarjeta. */
  pais?: string;
  /** Ruta bajo `public/`. Vacío muestra un avatar generado. */
  foto?: string;
  redes?: Redes;
};

export type Keynote = {
  nombre: string;
  apellido: string;
  cargo?: string;
  empresa?: string;
  /** Abre el bloque de la charla en la tarjeta: sin esto el título no se pinta. */
  tipoCharla?: string;
  tituloCharla?: string;
  foto?: string;
  linkedin?: string;
  /** Marca a la persona como parte del programa anfitrión (sale su logo en la tarjeta). */
  delPrograma?: boolean;
  /** Si tiene perfil en el directorio de speakers, su slug. */
  perfil?: string;
};

export type NivelPatrocinio = "diamond" | "platinum" | "gold" | "community";

export type Patrocinador = {
  id: string;
  nombre: string;
  /** PNG o SVG con fondo transparente: se pinta sobre negro. */
  logo: string;
  url: string;
  nivel: NivelPatrocinio;
};

export type Comunidad = {
  id: string;
  nombre: string;
  logo: string;
  /** Vacío mientras no se tenga: entonces no es un enlace. */
  url: string;
};

/** Un grupo estudiantil organizador (Student Builder Group, Cloud Club, capítulo…). */
export type Grupo = { nombre: string; url: string };

export type Track = {
  /** Se guarda en las charlas y en la agenda: no cambiarlo con el evento en marcha. */
  id: string;
  titulo: Traducible;
  /** Para distintivos y filtros: 12 caracteres como mucho. */
  corto: string;
  nivel: Traducible;
  /** Tres o cuatro palabras clave que salen al pie de la tarjeta de la portada. */
  temas: string[];
  /** Temas sugeridos a quien postula una charla. */
  postula: Traducible;
};
