import { definirEvento } from "@/config/definir";

/**
 * La edición.
 *
 * Todo lo que distingue a tu evento de otro está en esta carpeta (`evento/`) y
 * en `public/evento/`. El resto del repo es el kit y no hace falta tocarlo.
 * Los campos están explicados en `src/config/tipos.ts` y en `docs/configuracion.md`.
 */
export default definirEvento({
  nombre: "AWS Student Community Day",
  siglas: "SCD",
  edicion: "Demo",
  anio: 2027,
  pais: "CO",
  ciudad: "Tu Ciudad",
  marca: {
    logo: "/images/logos/aws-logo.svg",
    logoPng: "/images/logos/aws-logo.png",
    alt: "AWS",
    lineas: ["Student", "Community Day"],
  },
  organiza: "AWS Student Builder Groups",
  sitio: "http://localhost:3000",

  fecha: {
    inicio: "2027-10-23T08:30",
    fin: "2027-10-23T18:00",
    confirmada: true,
  },

  sede: {
    nombre: "Universidad Demo — Campus Central",
    direccion: "Av. Siempre Viva 742",
    localidad: "Tu Ciudad",
    coordenadas: { lat: 4.6486, lon: -74.2479 },
    mapa: "https://www.openstreetmap.org/#map=12/4.6486/-74.2479",
    silueta: "auto",
  },

  cupos: 300,
  modalidad: { presencial: true, online: true },

  tema: "naranja",
  idiomas: ["es", "en"],
  rastreoIA: true,

  redes: {
    instagram: "",
    linkedin: "",
  },

  cfp: {
    cierre: "2027-09-22T23:59",
    slides: "2027-10-13T23:59",
    online: false,
    hitos: {
      revision: { label: "23 – 27 sep 2027", en: "Sep 23 – 27, 2027", pt: "23 – 27 set 2027" },
      seleccion: { label: "28 – 29 sep 2027", en: "Sep 28 – 29, 2027", pt: "28 – 29 set 2027" },
    },
  },

  detalles: {
    comoLlegar: {
      label: "Llegas en transporte público hasta la estación más cercana y de ahí caminando, o en vehículo particular.",
      en: "Take public transport to the nearest station and walk from there, or come by car.",
      pt: "Chegue de transporte público até a estação mais próxima e siga a pé, ou venha de carro.",
    },
    speakers: 20,
    consejosViaje: [
      "El aeropuerto internacional más cercano tiene vuelos directos desde toda la región.",
      "En la sede hay wifi; una eSIM local te saca de apuros para moverte.",
      "El almuerzo y el café del día corren por cuenta del evento.",
    ],
    legalActualizado: "2027-01-15",
  },

  hechoPor: { nombre: "Sebastián Acuña", url: "https://github.com/heysebitas" },
});
