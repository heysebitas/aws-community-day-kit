"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { PageHead } from "@/components/admin/ui";
import { StaffHub } from "@/components/admin/staff-hub";
import { useCountdown } from "@/hooks/use-countdown";
import {
  Users, Mic2, ClipboardList, QrCode, Heart, Mail, UserCheck,
  ShieldCheck, MapPin, Wifi, TrendingUp, Sparkles, Ticket,
} from "lucide-react";
import { Areas, Barras, Dona, Linea } from "@/components/admin/graficas";
import { EVENTO, PAIS } from "@/config";

interface Stats {
  totalRegistrations: number;
  registrationsConfirmed: number;
  totalSpeakers: number;
  totalVolunteers: number;
  totalCheckedIn: number;
  checkInRate: number;
  emailsSent: number;
  emailsFailed: number;
  emailsPending: number;
  registrationsByDay: { date: string; count: number }[];
  speakersByDay: { date: string; count: number }[];
  volunteersByDay: { date: string; count: number }[];
  checkInsByDay: { date: string; count: number }[];
  cloudClubBreakdown: { club: string; count: number }[];
  confirmed: {
    total: number;
    registrations: number;
    speakersPresencial: number;
    volunteersApproved: number;
    team: number;
  };
  speakerFunnel: {
    submitted: number;
    reviewing: number;
    accepted: number;
    waitlisted: number;
    rejected: number;
  };
  speakerModality: {
    presencialProfiles: number;
    presencialPeople: number;
    onlineProfiles: number;
    onlinePeople: number;
  };
  volunteerFunnel: { approved: number; pending: number; total: number };
  team: { admin: number; organizer: number; volunteer: number; total: number };
}

const COLORS = {
  orange: "var(--color-acento)",
  blue: "#60a5fa",
  purple: "#a78bfa",
  emerald: "#34d399",
  teal: "#2dd4bf",
  red: "#f87171",
  amber: "#fbbf24",
  sky: "#38bdf8",
  pink: "#f472b6",
  gray: "#52525b",
  grayLight: "#71717a",
};

function StatsCard({
  label, value, icon: Icon, accent, suffix, hint,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="group border-2 border-surface-600 bg-surface-800 p-4 transition-all hover:border-surface-600">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-surface-400">{label}</p>
          <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${accent || "text-surface-50"}`}>
            {value.toLocaleString(PAIS.locale)}{suffix}
          </p>
          {hint && <p className="mt-0.5 font-mono text-[9px] text-surface-300">{hint}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center transition-colors ${accent ? "bg-current/10" : "bg-surface-800"} group-hover:bg-surface-700`}>
          <Icon className={`h-4 w-4 ${accent || "text-surface-400"}`} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, accent }: { icon: React.ElementType; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className={`h-4 w-4 ${accent || "text-surface-400"}`} />
      <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">{children}</h2>
    </div>
  );
}

