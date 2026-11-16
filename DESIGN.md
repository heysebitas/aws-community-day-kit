---
# DESIGN.md — formato google-labs-code/design.md (version "alpha").
# Fuente de verdad del código: src/app/globals.css (@theme inline) y src/config/temas.ts.
# Los colores del acento son los del tema «naranja», el de fábrica; el layout los
# cambia por los del tema elegido en evento/config.ts. Los demás tokens no cambian.
version: alpha
name: "Community Day Kit"
description: "Sitio, formularios y panel de un Student Community Day: que un estudiante entienda el evento y se registre en un minuto."

colors:
  # --- Escalera de superficies (canvas → elevado), tema oscuro único.
  surface-0: "oklch(0.000 0.000 0)"       # canvas · --color-surface-900 #000000
  surface-1: "oklch(0.147 0.011 285)"     # tarjeta · --color-surface-800 #0A0A0F
  surface-2: "oklch(0.205 0.018 285)"     # tarjeta activa, input oscuro · --color-surface-700 #16161F
  surface-3: "oklch(0.269 0.020 285)"     # pozo, borde de relleno · --color-surface-600 #252530
  # --- Texto sobre oscuro
  ink: "oklch(0.910 0.015 286)"           # --color-surface-100 #E0E0EB
  ink-muted: "oklch(0.653 0.027 286)"     # --color-surface-300 #8E8EA0 · ≥ 4.5:1 en surface-0…3
  ink-faint: "oklch(0.601 0.033 285)"     # --color-surface-400 #7E7E94 · solo sobre surface-0…2 (≥ 4.5:1)
  line: "oklch(0.355 0.028 285)"          # --color-surface-500 #3A3A4A · bordes y rellenos, NUNCA texto
  # --- Marca (tema naranja)
  primary: "oklch(0.772 0.174 65)"        # --color-acento #FF9900: bloques claros, CTA, detalle sobre negro
  primary-light: "oklch(0.852 0.129 76)"  # --color-acento-claro #FFC266
  primary-strong: "oklch(0.719 0.162 65)" # --color-acento-fuerte #E88B00 (hover)
  primary-deep: "oklch(0.388 0.097 54)"   # --color-acento-profundo #6B3300: acento sobre el bloque claro
  # --- Texto sobre el bloque de acento
  on-primary: "oklch(0.000 0.000 0)"      # --color-tinta #000000
  on-primary-muted: "oklch(0.332 0.072 70)" # tinta al 70 % sobre el acento (≈ #4D2E00): el único secundario
  paper: "oklch(1.000 0.000 0)"           # --color-papel #FFFFFF
  # --- Semánticos
  danger: "oklch(0.312 0.108 26)"         # --color-error #5C1010: 4,5:1 sobre cualquier acento del tema

typography:
  # Tres voces: Oxanium para títulos, Handjet (.dot-matrix) para la voz de marca en
  # grande, JetBrains Mono para todo lo demás.
  display:
    fontFamily: "Handjet, JetBrains Mono, ui-monospace, monospace"
    fontSize: 3.75rem
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0.06em
  h1:
    fontFamily: "Oxanium, JetBrains Mono, ui-monospace, monospace"
    fontSize: 5.375rem
    fontWeight: 500
    lineHeight: 0.85
    letterSpacing: -0.05em
  h2:
    # Los títulos de sección son el letrero: Handjet en mayúsculas, tracking positivo.
    fontFamily: "Handjet, JetBrains Mono, ui-monospace, monospace"
    fontSize: 3.75rem
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0.06em
  h3:
    fontFamily: "Oxanium, JetBrains Mono, ui-monospace, monospace"
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: -0.025em
  body:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0em
  small:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: 0.025em
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0.05em

rounded:
  none: 0px
  full: 9999px   # solo puntos de estado, avatares redondos y halos decorativos

spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "6": 24px
  "8": 32px
  "12": 48px
  control: 44px  # min-h-11
  section-s: 96px   # .seccion-s (64px en móvil): secciones de lista
  section-m: 128px  # .seccion-m (80px en móvil): por defecto
  section-l: 192px  # .seccion-l (96px en móvil): CTA final
  gutter: 16px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: 12px 24px
  button-on-block:
    backgroundColor: "{colors.on-primary}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: 12px 24px
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: 24px
  block:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    padding: 32px
  block-muted:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary-muted}"
    rounded: "{rounded.none}"
    padding: 32px
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: 10px 12px
---

## Overview

Un kit para montar el sitio de un Student Community Day sin tocar código. El público son
estudiantes que llegan desde un enlace en el móvil; el trabajo principal es entender qué,
cuándo y dónde, y registrarse. La audacia se gasta en el letrero de matriz de puntos
(Handjet) y en los bloques planos del color del tema con tinta negra encima; alrededor,
todo es negro, monoespaciado y recto.

- **Personalidad:** técnico, brutalista, de cartel (bordes de 2 px, sombras duras desplazadas, cero radios).
- **Referentes:** letreros LED de estación (la regla: la matriz de puntos solo en grande y en mayúsculas) y la estética de terminal (la regla: una sola familia mono para todo el texto corrido).
- **Anti-referentes:** landing SaaS con glassmorphism, tarjetas redondeadas con sombras difusas y degradados de brillo.
- **Recetas de imagen:** ninguna.
- **Medido / inferido:** tipografía, superficies, acento y ritmo medidos con `medir.js` sobre la portada en modo demo (2026-11-16). Paddings de componentes y el papel `label` inferidos del código (`src/components/admin/ui.tsx`, `src/app/globals.css`).

## Colors

| Token | Rol | Dónde se permite |
|---|---|---|
| primary | Acento del tema: bloque claro, CTA, detalle sobre negro | Fondos de bloque, botones, cintas, texto de detalle sobre surface-0…2 al 100 % |
| primary-deep | Acento sobre el bloque claro | Texto o icono de acento dentro de `.form-block` o de un bloque `bg-acento` |
| on-primary / on-primary-muted | Texto sobre el bloque claro | `text-tinta` y `text-tinta/70`. Ningún otro valor de opacidad |
| ink / ink-muted / ink-faint | Texto sobre negro | `text-surface-100…50`, `text-surface-300`, `text-surface-400` (este solo en surface-0…2) |
| line | Bordes y rellenos | `border-surface-500`, `bg-surface-500`. Nunca `text-surface-500/600/700` |
| danger | Error de formulario sobre el bloque claro | `text-error`, `border-error` |

**Modo oscuro:** el sitio solo tiene tema oscuro con bloques claros del color del acento;
no hay tokens `-dark`. El acento lo elige cada edición (`src/config/temas.ts`); todo tema
nuevo tiene que pasar 4.5:1 con `tinta` encima y con `acento-profundo` encima.

## Typography

- Familias: Oxanium para h1/h2/h3 (títulos de tarjeta), Handjet (`.dot-matrix`) para el letrero de marca, JetBrains Mono para el resto. Handjet es la tercera voz y solo existe en grande.
- `.dot-matrix` solo desde 18 px (`text-lg`); por debajo pierde la forma y se usa mono en mayúsculas con `tracking-wider`.
- Tamaño mínimo de texto: 12 px (`text-xs`). Nada de `text-[10px]` ni `text-[11px]` en el sitio público.
- h3 es el título de tarjeta (Oxanium). El rótulo de un campo de formulario es `label` (mono 12 px, 600, mayúsculas, +0.05em) y no se marca como h3.
- Mayúsculas: en `.dot-matrix`, `label` y botones.

## Layout

- Rejilla: contenedor de 80 rem (`max-w-7xl`) con 16 px de gutter en móvil; contenido alineado a la izquierda, titulares de sección centrados.
- Ritmo de secciones: `section-s` (96 px) en secciones de lista, `section-m` (128 px) por defecto, `section-l` (192 px) antes y después del hero y del CTA final.
- Densidad objetivo: media.
- Hero: titular, letrero con fecha y ciudad, cuenta atrás y un CTA. La nav lleva su propio CTA.

## Elevation & Depth

