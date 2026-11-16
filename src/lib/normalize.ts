/**
 * Normalización y validación de lo que llega de los formularios.
 *
 * Se usa en el cliente, para avisar mientras se escribe, y en el servidor, que
 * es donde de verdad se garantiza.
 */

import { PAIS } from "@/config";
import type { DocRule } from "@/config/tipos";

/** Caracteres invisibles que se cuelan al pegar desde Word, Docs o WhatsApp. */
const INVISIBLE = /[­​-‍⁠﻿]/g;

/** Espacios raros (no-break, fino, ideográfico) → espacio normal. */
const ODD_SPACES = /[   -   　]/g;

/** Limpieza base común a todo: sin invisibles, sin dobles espacios, sin bordes. */
export function cleanWhitespace(value: string): string {
  return value
    .replace(INVISIBLE, "")
    .replace(ODD_SPACES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Igual que la anterior pero conservando saltos de línea (para textos largos). */
export function cleanMultiline(value: string): string {
  return value
    .replace(INVISIBLE, "")
    .replace(ODD_SPACES, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+$/gm, "")   // espacios al final de cada línea
    .replace(/^[ \t]+/gm, "")   // y al principio
    .replace(/\n{3,}/g, "\n\n") // máximo una línea en blanco seguida
    .trim();
}

// ── Correo ───────────────────────────────────────────────────────────────────

/** Sintaxis conservadora: sin puntos dobles ni al borde, TLD de 2+ letras. */
const EMAIL_RE =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/**
 * Lo que cada proveedor admite antes de la @. El RFC acepta comillas y signos
 * que Gmail u Outlook rechazan al crear la cuenta: validar sólo sintaxis deja
 * pasar direcciones que nunca van a recibir nada.
 */
const PROVIDER_RULES: Record<string, { allowed: RegExp; reason: string }> = {
  "gmail.com": {
    allowed: /^[a-z0-9.]+$/,
    reason: "Las direcciones de Gmail sólo llevan letras, números y puntos.",
  },
  "googlemail.com": {
    allowed: /^[a-z0-9.]+$/,
    reason: "Las direcciones de Gmail sólo llevan letras, números y puntos.",
  },
  "outlook.com": {
    allowed: /^[a-z0-9._-]+$/,
    reason: "Esa dirección lleva signos que Outlook no admite.",
  },
  "hotmail.com": {
    allowed: /^[a-z0-9._-]+$/,
    reason: "Esa dirección lleva signos que Hotmail no admite.",
  },
  "live.com": {
    allowed: /^[a-z0-9._-]+$/,
    reason: "Esa dirección lleva signos que Live no admite.",
  },
  "yahoo.com": {
    allowed: /^[a-z0-9._]+$/,
    reason: "Esa dirección lleva signos que Yahoo no admite.",
  },
};

/** Erratas de dominio que valen la pena atajar antes de mandar un correo al vacío. */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.om": "gmail.com",
  "hotmail.co": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "yahoo.co": "yahoo.com",
  "yaho.com": "yahoo.com",
};

export type EmailCheck =
  | { ok: true; value: string; suggestion?: string }
  | { ok: false; value: string; reason: string; suggestion?: string };

export function normalizeEmail(raw: string): EmailCheck {
  const value = cleanWhitespace(raw).toLowerCase().replace(/\s/g, "");

  if (!value) return { ok: false, value, reason: "Escribe tu correo." };

  const at = value.split("@");
  if (at.length !== 2) {
    return { ok: false, value, reason: "El correo debe tener una sola @." };
  }
  const [local, domain] = at;
  if (!local) return { ok: false, value, reason: "Falta el nombre antes de la @." };
  if (!domain) return { ok: false, value, reason: "Falta el dominio después de la @." };
  if (!domain.includes(".")) {
    return { ok: false, value, reason: "El dominio debe llevar un punto (ej. gmail.com)." };
  }
  if (value.includes("..")) {
    return { ok: false, value, reason: "El correo no puede tener dos puntos seguidos." };
  }
  if (domain.startsWith("-") || domain.endsWith("-")) {
    return { ok: false, value, reason: "El dominio no puede empezar ni terminar en guion." };
  }

  const suggestion = DOMAIN_TYPOS[domain]
    ? `${local}@${DOMAIN_TYPOS[domain]}`
    : undefined;

  if (!EMAIL_RE.test(value)) {
    return { ok: false, value, reason: "Ese correo no parece válido.", suggestion };
  }

  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (tld.length < 2) {
    return { ok: false, value, reason: "La terminación del dominio es muy corta." };
  }

  const rule = PROVIDER_RULES[domain];
  if (rule) {
    // Se ignora la etiqueta +algo, que estos proveedores sí aceptan.
    const base = local.split("+")[0];
    if (!base || !rule.allowed.test(base)) {
      return { ok: false, value, reason: rule.reason };
    }
  }

  return { ok: true, value, suggestion };
}

// ── Documento de identidad ───────────────────────────────────────────────────

export type DocCheck =
  | { ok: true; value: string }
  | { ok: false; value: string; reason: string };

/**
 * Dígito verificador del RUN chileno (módulo 11): de derecha a izquierda por la
 * serie 2..7; 11 se escribe 0 y 10 se escribe K.
 */
function runVerifier(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return "0";
  if (rest === 10) return "K";
  return String(rest);
}

/** Los dos dígitos verificadores del CPF brasileño. */
function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (hasta: number) => {
    let suma = 0;
    for (let i = 0; i < hasta; i++) suma += Number(d[i]) * (hasta + 1 - i);
    return ((suma * 10) % 11) % 10;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

/**
 * Valida y normaliza un número de documento según la regla de su tipo.
 *
 * Donde el documento trae dígito verificador se comprueba el número y no sólo
 * el formato: así el error de tipeo aparece al registrarse y no en la puerta.
 */
export function normalizeDocument(raw: string, rule: DocRule): DocCheck {
  const value = cleanWhitespace(raw);
  if (!value) return { ok: false, value: "", reason: "Escribe tu número de documento." };

  switch (rule.kind) {
    case "run": {
      // Se aceptan puntos y guion como los escribe la gente, y se guarda limpio.
      const compact = value.replace(/[.\s]/g, "").toUpperCase();
      const m = compact.match(/^(\d{6,8})-?([0-9K])$/);
      if (!m) {
        return { ok: false, value, reason: "El RUN va con dígito verificador (ej. 12.345.678-5)." };
      }
      const [, body, dv] = m;
      if (runVerifier(body) !== dv) {
        return { ok: false, value, reason: "Ese RUN no es válido: revisa el dígito verificador." };
      }
      return { ok: true, value: `${body}-${dv}` };
    }

    case "cpf": {
      const digits = value.replace(/[.\s-]/g, "");
      if (!cpfValido(digits)) {
        return { ok: false, value, reason: "Ese CPF no es válido: revisa los dígitos verificadores." };
      }
      return { ok: true, value: digits };
    }

    case "digits": {
      const digits = value.replace(/[.\s-]/g, "");
      if (!/^\d+$/.test(digits)) {
        return { ok: false, value, reason: "Ese documento lleva sólo números." };
      }
      if (digits.length < rule.min || digits.length > rule.max) {
        return {
          ok: false,
          value,
          reason: `Debe tener entre ${rule.min} y ${rule.max} dígitos.`,
        };
      }
      return { ok: true, value: digits };
    }

    case "curp": {
      const c = value.replace(/[\s-]/g, "").toUpperCase();
      // 4 letras, fecha AAMMDD, sexo, entidad, 3 consonantes, homoclave y dígito.
      if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/.test(c)) {
        return { ok: false, value, reason: "La CURP son 18 caracteres (ej. GOMC800101HDFNRR09)." };
      }
      return { ok: true, value: c };
    }

    case "loose": {
      const v = value.replace(/\s+/g, "").toUpperCase();
      if (!/^[A-Z0-9.-]+$/.test(v)) {
        return { ok: false, value, reason: "Sólo letras, números, punto y guion." };
      }
      if (v.length < rule.min || v.length > rule.max) {
        return {
          ok: false,
          value,
          reason: `Debe tener entre ${rule.min} y ${rule.max} caracteres.`,
        };
      }
      return { ok: true, value: v };
    }
  }
}

// ── Teléfono ─────────────────────────────────────────────────────────────────

export type Country = {
  code: string;   // ISO-3166 alfa-2
  name: string;
  dial: string;   // con +
  flag: string;
  /** Largo esperado del número local, sin indicativo. */
  digits: number | [number, number];
};

/** El país del evento primero; el resto en orden alfabético. */
const LISTA: Country[] = [
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷", digits: [10, 11] },
  { code: "BO", name: "Bolivia", dial: "+591", flag: "🇧🇴", digits: 8 },
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷", digits: [10, 11] },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱", digits: 9 },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴", digits: 10 },
  { code: "CR", name: "Costa Rica", dial: "+506", flag: "🇨🇷", digits: 8 },
  { code: "CU", name: "Cuba", dial: "+53", flag: "🇨🇺", digits: 8 },
  { code: "EC", name: "Ecuador", dial: "+593", flag: "🇪🇨", digits: 9 },
  { code: "SV", name: "El Salvador", dial: "+503", flag: "🇸🇻", digits: 8 },
  { code: "ES", name: "España", dial: "+34", flag: "🇪🇸", digits: 9 },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸", digits: 10 },
  { code: "GT", name: "Guatemala", dial: "+502", flag: "🇬🇹", digits: 8 },
  { code: "HN", name: "Honduras", dial: "+504", flag: "🇭🇳", digits: 8 },
  { code: "MX", name: "México", dial: "+52", flag: "🇲🇽", digits: 10 },
  { code: "NI", name: "Nicaragua", dial: "+505", flag: "🇳🇮", digits: 8 },
  { code: "PA", name: "Panamá", dial: "+507", flag: "🇵🇦", digits: [7, 8] },
  { code: "PY", name: "Paraguay", dial: "+595", flag: "🇵🇾", digits: 9 },
  { code: "PE", name: "Perú", dial: "+51", flag: "🇵🇪", digits: 9 },
  { code: "PR", name: "Puerto Rico", dial: "+1", flag: "🇵🇷", digits: 10 },
  { code: "DO", name: "República Dominicana", dial: "+1", flag: "🇩🇴", digits: 10 },
  { code: "UY", name: "Uruguay", dial: "+598", flag: "🇺🇾", digits: 8 },
  { code: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪", digits: 10 },
];

export const COUNTRIES: Country[] = [
  ...LISTA.filter((c) => c.code === PAIS.codigo),
  ...LISTA.filter((c) => c.code !== PAIS.codigo),
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function findCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}

/** Deja sólo dígitos: se caen espacios, guiones, paréntesis y puntos. */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

export type PhoneCheck =
  | { ok: true; value: string }
  | { ok: false; value: string; reason: string };

/** Valida el número local contra el largo esperado del país y lo une al indicativo. */
export function normalizePhone(rawLocal: string, country: Country): PhoneCheck {
  let local = digitsOnly(rawLocal);

  // Si pegan el número con el indicativo incluido, se quita para no duplicarlo.
  const dial = country.dial.replace("+", "");
  if (local.startsWith(dial) && local.length > dial.length) {
    local = local.slice(dial.length);
  }
  // Varios países se escriben con un 0 delante en formato nacional.
  if (local.startsWith("0")) local = local.replace(/^0+/, "");

  if (!local) return { ok: false, value: "", reason: "Escribe tu teléfono." };

  const [min, max] = Array.isArray(country.digits)
    ? country.digits
    : [country.digits, country.digits];

  if (local.length < min || local.length > max) {
    const expected = min === max ? `${min}` : `${min} o ${max}`;
    return {
      ok: false,
      value: local,
      reason: `Un número de ${country.name} tiene ${expected} dígitos (llevas ${local.length}).`,
    };
  }

  return { ok: true, value: `${country.dial}${local}` };
}

// ── Texto ────────────────────────────────────────────────────────────────────

// ── Enlaces y usuarios de redes ──────────────────────────────────────────────

export type LinkCheck =
  | { ok: true; value: string }
  | { ok: false; value: string; reason: string };

/** Dominio esperado por red, para atajar el pegado en la casilla equivocada. */
const SOCIAL_HOSTS: Record<string, string[]> = {
  linkedin: ["linkedin.com"],
  twitter: ["x.com", "twitter.com"],
  instagram: ["instagram.com"],
  github: ["github.com"],
  builderCenter: ["builder.aws.com"],
};

/**
 * Valida una casilla de red social o de sitio web. Acepta el enlace completo o
 * sólo el usuario, y si llega un enlace comprueba que el dominio sea el de esa
 * red: pegar el LinkedIn en la casilla de Instagram es el error más común.
 *
 * `platform` vacío acepta cualquier dominio.
 */
export function normalizeLink(raw: string, platform = ""): LinkCheck {
  const value = cleanWhitespace(raw);
  if (!value) return { ok: true, value: "" };

  if (/\s/.test(value)) {
    return { ok: false, value, reason: "No puede llevar espacios." };
  }

  const looksLikeUrl = /^https?:\/\//i.test(value) || value.includes("/") || value.includes(".");

  if (!looksLikeUrl) {
    // Usuario suelto. Se admite la arroba de adorno.
    const user = value.replace(/^@+/, "");
    if (!/^[A-Za-z0-9._-]{1,60}$/.test(user)) {
      return { ok: false, value, reason: "Sólo letras, números, punto, guion y guion bajo." };
    }
    return { ok: true, value: user };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { ok: false, value, reason: "Ese enlace no es válido." };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!host.includes(".")) {
    return { ok: false, value, reason: "Al dominio le falta un punto (ej. .com)." };
  }

  const expected = SOCIAL_HOSTS[platform];
  if (expected && !expected.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { ok: false, value, reason: `Ese enlace no es de ${expected[0]}.` };
  }

  // Se devuelve normalizado a https, sin la barra final que no aporta.
  return { ok: true, value: url.toString().replace(/\/$/, "") };
}

/**
 * Emoji y sus acompañantes: selectores de variación, uniones de ancho cero,
 * tonos de piel y los indicadores regionales de las banderas.
 */
const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}️‍]/gu;

