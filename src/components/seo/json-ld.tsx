import { getTranslations } from "next-intl/server";
import { EVENTO, IDIOMAS, PAIS, SITIO } from "@/config";
import { getActiveFaqs } from "@/lib/data/faq";
import { getPublicSpeakers } from "@/lib/data/speakers";
import { localePath } from "@/lib/utils";
import { keynotes } from "@evento/keynotes";

/**
 * Datos estructurados (schema.org) de la portada: el evento, sus preguntas
 * frecuentes y el sitio. Es lo que leen los buscadores y los asistentes de IA
 * para responder «cuándo es» o «dónde es» sin interpretar el diseño.
 */

const MODO = {
  mixto: "https://schema.org/MixedEventAttendanceMode",
  presencial: "https://schema.org/OfflineEventAttendanceMode",
  online: "https://schema.org/OnlineEventAttendanceMode",
};

function Script({ data }: { data: unknown }) {
  // `<` escapado: un texto con «</script>» venido de la base cerraría la etiqueta.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export async function EventJsonLd({ locale }: { locale: string }) {
  const [meta, faqT, faqs, speakers] = await Promise.all([
    getTranslations({ locale, namespace: "Metadata" }),
    getTranslations({ locale, namespace: "FAQ" }),
    getActiveFaqs().catch(() => []),
    getPublicSpeakers().catch(() => []),
  ]);

  const en = locale === "en";
  const { presencial, online } = EVENTO.modalidad;
  const organizacion = { "@type": "Organization", "@id": `${SITIO}/#organization`, name: EVENTO.organiza, url: SITIO };

  const lugares = [
    presencial && {
      "@type": "Place",
      name: EVENTO.sede.nombre,
      address: {
        "@type": "PostalAddress",
        streetAddress: EVENTO.sede.direccion,
        addressLocality: EVENTO.sede.localidad,
        addressCountry: PAIS.codigo,
      },
      geo: { "@type": "GeoCoordinates", latitude: EVENTO.coordenadas.lat, longitude: EVENTO.coordenadas.lon },
    },
    online && { "@type": "VirtualLocation", url: SITIO },
  ].filter(Boolean);

  const personas = [
    ...keynotes.map((k) => ({
      "@type": "Person",
      name: `${k.nombre} ${k.apellido}`,
      ...(k.cargo && { jobTitle: k.cargo }),
      ...(k.empresa && { worksFor: { "@type": "Organization", name: k.empresa } }),
    })),
    ...speakers.map((s) => ({
      "@type": "Person",
      name: s.name,
      ...(s.role && { jobTitle: s.role }),
      url: `${SITIO}${localePath(locale, `/speakers/${s.slug}`)}`,
    })),
  ];

  const evento = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    "@id": `${SITIO}/#event`,
    name: EVENTO.nombreCompleto,
    description: meta("description"),
    startDate: EVENTO.inicio,
    endDate: EVENTO.fin,
    eventAttendanceMode: presencial && online ? MODO.mixto : online ? MODO.online : MODO.presencial,
    eventStatus: "https://schema.org/EventScheduled",
    location: lugares,
    image: [`${SITIO}${localePath(locale)}opengraph-image`.replace(/([^:])\/\//, "$1/")],
    organizer: organizacion,
    ...(personas.length && { performer: personas }),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITIO}${localePath(locale, "/registro")}`,
    },
    isAccessibleForFree: true,
    inLanguage: IDIOMAS,
    maximumAttendeeCapacity: EVENTO.cupos,
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
  };

  const preguntas = faqs.length
    ? faqs.map((f) => ({ q: en ? f.questionEn : f.questionEs, a: en ? f.answerEn : f.answerEs }))
    : Array.from({ length: 10 }, (_, i) => ({ q: faqT(`q${i + 1}`), a: faqT(`a${i + 1}`) }));

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const sitio = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITIO}/#website`,
    url: SITIO,
    name: EVENTO.nombreCompleto,
    description: meta("description"),
    inLanguage: IDIOMAS,
    publisher: organizacion,
  };

  return (
    <>
      <Script data={evento} />
      <Script data={faq} />
      <Script data={sitio} />
    </>
  );
}
