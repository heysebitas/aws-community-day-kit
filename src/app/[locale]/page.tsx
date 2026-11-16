import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/hero";
import { Strip } from "@/components/sections/strips";
import { About } from "@/components/sections/about";
import { WhyAttend } from "@/components/sections/why-attend";
import { Tracks } from "@/components/sections/tracks";
import { Keynotes } from "@/components/sections/keynotes";
import { Agenda } from "@/components/sections/agenda-section";
import { Venue } from "@/components/sections/venue";
import { Sponsors } from "@/components/sections/sponsors";
import { Comunidades } from "@/components/sections/comunidades";
import { Organizers } from "@/components/sections/organizers";
import { FAQ } from "@/components/sections/faq-section";
import { RegistrationCTA } from "@/components/sections/registration-cta";
import { EVENTO } from "@/config";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { modalidad } = EVENTO;

  // La portada alterna dos tonos a sangre: negro y el bloque del tema. Las
  // cintas marcan el corte entre uno y otro.
  return (
    <main>
      <Hero />

      <About />
      {modalidad.presencial && modalidad.online && <Strip k="hybrid" tone="ink" duration={34} reverse />}

      <Keynotes />

      <WhyAttend />
      <Tracks />

      <Strip k="event" tone="ink" duration={36} reverse />

      <Agenda />
      <Venue />
      <Sponsors />
      <Organizers />
      <Comunidades />
      <FAQ />

      <Strip k="date" tone="block" duration={30} />
      <RegistrationCTA />
    </main>
  );
}