/**
 * Los tres que casi siempre son texto y no adorno. Para Unicode son emoji,
 * pero «Acme®» no es lo que se quiere quitar.
 */
const PICTOGRAMAS_DE_TEXTO = new Set(["©", "®", "™"]);

/**
 * Quita los emoji. Va en los campos cortos —nombre, cargo, título de charla—,
 * que terminan en tarjetas, gafetes y PDF donde no siempre se pueden dibujar.
 */
export function sinEmoji(value: string): string {
  return value
    .replace(EMOJI, (c) => (PICTOGRAMAS_DE_TEXTO.has(c) ? c : ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function toUpper(value: string): string {
  return value.toLocaleUpperCase("es");
}

/**
 * Partículas que dentro de un apellido van en minúscula: «Juan de la Cruz»,
 * «Ana dos Santos». Sólo si no abren el nombre — quien se apellida «De la
 * Cruz» a secas conserva su mayúscula inicial.
 */
const PARTICULAS = new Set([
  "de", "del", "la", "las", "lo", "los", "y", "e", "da", "das", "do", "dos",
  "van", "von", "di", "der", "den", "bin", "al",
]);

/**
 * Nombres con la caja ordenada: «JUAN PÉREZ» y «juan perez» se guardan igual.
 * Respeta guiones, apóstrofos («O'Higgins») y partículas («de la Cruz»). No
 * adivina mayúsculas internas como «McDonald».
 */
export function toName(value: string): string {
  const limpio = sinEmoji(cleanWhitespace(value)).toLocaleLowerCase("es");
  if (!limpio) return "";

  /** Sube la primera letra de cada tramo separado por guion o apóstrofo. */
  const capitalizar = (palabra: string) =>
    palabra.replace(/(^|[-'’])([\p{L}])/gu, (_, sep: string, letra: string) =>
      sep + letra.toLocaleUpperCase("es"),
    );

  return limpio
    .split(" ")
    .map((palabra, i) =>
      i > 0 && PARTICULAS.has(palabra) ? palabra : capitalizar(palabra),
    )
    .join(" ");
}