Las cajas se separan con **borde de 2 px** y, si flotan, con **sombra dura desplazada**
(`5px 5px 0 0`, sin difuminado). La escalera de luminosidad es corta a propósito: es un
estilo de cartel, no de capas.

| Nivel | Token | Uso | ΔL vs canvas (claro) | ΔL vs canvas (oscuro) |
|---|---|---|---|---|
| 0 | surface-0 | Canvas | 0 | 0 |
| 1 | surface-1 | Tarjeta | — | +0.147 |
| 2 | surface-2 | Tarjeta activa, input | — | +0.205 |
| 3 | surface-3 | Pozo, relleno de control | — | +0.269 |

## Shapes

- Radio único: `{rounded.none}`. `{rounded.full}` solo para puntos de estado, avatares y halos decorativos con `blur`.
- Bordes de 2 px (`border-2`). Sin bordes de 1 px en componentes del sitio público.
- Sombras duras: `shadow-[5px_5px_0_0_…]`. Prohibidas las sombras con difuminado y `backdrop-blur` en tarjetas.

## Components

- **button-primary**: acción principal sobre negro. No dentro del bloque claro (allí va button-on-block).
- **button-on-block**: botón negro con texto del acento dentro de `.form-block` o un bloque `bg-acento`.
- **card**: tarjeta sobre negro con borde de 2 px `line`. No para texto largo legal.
- **block / block-muted**: bloque del color del tema con tinta negra; el texto secundario es tinta al 70 %.
- **input**: control de 44 px de alto como mínimo (`min-h-11`), sin radio.

## Do's and Don'ts

- Do: texto secundario sobre el bloque claro en `text-tinta/70`, y nada más.
- Do: acento en texto pequeño al 100 % (`text-acento`) sobre negro o `text-acento-profundo` sobre claro.
- Do: números de marca de agua (`text-white/10`) con `aria-hidden="true"`.
- Do: controles con `min-h-11`.
- Do: controles sin elegir sobre el bloque claro con borde `tinta` al 75 % (≥ 3:1 en todos los temas) y fondo `papel` al 80 %; elegidos en `tinta` sólida con el texto en acento y `aria-pressed`.
- Don't: `text-surface-500`, `text-surface-600` ni `text-surface-700` como color de texto.
- Don't: `text-tinta/40…60`, `text-acento/50…70`.
- Don't: `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `backdrop-blur-*` o `shadow-[…_Npx_…]` con difuminado en el sitio público.
- Don't: hexadecimales a mano en `className` (`text-[#…]`, `bg-[#…]`); el color sale de un token.
- Don't: `alert`, `confirm` o `prompt`.

## Audit Targets

| Clave | Objetivo | Tolerancia |
|---|---|---|
| `tipografia.<nivel>.tracking_em` | = `typography.<nivel>.letterSpacing` | ±0.008 em |
| `tipografia.<nivel>.peso` | = `typography.<nivel>.fontWeight` | 0 |
| `tipografia.<nivel>.interlineado` | = `typography.<nivel>.lineHeight` | ±0.05 |
| `superficies.primer_escalon_dL` | = ΔL del nivel 1 en «Elevation & Depth» (oscuro) | ±0.03 |
| `superficies.cajas_separadas_solo_por_borde` | se permite: el borde de 2 px es el separador del sistema | +20 |
| `acento.area_fondo_pct` | ≤ 20 %: los bloques del color del tema son la marca | +3 pp |
| `acento.familias_de_tono` | 1 | 0 |
| `radios.vocabulario` | ⊂ `rounded` (±1 px) | 0 |
| `hero.focos` | ≤ 12 (letrero de cuatro líneas, titular, cuenta atrás, CTA) | 0 |
| `hero.usos_acento` | ≤ 16 (decisión de marca: el acento es el color del letrero) | 0 |
| `espacio_blanco_viewport1_pct` | 45–65 % densa | ±5 pp |
| `ritmo_secciones.aire_lado_px_hist` | valores de `spacing.section-*` | ±8 px |
| `contraste.fallos` | 0 | 0 |
| `desborde_horizontal.px` (390) | 0 | 0 |
