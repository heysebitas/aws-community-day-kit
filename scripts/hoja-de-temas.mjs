/**
 * Junta las capturas de cada tema en una sola hoja, para la documentación.
 *
 *   node scripts/hoja-de-temas.mjs <carpeta con tema-<nombre>.png> <salida.png>
 *
 * Las capturas se sacan con el sitio en modo demo, abriendo `/?tema=<nombre>`.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [carpeta, salida] = process.argv.slice(2);
if (!carpeta || !salida) {
  console.error("Uso: node scripts/hoja-de-temas.mjs <carpeta> <salida.png>");
  process.exit(1);
}

const ORDEN = ["naranja", "lavanda", "platano", "menta", "cielo", "coral", "rosa", "lima"];
const temas = ORDEN.filter((t) => fs.existsSync(path.join(carpeta, `tema-${t}.png`)));

const ANCHO = 720;
const ALTO = 450;
const ROTULO = 44;
const MARGEN = 16;
const COLUMNAS = 2;
const filas = Math.ceil(temas.length / COLUMNAS);

const rotulo = (texto) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ROTULO}">
       <rect width="100%" height="100%" fill="#000"/>
       <text x="14" y="29" font-family="Consolas, Menlo, monospace" font-size="20" font-weight="700" fill="#fff">tema: "${texto}"</text>
     </svg>`,
  );

const piezas = [];
for (const [i, tema] of temas.entries()) {
  const x = MARGEN + (i % COLUMNAS) * (ANCHO + MARGEN);
  const y = MARGEN + Math.floor(i / COLUMNAS) * (ALTO + ROTULO + MARGEN);
  piezas.push({ input: rotulo(tema), left: x, top: y });
  piezas.push({
    input: await sharp(path.join(carpeta, `tema-${tema}.png`)).resize(ANCHO, ALTO, { fit: "cover", position: "top" }).toBuffer(),
    left: x,
    top: y + ROTULO,
  });
}

await sharp({
  create: {
    width: MARGEN + COLUMNAS * (ANCHO + MARGEN),
    height: MARGEN + filas * (ALTO + ROTULO + MARGEN),
    channels: 3,
    background: "#16161F",
  },
})
  .composite(piezas)
  .png({ compressionLevel: 9 })
  .toFile(salida);

console.log(`${temas.length} temas → ${salida}`);
