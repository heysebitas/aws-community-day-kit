"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type {
  Barras as BarrasRecharts, Dona as DonaRecharts,
  Linea as LineaRecharts, Areas as AreasRecharts,
} from "./graficas-recharts";

export type { Tramo } from "./graficas-recharts";

// Recharts pesa unos 110 KB gz: sólo se descarga cuando se pinta una gráfica,
// así que el staff, que no ve ninguna, no lo paga. Cada gráfica va en una caja
// de alto fijo para que el hueco no salte al llegar el JS.
function Hueco() {
  return <div className="h-full w-full animate-pulse bg-surface-700/40" aria-hidden />;
}

const BarrasDiferidas = dynamic(() => import("./graficas-recharts").then((m) => m.Barras), { ssr: false, loading: Hueco });
const DonaDiferida = dynamic(() => import("./graficas-recharts").then((m) => m.Dona), { ssr: false, loading: Hueco });
const LineaDiferida = dynamic(() => import("./graficas-recharts").then((m) => m.Linea), { ssr: false, loading: Hueco });
const AreasDiferidas = dynamic(() => import("./graficas-recharts").then((m) => m.Areas), { ssr: false, loading: Hueco });

export function Barras(props: ComponentProps<typeof BarrasRecharts>) {
  return <div className="min-w-0" style={{ height: props.alto }}><BarrasDiferidas {...props} /></div>;
}

export function Dona(props: ComponentProps<typeof DonaRecharts>) {
  return <div className="min-w-0" style={{ height: props.alto }}><DonaDiferida {...props} /></div>;
}

export function Linea(props: ComponentProps<typeof LineaRecharts>) {
  return <div className="min-w-0" style={{ height: props.alto }}><LineaDiferida {...props} /></div>;
}

export function Areas(props: ComponentProps<typeof AreasRecharts>) {
  return <div className="min-w-0" style={{ height: props.alto }}><AreasDiferidas {...props} /></div>;
}
