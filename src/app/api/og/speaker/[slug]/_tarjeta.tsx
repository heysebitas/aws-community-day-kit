/** La maqueta de la tarjeta del speaker. */

export const W = 1080;
export const H = 1080;

export const PURPLE = TEMA.acento;
export const PURPLE_DEEP = TEMA.fuerte;
export const BG = "#0A0613";

/** Los tracks, con el color con el que se pintan en el sitio. */
/** Los colores de los tracks salen de `@/data/session-tracks`, el mismo catálogo que usan el panel y el sitio. */
import { esTrack, trackCorto, trackHex } from "@/data/session-tracks";
import { EVENTO, TEMA } from "@/config";

/**
 * JetBrains Mono es monoespaciada y su avance es exactamente 0,6 em (medido con
 * fontkit sobre el .ttf que se incrusta). O sea que el ancho de un texto es
 * `caracteres × tamaño × 0,6`, sin tener que estimar nada.
 */
const AVANCE = 0.6;

/** Parte el texto en líneas que quepan, sin romper palabras. */
function envolver(texto: string, tamano: number, anchoMax: number): string[] {
  const porLinea = Math.max(1, Math.floor(anchoMax / (tamano * AVANCE)));
  const lineas: string[] = [];
  let actual = "";

  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    if (!actual) {
      actual = palabra;
    } else if (actual.length + 1 + palabra.length <= porLinea) {
      actual += ` ${palabra}`;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
    // Una palabra sola más larga que la línea: se parte, no hay otra.
    while (actual.length > porLinea) {
      lineas.push(actual.slice(0, porLinea));
      actual = actual.slice(porLinea);
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Baja el tamaño hasta que el texto entre en `maxLineas`. Devuelve el tamaño
 * elegido y las líneas ya partidas.
 */
function ajustar(
  texto: string,
  { max, min, anchoMax, maxLineas }: { max: number; min: number; anchoMax: number; maxLineas: number },
): { tamano: number; lineas: string[] } {
  for (let t = Math.round(max); t >= min; t -= 1) {
    const lineas = envolver(texto, t, anchoMax);
    if (lineas.length <= maxLineas) return { tamano: t, lineas };
  }
  // Ni al mínimo entra: se recorta la última línea con puntos suspensivos.
  const lineas = envolver(texto, min, anchoMax).slice(0, maxLineas);
  const porLinea = Math.max(1, Math.floor(anchoMax / (min * AVANCE)));
  if (lineas.length === maxLineas) {
    lineas[maxLineas - 1] = `${lineas[maxLineas - 1].slice(0, Math.max(1, porLinea - 1))}…`;
  }
  return { tamano: min, lineas };
}

/** Varias líneas, cada una su `<span>`: satori no reparte un salto dentro de uno. */
function Lineas({ lineas, style }: { lineas: string[]; style: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lineas.map((l, i) => <span key={i} style={style}>{l}</span>)}
    </div>
  );
}

/** El tamaño del título cuando nadie lo ha fijado a mano. */
export function tamanoAutoTitulo(title: string): number {
  if (title.length <= 60) return 49;
  if (title.length <= 80) return 41;
  if (title.length <= 105) return 34;
  return 27;
}

/** Un speaker en la tarjeta. Con dos o más, la foto grande se cambia por fichas. */
export interface SpeakerEntry {
  name: string; photo: string;
  role: string; tagline: string; company: string; companyLogo: string;
}

export interface TarjetaProps {
  /** Quien presenta, y sus acompañantes. */
  speakers: SpeakerEntry[];
  /** El título de la charla, ya recortado para la tarjeta si lo editaron. */
  title: string;
  /** La línea bajo el nombre: cargo, empresa o lo que escribieran a mano. */
  speakerLine: string;
  track: string;
  /** Los datos del evento, resueltos por quien llama. */
  fecha: string; sede: string; ciudad: string; dominio: string;
  /** Recursos ya en base64: logos y el QR del perfil. */
  awsLogo: string; eventLogo: string; qrDataUrl: string;
  /** Los ajustes del editor de tarjetas. Sólo valen con un speaker. */
  contentX: number; contentY: number; nameOffset: number;
  titleSize: number; nameSize: number;
  /**
   * El encuadre de la foto grande, en porcentaje: qué parte se ve dentro de la
   * franja de la izquierda, que es muy alta y estrecha (490×1080) y por tanto
   * recorta mucho. 50/50 es el centro, que es lo que se hacía siempre y dejaba
   * a gente cortada o diminuta.
   */
  fotoX?: number; fotoY?: number; fotoZoom?: number;
  /** Con qué fuente se dibuja. */
  fontFamily?: string;
}

// ── Ficha de foto, para las tarjetas de dos o más ────────────────────────────

function PhotoTile({ photo, name, w, h, radius = 16 }: { photo: string; name: string; w: number; h: number; radius?: number }) {
  const initials = name.split(" ").slice(0, 2).map((s) => s[0] ?? "").join("").toUpperCase();
  return (
    <div style={{ width: w, height: h, borderRadius: radius, overflow: "hidden", display: "flex", border: `4px solid ${PURPLE}70` }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" style={{ width: w, height: h, objectFit: "cover" }} />
      ) : (
        <div style={{ width: w, height: h, background: "#160F26", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: Math.floor(w * 0.28), fontWeight: 700, color: PURPLE }}>{initials}</span>
        </div>
      )}
    </div>
  );
}

export function TarjetaSpeaker({
  speakers, title, speakerLine, track,
  fecha, sede, ciudad, dominio,
  awsLogo, eventLogo, qrDataUrl,
  contentX, contentY, nameOffset, titleSize, nameSize,
  fotoX = 50, fotoY = 50, fotoZoom = 1,
  fontFamily = "JetBrainsMono",
}: TarjetaProps) {
  // Se acotan acá y no en quien llama: estos valores vienen de la URL del
  // editor, así que podrían ser cualquier cosa.
  const encuadreX = Math.min(100, Math.max(0, fotoX));
  const encuadreY = Math.min(100, Math.max(0, fotoY));
  const zoom = Math.min(3, Math.max(1, fotoZoom));
  const totalSpeakers = speakers.length;
  const isMulti = totalSpeakers > 1;
  const mainPhoto = speakers[0]?.photo ?? "";
  const companyLogo = speakers[0]?.companyLogo ?? "";
  const name = speakers[0]?.name ?? "";
  const trackColor = trackHex(track, PURPLE);
  // El nombre corto: «Cloud, Automation & AI» no cabe en el distintivo.
  const trackLabel = trackCorto(track).toUpperCase();

  /**
   * «General» no es un track, es el valor por defecto de quien aún no tiene
   * categoría: anunciarlo en la tarjeta no dice nada. Se esconde, pero
   * conservando su sitio, para que al asignar la categoría de verdad el
   * título no dé un salto y haya que recolocarlo todo a mano.
   */
  const trackVisible = esTrack(track);

  // El ancho útil de la columna de texto. Con un speaker la foto se come la
  // mitad izquierda; con dos o más, el ancho es la tarjeta entera.
  const anchoCol = isMulti ? W - 67 - 60 : W - contentX - 60;

  /**
   * El tope del título. Si quien llama no fija uno —el editor manda 0 para
   * decir «automático»— se calcula por el largo del texto.
   */
  const topeTitulo = titleSize > 0 ? titleSize : tamanoAutoTitulo(title);
  const tit = ajustar(title, {
    max: isMulti ? 42 : topeTitulo, min: 24, anchoMax: anchoCol, maxLineas: isMulti ? 2 : 4,
  });
  const nom = ajustar(name, { max: nameSize, min: 22, anchoMax: anchoCol, maxLineas: 2 });
  const car = ajustar(speakerLine, { max: 20, min: 14, anchoMax: anchoCol, maxLineas: 2 });

  /** La franja del título: lo que hay entre la cabecera y la raya del nombre. */
  const altoTitulo = tit.lineas.length * tit.tamano * 1.18;
  // El distintivo del track: 15 px de texto, 5 de relleno arriba y abajo, 2 de
  // borde, y los 12 de hueco hasta el título.
  const altoBadge = track ? 15 * 1.2 + 10 + 4 + 12 : 0;
  const altoBloque = altoBadge + altoTitulo;

  // La raya sólo baja si el título no cabe en la franja; si no, se queda donde
  // la dejó el editor.
  /** Las fichas de las tarjetas de dos o más. */
  /** Las fichas llenan la misma columna que el título. */
  const COLUMNA = W - 67 - 60;
  const huecoFicha = totalSpeakers === 2 ? 56 : totalSpeakers === 3 ? 26 : 20;
  const anchoFicha = Math.floor((COLUMNA - (totalSpeakers - 1) * huecoFicha) / totalSpeakers);
  // El alto de la foto con dos personas sale de la cuenta de arriba: a 442 el
  // conjunto medía 659 de una franja de 686 y no quedaba aire para centrarlo,
  // por mucho que se centrara. A 390 el bloque mide ~607 y queda holgura
  // arriba y abajo.
  const altoFicha = totalSpeakers === 2 ? 390 : totalSpeakers === 3 ? 320 : 266;
  const radioFicha = totalSpeakers === 2 ? 20 : totalSpeakers === 3 ? 16 : 14;
  const huecoNombre = totalSpeakers === 2 ? 10 : totalSpeakers === 3 ? 8 : 6;
  /** Hueco entre el título y la fila de fotos. */
  const HUECO_FOTOS = 34;
  const topeNombre = totalSpeakers === 2 ? 26 : totalSpeakers === 3 ? 22 : 17;

  // Primero se intenta que TODOS quepan en una línea, aunque haya que bajar un
  // par de puntos: una fila de nombres a una línea se lee mejor que uno corto
  // arriba y otro partido en dos. Si para lograrlo hubiera que bajar de 16 px
  // no compensa, y entonces se usan dos líneas.
  const cabeEnUna = Math.min(
    ...speakers.map((s) => Math.floor(anchoFicha / (Math.max(1, s.name.length) * AVANCE))),
  );
  const unaLinea = cabeEnUna >= 16;
  const tamNombre = unaLinea
    ? Math.min(topeNombre, cabeEnUna)
    : Math.min(...speakers.map((s) => ajustar(s.name, { max: topeNombre, min: 14, anchoMax: anchoFicha, maxLineas: 2 }).tamano));

  const nombres = speakers.map((s) => envolver(s.name, tamNombre, anchoFicha).slice(0, unaLinea ? 1 : 2));
  // El hueco reserva las líneas que use el peor caso, así todos los nombres
  // arrancan a la misma altura.
  const altoNombres = Math.ceil((unaLinea ? 1 : 2) * tamNombre * 1.25);

  /**
   * El bloque de las tarjetas de dos o más, centrado entre la cabecera y el
   * logo del evento.
   */
  const logoTop = totalSpeakers === 2 ? H - 17 - 195 : H - 40 - 240;
  const altoMulti = altoBloque + HUECO_FOTOS + altoFicha + huecoNombre + altoNombres;
  const multiTop = 182 + Math.max(0, Math.round((logoTop - 182 - altoMulti) / 2));

  const topeAbajo = Math.max(nameOffset, contentY + altoBloque + 40);
  const holgura = topeAbajo - contentY - altoBloque;
  const tituloTop = contentY + Math.max(0, Math.round(holgura / 2));

  return (
    <div style={{ width: W, height: H, position: "relative", display: "flex", background: BG, fontFamily }}>

      {/* Resplandor del color del tema detrás de la columna de texto: sin él la mitad derecha queda plana sobre el negro. */}
      <div style={{
        position: "absolute", top: -220, right: -280, width: 940, height: 940,
        background: `radial-gradient(circle, ${PURPLE}20 0%, ${BG}00 70%)`, display: "flex",
      }} />

      {/* Filo lateral, con degradado */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: 8, height: H, display: "flex",
        background: `linear-gradient(to bottom, ${PURPLE}, ${PURPLE_DEEP})`,
      }} />

      {/* ── SINGLE: full-height photo on left ── */}
      {!isMulti && mainPhoto && (
        <div style={{ display: "flex" }}>
          <div style={{ position: "absolute", top: 0, left: 8, width: 490, height: H, display: "flex", overflow: "hidden" }}>
            {/* El zoom agranda la imagen desde el centro y el encuadre elige
                qué parte del original se ve. Dos mandos independientes: uno
                acerca, el otro mueve. eslint-disable-next-line @next/next/no-img-element */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainPhoto}
              alt=""
              style={{
                width: 490 * zoom, height: H * zoom,
                marginLeft: -(490 * (zoom - 1)) / 2,
                marginTop: -(H * (zoom - 1)) / 2,
                objectFit: "cover",
                objectPosition: `${encuadreX}% ${encuadreY}%`,
              }}
            />
          </div>
          <div style={{ position: "absolute", top: 0, left: 375, width: 125, height: H, background: `linear-gradient(to right, transparent, ${BG})`, display: "flex" }} />
        </div>
      )}

      {/* ── HEADER: AWS logo + SBG chip ── */}
      <div style={{
        position: "absolute", top: 30,
        left: isMulti ? 67 : contentX, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={awsLogo} alt="" style={{ height: 48, width: 78, objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[...EVENTO.marca.lineas, `${EVENTO.edicion} ${EVENTO.anio}`].map((l) => (
              <span key={l} style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRACK BADGE + TITLE ── */}
      <div style={{
        position: "absolute",
        top: isMulti ? multiTop : tituloTop,
        left: isMulti ? 67 : contentX,
        right: 60,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {track && (
          <div style={{ display: "flex", opacity: trackVisible ? 1 : 0 }}>
            <span style={{
              background: trackColor + "20", border: `2px solid ${trackColor}60`,
              borderRadius: 999, padding: "5px 18px",
              fontSize: 15, color: trackColor, fontWeight: 700, letterSpacing: "0.06em",
            }}>
              {trackLabel}
            </span>
          </div>
        )}
        <Lineas
          lineas={tit.lineas}
          style={{ fontSize: tit.tamano, fontWeight: 700, color: "#fff", lineHeight: 1.18, letterSpacing: "-0.2px" }}
        />

        {/* Las fichas van dentro del mismo bloque: así se mide el conjunto y se centra
            de una pieza. El ancho, el alto y el redondeo salen del número de fichas. */}
        {isMulti && (
          <div style={{ display: "flex", gap: huecoFicha, marginTop: HUECO_FOTOS }}>
            {speakers.slice(0, 4).map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: huecoNombre }}>
                <PhotoTile photo={s.photo} name={s.name} w={anchoFicha} h={altoFicha} radius={radioFicha} />
                <div style={{ height: altoNombres, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Lineas
                    lineas={nombres[i]}
                    style={{ fontSize: tamNombre, fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.25 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── UN SPEAKER: nombre, cargo, datos y QR ──
          Todo en una sola columna que fluye hacia abajo. Antes eran dos bloques
          con posición absoluta fija —el nombre en `nameOffset`, los datos en
          645— y bastaba un nombre de dos líneas para que el segundo quedara
          escrito encima del primero. Con los datos reales eso pasaba en varias
          tarjetas a la vez. */}
      {!isMulti && (
        <div style={{
          position: "absolute", top: topeAbajo, left: contentX, right: 60,
          display: "flex", flexDirection: "column",
          borderTop: `3px solid ${PURPLE}50`, paddingTop: 20,
        }}>
          <Lineas lineas={nom.lineas} style={{ fontSize: nom.tamano, fontWeight: 700, color: "#fff", lineHeight: 1.12 }} />
          {speakerLine && (
            <div style={{ display: "flex", marginTop: 8 }}>
              <Lineas lineas={car.lineas} style={{ fontSize: car.tamano, color: PURPLE, fontWeight: 700, lineHeight: 1.25 }} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
            <span style={{ fontSize: 19, fontWeight: 700, color: PURPLE }}>{fecha}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{sede}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{ciudad}</span>
          </div>

          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" style={{ width: 160, height: 160, marginTop: 24 }} />
          )}
        </div>
      )}

      {/* ── INFO: 2-speaker — centered ── */}
      {isMulti && totalSpeakers === 2 && (
        <div style={{ position: "absolute", bottom: 110, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: PURPLE }}>{fecha}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{sede}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{ciudad}</span>
        </div>
      )}

      {/* ── INFO: 3-speaker ── */}
      {isMulti && totalSpeakers === 3 && (
        <div style={{ position: "absolute", bottom: 160, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: PURPLE }}>{fecha}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{sede}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{ciudad}</span>
        </div>
      )}

      {/* ── INFO: 4-speaker ── */}
      {isMulti && totalSpeakers >= 4 && (
        <div style={{ position: "absolute", bottom: 195, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: PURPLE }}>{fecha}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{sede}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{ciudad}</span>
        </div>
      )}

      {/* ── QR: 2-speaker ── */}
      {isMulti && totalSpeakers === 2 && qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="" style={{ position: "absolute", bottom: 40, left: 68, width: 148, height: 148 }} />
      )}

      {/* ── QR: 3 & 4-speaker ── */}
      {isMulti && totalSpeakers >= 3 && qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="" style={{ position: "absolute", bottom: 40, left: 44, width: 195, height: 195 }} />
      )}

      {/* ── DOMINIO ──
          Con un speaker va alineado a la columna de texto: centrado en toda la
          tarjeta caía encima de la foto, que ocupa la mitad izquierda. Con dos
          o más no hay foto grande, así que ahí sí va centrado.

          Vacío quiere decir «sin dominio» y no se dibuja nada. Va así —y no
          con una bandera aparte— porque es la misma regla que el resto de la
          tarjeta: lo que no tiene valor no ocupa sitio. Como está en posición
          absoluta, quitarlo no mueve nada de lo demás. */}
      {dominio && (
        <div style={{
          position: "absolute", bottom: 58,
          left: isMulti ? 0 : contentX, right: isMulti ? 0 : 60,
          display: "flex", justifyContent: isMulti ? "center" : "flex-start",
        }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: PURPLE, letterSpacing: "0.08em" }}>{dominio}</span>
        </div>
      )}

      {/* ── COMPANY LOGO — single speaker only ── */}
      {!isMulti && companyLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={companyLogo} alt="" style={{ position: "absolute", bottom: 16, left: 16, width: 180, height: 72, objectFit: "contain", opacity: 0.9 }} />
      )}

      {/* ── EVENT LOGO ── */}
      {eventLogo && !isMulti && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={eventLogo} alt="" style={{ position: "absolute", bottom: 40, right: 44, width: 195, height: 195, objectFit: "contain" }} />
      )}
      {eventLogo && isMulti && totalSpeakers === 2 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={eventLogo} alt="" style={{ position: "absolute", bottom: 17, right: 44, width: 195, height: 195, objectFit: "contain" }} />
      )}
      {eventLogo && isMulti && totalSpeakers >= 3 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={eventLogo} alt="" style={{ position: "absolute", bottom: 40, right: 44, width: 240, height: 240, objectFit: "contain" }} />
      )}

    </div>
  );
}
