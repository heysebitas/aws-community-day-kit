"use client";

// Lo único del panel que importa Recharts. No se importa directamente: se
// carga con `next/dynamic` desde `./graficas` para que no pese en el JS inicial.
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
} from "recharts";
import { PAIS } from "@/config";

export interface Tramo {
  name: string;
  value: number;
  color: string;
}

interface Margen {
  top: number;
  right: number;
  left: number;
  bottom: number;
}

const REJILLA = "#27272a";
const EJE = { fill: "#71717a", fontSize: 10 };
const EJE_CATEGORIA = { fill: "#a1a1aa", fontSize: 10 };
const CURSOR = { fill: "#ffffff08" };

function ChartTooltip({ active, payload, label, simple }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  simple?: boolean;
}) {
  if (!active || !payload?.length) return null;
  if (simple) {
    return (
      <div className="border-2 border-surface-600 bg-surface-800 px-3 py-2 shadow-xl">
        {label && <p className="mb-0.5 font-mono text-xs text-surface-300">{label}</p>}
        <p className="font-mono text-xs text-surface-100">{payload[0]!.value.toLocaleString(PAIS.locale)}</p>
      </div>
    );
  }
  return (
    <div className="border-2 border-surface-600 bg-surface-800 px-3 py-2 shadow-xl">
      {label && <p className="mb-1 font-mono text-xs text-surface-400">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString(PAIS.locale)}
        </p>
      ))}
    </div>
  );
}

export interface BarrasProps {
  data: object[];
  alto: number;
  categoria: string;
  valor: string;
  nombre?: string;
  /** Barras tumbadas, con las categorías en el eje vertical. */
  horizontal?: boolean;
  /** Sin color, cada fila trae el suyo en `color`. */
  color?: string;
  anchoEje?: number;
  formatoEje?: (v: string) => string;
  /** Todas las etiquetas del eje, en letra más pequeña. */
  etiquetasApretadas?: boolean;
  margen: Margen;
  tooltipSimple?: boolean;
}

export function Barras({
  data, alto, categoria, valor, nombre, horizontal, color, anchoEje,
  formatoEje, etiquetasApretadas, margen, tooltipSimple,
}: BarrasProps) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={margen}>
        <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} horizontal={!horizontal} vertical={!!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey={categoria} tick={EJE_CATEGORIA} tickLine={false} axisLine={false} width={anchoEje} tickFormatter={formatoEje} />
          </>
        ) : (
          <>
            <XAxis
              dataKey={categoria}
              tick={etiquetasApretadas ? { ...EJE, fontSize: 9 } : EJE}
              tickLine={false}
              axisLine={false}
              interval={etiquetasApretadas ? 0 : undefined}
            />
            <YAxis tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
          </>
        )}
        <Tooltip content={<ChartTooltip simple={tooltipSimple} />} cursor={CURSOR} />
        <Bar dataKey={valor} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} name={nombre} fill={color}>
          {!color && data.map((d, i) => <Cell key={i} fill={(d as { color?: string }).color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dona({ data, alto }: { data: Tramo[]; alto: number }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={54} outerRadius={74} paddingAngle={2} dataKey="value">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Linea({ data, alto, x, y, color }: { data: object[]; alto: number; x: string; y: string; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} />
        <XAxis dataKey={x} tick={EJE} tickLine={false} axisLine={false} />
        <YAxis tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey={y} stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Areas({ data, alto, x, series }: {
  data: object[];
  alto: number;
  x: string;
  series: { clave: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} />
        <XAxis dataKey={x} tick={EJE} tickLine={false} axisLine={false} />
        <YAxis tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        {series.map((s, i) => (
          <Area key={s.clave} type="monotone" dataKey={s.clave} stackId={String(i + 1)} stroke={s.color} fill={s.color} fillOpacity={0.6} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