// La cuenta atrás es lo único que cambia cada segundo: vive aparte para que
// el tic no vuelva a pintar el resto del tablero.
const CuentaAtras = memo(function CuentaAtras() {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(EVENTO.inicio);
  return (
    <div className="mb-6 border-2 border-surface-600 bg-surface-800 p-4 sm:p-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-surface-400">
          {isExpired ? "El evento ya pasó" : "Faltan para el evento"}
        </p>
        <div className="flex gap-2">
          {[
            { value: days, label: "días" },
            { value: hours, label: "hrs" },
            { value: minutes, label: "min" },
            { value: seconds, label: "seg" },
          ].map((b) => (
            <div key={b.label} className="flex flex-col items-center">
              <div className="border-2 border-surface-600 bg-surface-800 px-2.5 py-1.5 min-w-[44px]">
                <span className="font-mono text-xl font-bold text-acento tabular-nums sm:text-2xl">
                  {String(b.value).padStart(2, "0")}
                </span>
              </div>
              <span className="mt-0.5 font-mono text-[10px] text-surface-300">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/** Las series de las gráficas, calculadas una vez por respuesta de `/api/stats`. */
function series(stats: Stats | null) {
  const porDia = (lista?: { date: string; count: number }[]) =>
    new Map((lista ?? []).map((d) => [d.date, d.count]));
  const registros = porDia(stats?.registrationsByDay);
  const speakers = porDia(stats?.speakersByDay);
  const voluntarios = porDia(stats?.volunteersByDay);
  const checkIns = porDia(stats?.checkInsByDay);
  const sortedDates = Array.from(
    new Set([...registros.keys(), ...speakers.keys(), ...voluntarios.keys(), ...checkIns.keys()]),
  ).sort();

  const activityData = sortedDates.map((date) => ({
    date: date.slice(5),
    Asistentes: registros.get(date) || 0,
    Speakers: speakers.get(date) || 0,
    Voluntarios: voluntarios.get(date) || 0,
    "Check-ins": checkIns.get(date) || 0,
  }));

  // Crecimiento acumulado.
  let acumulado = 0;
  const cumulativeData = sortedDates.map((date) => {
    acumulado += registros.get(date) || 0;
    return { date: date.slice(5), Acumulado: acumulado };
  });

  const c = stats?.confirmed;
  const confirmedComposition = [
    { name: "Registrados", value: c?.registrations || 0, color: COLORS.orange, icon: ClipboardList },
    { name: "Speakers presenciales", value: c?.speakersPresencial || 0, color: COLORS.blue, icon: Mic2 },
    { name: "Voluntarios aceptados", value: c?.volunteersApproved || 0, color: COLORS.purple, icon: Heart },
    { name: "Equipo organizador", value: c?.team || 0, color: COLORS.emerald, icon: ShieldCheck },
  ];

  const speakerFunnelData = stats ? [
    { name: "Recibidas", value: stats.speakerFunnel.submitted, color: COLORS.grayLight },
    { name: "En revisión", value: stats.speakerFunnel.reviewing, color: COLORS.amber },
    { name: "Aceptadas", value: stats.speakerFunnel.accepted, color: COLORS.emerald },
    { name: "Lista espera", value: stats.speakerFunnel.waitlisted, color: COLORS.sky },
    { name: "Rechazadas", value: stats.speakerFunnel.rejected, color: COLORS.red },
  ] : [];

  const modalityDonut = stats ? [
    { name: "Presenciales", value: stats.speakerModality.presencialPeople, color: COLORS.blue },
    { name: "Online", value: stats.speakerModality.onlinePeople, color: COLORS.sky },
  ] : [];

  const volunteerDonut = stats ? [
    { name: "Aceptados", value: stats.volunteerFunnel.approved, color: COLORS.purple },
    { name: "Pendientes", value: stats.volunteerFunnel.pending, color: COLORS.gray },
  ] : [];

  const teamData = stats ? [
    { name: "Admins", value: stats.team.admin, color: COLORS.orange },
    { name: "Organizadores", value: stats.team.organizer, color: COLORS.emerald },
    { name: "Staff (voluntarios)", value: stats.team.volunteer, color: COLORS.purple },
  ].filter((d) => d.value > 0) : [];

  const checkInDonut = [
    { name: "Check-in", value: stats?.totalCheckedIn || 0, color: COLORS.emerald },
    { name: "Pendiente", value: (stats?.totalRegistrations || 0) - (stats?.totalCheckedIn || 0), color: COLORS.gray },
  ];

  return {
    activityData, cumulativeData, confirmedComposition, speakerFunnelData,
    modalityDonut, volunteerDonut, teamData, checkInDonut,
  };
}

const SERIES_ACTIVIDAD = [
  { clave: "Asistentes", color: COLORS.orange },
  { clave: "Speakers", color: COLORS.blue },
  { clave: "Voluntarios", color: COLORS.purple },
  { clave: "Check-ins", color: COLORS.emerald },
];

const sinPrefijoGrupo = (v: string) => v.replace("AWS Student Builder Group ", "");

export default function DashboardPage() {
  const { user } = useAuth();
  // El dashboard de stats es solo admin/organizer; el staff ve su hub de botones
  // y así tampoco descarga las gráficas.
  const isStaff = !!user && user.role !== "admin" && user.role !== "organizer";
  if (isStaff) return <StaffHub />;
  return <PanelOrganizador nombre={user?.name} />;
}

function PanelOrganizador({ nombre }: { nombre?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const {
    activityData, cumulativeData, confirmedComposition, speakerFunnelData,
    modalityDonut, volunteerDonut, teamData, checkInDonut,
  } = useMemo(() => series(stats), [stats]);
  const c = stats?.confirmed;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title={`hola, ${(nombre?.split(" ")[0] || "admin").toLowerCase()}`}
      />

      <CuentaAtras />

      {/* ═══ HEADCOUNT CONFIRMADO — the highlight ═══ */}
      <div className="mb-6 overflow-hidden border-2 border-acento/30 bg-gradient-to-br from-acento/[0.08] via-glass to-glass">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Big number */}
          <div className="flex flex-col justify-center border-b-2 border-surface-600 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-acento" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-acento">Asistencia esperada</p>
            </div>
            <p className="mt-2 font-mono text-5xl font-black tabular-nums text-surface-50 sm:text-6xl">
              {(c?.total ?? 0).toLocaleString(PAIS.locale)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-surface-400">
              speakers presenciales + voluntarios + equipo + registros
            </p>
            <p className="mt-3 font-mono text-[9px] leading-relaxed text-surface-300">
              Los registros no garantizan asistencia.
            </p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {confirmedComposition.map((seg) => {
              const Icon = seg.icon;
              const pct = c?.total ? Math.round((seg.value / c.total) * 100) : 0;
              return (
                <div key={seg.name} className="border-2 border-surface-600 bg-surface-800 p-3">
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4" style={{ color: seg.color }} />
                    <span className="font-mono text-[9px] text-surface-300">{pct}%</span>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-surface-50">
                    {seg.value.toLocaleString(PAIS.locale)}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] leading-tight text-surface-400">{seg.name}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Composition bar */}
        {c && c.total > 0 && (
          <div className="px-5 pb-5 sm:px-6">
            <div className="flex h-2.5 w-full overflow-hidden bg-surface-800">
              {confirmedComposition.map((seg) => (
                seg.value > 0 && (
                  <div
                    key={seg.name}
                    style={{ width: `${(seg.value / c.total) * 100}%`, backgroundColor: seg.color }}
                    title={`${seg.name}: ${seg.value}`}
                  />
                )
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Confirmados vs totales ═══ */}
      <SectionTitle icon={UserCheck} accent="text-emerald-400">Confirmados (cierre de cuentas)</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatsCard
          label="Registrados"
          value={stats?.confirmed?.registrations ?? 0}
          icon={ClipboardList}
          accent="text-acento"
          hint="esperados (no garantiza)"
        />
        {/* Attendance confirmation ratio (escarapela) */}
        <div className="group border border-emerald-400/25 bg-emerald-400/[0.04] p-4 transition-all hover:border-emerald-400/50">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-surface-400">Confirmaron asistencia</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-emerald-400">
                {(stats?.registrationsConfirmed ?? 0).toLocaleString(PAIS.locale)}
                <span className="text-sm font-medium text-surface-300"> / {(stats?.totalRegistrations ?? 0).toLocaleString(PAIS.locale)}</span>
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-surface-300">
                {stats?.totalRegistrations ? Math.round((stats.registrationsConfirmed / stats.totalRegistrations) * 100) : 0}% de registrados
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-emerald-400/10 group-hover:bg-emerald-400/20">
              <Ticket className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </div>
        <StatsCard
          label="Speakers presenciales"
          value={stats?.confirmed?.speakersPresencial ?? 0}
          icon={MapPin}
          accent="text-blue-400"
          hint={`${stats?.speakerModality?.onlinePeople ?? 0} online aparte`}
        />
        <StatsCard
          label="Voluntarios aceptados"
          value={stats?.confirmed?.volunteersApproved ?? 0}
          icon={Heart}
          accent="text-purple-400"
          hint={`de ${stats?.totalVolunteers ?? 0} postulados`}
        />
        <StatsCard
          label="Equipo organizador"
          value={stats?.confirmed?.team ?? 0}
          icon={ShieldCheck}
          accent="text-emerald-400"
          hint={`${stats?.team?.admin ?? 0} admin · ${stats?.team?.organizer ?? 0} org`}
        />
      </div>

      {/* ═══ Totales generales ═══ */}
      <div className="mt-8">
        <SectionTitle icon={TrendingUp}>Totales generales</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatsCard label="Asistentes" value={stats?.totalRegistrations ?? 0} icon={ClipboardList} accent="text-acento" />
          <StatsCard label="Speakers" value={stats?.totalSpeakers ?? 0} icon={Mic2} accent="text-blue-400" hint="postulaciones" />
          <StatsCard label="Voluntarios" value={stats?.totalVolunteers ?? 0} icon={Heart} accent="text-purple-400" hint="postulaciones" />
          <StatsCard label="Check-ins" value={stats?.totalCheckedIn ?? 0} icon={QrCode} accent="text-emerald-400" />
          <StatsCard label="Tasa Check-in" value={stats?.checkInRate ?? 0} icon={Users} suffix="%" />
          <StatsCard label="Emails enviados" value={stats?.emailsSent ?? 0} icon={Mail} accent="text-teal-400" />
        </div>
      </div>

      {/* ═══ Speakers: embudo + modalidad ═══ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Funnel */}
        <div className="border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={Mic2} accent="text-blue-400">Postulaciones de speakers</SectionTitle>
          {speakerFunnelData.some((d) => d.value > 0) ? (
            <Barras
              data={speakerFunnelData}
              alto={Math.max(180, speakerFunnelData.length * 42)}
              horizontal
              categoria="name"
              valor="value"
              nombre="Postulaciones"
              anchoEje={92}
              margen={{ top: 0, right: 24, left: 0, bottom: 0 }}
            />
          ) : (
            <p className="py-8 text-center font-mono text-xs text-surface-300">Sin postulaciones aún</p>
          )}
        </div>

        {/* Modality donut */}
        <div className="border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={Wifi} accent="text-sky-400">Modalidad — aceptados</SectionTitle>
          <div className="relative">
            <Dona data={modalityDonut} alto={180} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold text-surface-50">
                {(stats?.speakerModality?.presencialPeople ?? 0) + (stats?.speakerModality?.onlinePeople ?? 0)}
              </span>
              <span className="font-mono text-[10px] text-surface-300">aceptados</span>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-surface-400">
              <span className="h-2 w-2" style={{ backgroundColor: COLORS.blue }} /> Presencial ({stats?.speakerModality?.presencialPeople ?? 0})
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-surface-400">
              <span className="h-2 w-2" style={{ backgroundColor: COLORS.sky }} /> Online ({stats?.speakerModality?.onlinePeople ?? 0})
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Voluntarios + Equipo + Check-in donuts ═══ */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Volunteers */}
        <div className="border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={Heart} accent="text-purple-400">Voluntarios</SectionTitle>
          <div className="relative">
            <Dona data={volunteerDonut} alto={180} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold text-surface-50">{stats?.volunteerFunnel?.approved ?? 0}</span>
              <span className="font-mono text-[10px] text-surface-300">aceptados</span>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-surface-400">
              <span className="h-2 w-2" style={{ backgroundColor: COLORS.purple }} /> Aceptados ({stats?.volunteerFunnel?.approved ?? 0})
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-surface-400">
              <span className="h-2 w-2" style={{ backgroundColor: COLORS.gray }} /> Pendientes ({stats?.volunteerFunnel?.pending ?? 0})
            </span>
          </div>
        </div>

        {/* Team */}
        <div className="border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={ShieldCheck} accent="text-emerald-400">Equipo organizador</SectionTitle>
          {teamData.length > 0 ? (
            <Barras
              data={teamData}
              alto={180}
              categoria="name"
              valor="value"
              nombre="Miembros"
              etiquetasApretadas
              margen={{ top: 8, right: 8, left: -22, bottom: 0 }}
            />
          ) : (
            <p className="py-8 text-center font-mono text-xs text-surface-300">Sin miembros</p>
          )}
          <p className="mt-2 text-center font-mono text-[10px] text-surface-300">
            {stats?.team?.total ?? 0} en total con acceso al panel
          </p>
        </div>

        {/* Check-in */}
        <div className="border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={QrCode} accent="text-emerald-400">Estado de Check-in</SectionTitle>
          <div className="relative">
            <Dona data={checkInDonut} alto={180} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold text-surface-50">{stats?.checkInRate ?? 0}%</span>
              <span className="font-mono text-[10px] text-surface-300">check-in</span>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-surface-400">
              <span className="h-2 w-2" style={{ backgroundColor: COLORS.emerald }} /> Check-in ({stats?.totalCheckedIn ?? 0})
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-surface-400">
              <span className="h-2 w-2" style={{ backgroundColor: COLORS.gray }} /> Pendiente ({(stats?.totalRegistrations ?? 0) - (stats?.totalCheckedIn ?? 0)})
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Crecimiento de registros (acumulado) ═══ */}
      {cumulativeData.length > 1 && (
        <div className="mt-6 border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={TrendingUp} accent="text-acento">Crecimiento de registros (acumulado)</SectionTitle>
          <Linea data={cumulativeData} alto={220} x="date" y="Acumulado" color={COLORS.orange} />
        </div>
      )}

      {/* ═══ Actividad por día ═══ */}
      {activityData.length > 0 && (
        <div className="mt-6 border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={TrendingUp}>Actividad por día</SectionTitle>
          <Areas data={activityData} alto={240} x="date" series={SERIES_ACTIVIDAD} />
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            {[
              { c: COLORS.orange, l: "Asistentes" },
              { c: COLORS.blue, l: "Speakers" },
              { c: COLORS.purple, l: "Voluntarios" },
              { c: COLORS.emerald, l: "Check-ins" },
            ].map((x) => (
              <span key={x.l} className="flex items-center gap-1.5 font-mono text-[10px] text-surface-400">
                <span className="h-2 w-2" style={{ backgroundColor: x.c }} /> {x.l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Student Builder Group Breakdown ═══ */}
      {stats?.cloudClubBreakdown && stats.cloudClubBreakdown.length > 0 && (
        <div className="mt-6 border-2 border-surface-600 bg-surface-800 p-5">
          <SectionTitle icon={Users} accent="text-purple-400">Voluntarios por Student Builder Group</SectionTitle>
          <Barras
            data={stats.cloudClubBreakdown}
            alto={Math.max(160, stats.cloudClubBreakdown.length * 40)}
            horizontal
            categoria="club"
            valor="count"
            nombre="Voluntarios"
            color={COLORS.purple}
            anchoEje={200}
            formatoEje={sinPrefijoGrupo}
            margen={{ top: 0, right: 20, left: 0, bottom: 0 }}
          />
        </div>
      )}
    </div>
  );
}
