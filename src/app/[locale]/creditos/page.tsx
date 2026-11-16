import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CreditosScreen } from "./_screen";

type Props = { params: Promise<{ locale: string }> };

/** Los créditos del kit. No se enlaza desde el menú ni se indexa. */
export const metadata: Metadata = {
  title: "Créditos",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function CreditosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CreditosScreen />;
}
