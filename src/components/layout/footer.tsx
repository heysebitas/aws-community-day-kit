import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";
import { EVENTO } from "@/config";
import { EXTERNAL_LINKS } from "@/lib/constants";
import { localePath } from "@/lib/utils";
import { IconoRed, type Red } from "@/components/ui/social-icons";
import { grupos } from "@evento/grupos";
import { Marca } from "./marca";

const enlace = "text-sm text-tinta/70 transition-colors hover:text-tinta";
const titulo = "font-mono text-sm font-semibold uppercase tracking-wider text-tinta";

const DEL_EVENTO = [
  { key: "about", href: "#about" },
  { key: "agenda", href: "#agenda" },
  { key: "speakers", href: "/directorio" },
  { key: "venue", href: "#venue" },
  { key: "faq", href: "#faq" },
] as const;

const RECURSOS = [
  { key: "aws_free_tier", href: EXTERNAL_LINKS.awsFreeTier },
  { key: "aws_skill_builder", href: EXTERNAL_LINKS.awsSkillBuilder },
  { key: "aws_certification", href: EXTERNAL_LINKS.awsCertification },
  { key: "aws_docs", href: EXTERNAL_LINKS.awsDocs },
] as const;

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  const inicio = localePath(locale);
  const redes = Object.entries(EVENTO.redes).filter(([, url]) => !!url) as [Red, string][];

  return (
    <footer className="bg-acento text-tinta">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-12 lg:flex-row">
          <div className="shrink-0 lg:w-64">
            <a href={`${inicio}#home`} className="inline-flex">
              <Marca tono="tinta" />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-tinta/70">{t("brand_tagline_desc")}</p>
            <div className="mt-5 flex gap-4">
              {redes.map(([red, url]) => (
                <a
                  key={red}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tinta/60 transition-colors hover:text-tinta"
                  aria-label={red}
                >
                  <IconoRed red={red} className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-tinta/20 lg:block" />

          <div className="grid flex-1 grid-cols-2 gap-10 sm:grid-cols-4">
            <div>
              <h3 className={titulo}>{t("the_event")}</h3>
              <ul className="mt-4 space-y-2.5">
                {DEL_EVENTO.map(({ key, href }) => (
                  <li key={key}>
                    <a
                      href={href.startsWith("/") ? localePath(locale, href) : `${inicio}${href}`}
                      className={enlace}
                    >
                      {t(key)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className={titulo}>{t("community")}</h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href={EXTERNAL_LINKS.awsCloudClubs} target="_blank" rel="noopener noreferrer" className={enlace}>
                    {t("aws_cloud_clubs")}
                  </a>
                </li>
                <li>
                  <a href={localePath(locale, "/codigo-conducta")} className={enlace}>
                    {t("code_of_conduct")}
                  </a>
                </li>
                <li>
                  <a href={localePath(locale, "/privacidad")} className={enlace}>
                    {t("privacy_policy")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className={titulo}>{t("resources")}</h3>
              <ul className="mt-4 space-y-2.5">
                {RECURSOS.map(({ key, href }) => (
                  <li key={key}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className={enlace}>
                      {t(key)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {grupos.length > 0 && (
              <div>
                <h3 className={titulo}>{t("cloud_clubs")}</h3>
                <ul className="mt-4 space-y-2.5">
                  {grupos.map((g) => (
                    <li key={g.nombre}>
                      {g.url ? (
                        <a href={g.url} target="_blank" rel="noopener noreferrer" className={enlace}>
                          {g.nombre}
                        </a>
                      ) : (
                        <span className="text-sm text-tinta/70">{g.nombre}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-tinta/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          {EVENTO.hechoPor && (
            <p className="text-sm text-tinta/70">
              {t("made_with")} <Heart className="inline h-4 w-4 fill-tinta text-tinta" /> {t("made_by")}{" "}
              {EVENTO.hechoPor.url ? (
                <a
                  href={EVENTO.hechoPor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-tinta transition-colors hover:underline"
                >
                  {EVENTO.hechoPor.nombre}
                </a>
              ) : (
                <span className="font-semibold text-tinta">{EVENTO.hechoPor.nombre}</span>
              )}
            </p>
          )}
          <p className="text-xs text-tinta/60">{t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
