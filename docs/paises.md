# Países

Con `pais: "CL"` en `evento/config.ts` el kit ajusta el resto: documentos del
formulario y su validación, prefijo y formato del teléfono, zona horaria,
formato de fechas, niveles de estudio, tipos de institución, la ley de datos
que citan los textos legales y adónde apunta el globo.

| | | | |
|---|---|---|---|
| `AR` Argentina | `BO` Bolivia | `BR` Brasil | `CL` Chile |
| `CO` Colombia | `CR` Costa Rica | `CU` Cuba | `DO` Rep. Dominicana |
| `EC` Ecuador | `SV` El Salvador | `GT` Guatemala | `HN` Honduras |
| `MX` México | `NI` Nicaragua | `PA` Panamá | `PY` Paraguay |
| `PE` Perú | `PR` Puerto Rico | `UY` Uruguay | `VE` Venezuela |

Todos aceptan además pasaporte y documento extranjero: a un evento abierto
siempre llega gente de fuera.

## Qué tan estricta es la validación

El RUN chileno, el CPF brasileño y la CURP mexicana se validan con su dígito
verificador. El resto sólo comprueba longitud y forma. Es a propósito: rechazar
un documento válido en la puerta es peor que aceptar uno con una errata.

## Corregir o añadir un país

Cada país es una entrada en `PAISES` (`src/config/paises.ts`). Si en el tuyo
falta un documento, un nivel de estudio se llama distinto o cambió la ley de
datos, es un cambio de pocas líneas y un PR muy bienvenido: quien vive ahí lo
sabe mejor que nosotros.

Para un país nuevo, copia la entrada del más parecido, añade su código a
`CodigoPais` en `src/config/tipos.ts` y corre `npm test`.

## Lo que falta

- **Portugués.** Brasil tiene sus datos y la validación de CPF, pero el sitio
  todavía no está traducido: hoy los idiomas son `es` y `en`. Está en el
  [ROADMAP](../ROADMAP.md).
- **Varias zonas horarias.** Cada país usa la de su capital. Si tu ciudad tiene
  otra (Tijuana, Manaos), cambia `zona` en su entrada de `PAISES`.
