import {
  LayoutDashboard, Users, Mic2, Heart, ClipboardList, QrCode, FileText,
  Calendar, HelpCircle, Settings, Printer,
  Stamp, MailOpen, ImageIcon, MapPin, Utensils, Activity, FileSpreadsheet, Award,
  SlidersHorizontal,
} from "lucide-react";
import type React from "react";
import type { SeccionId } from "@/lib/permisos";

/** El menú del panel. Lo usan la barra lateral y la pantalla de inicio del staff. */
export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  exact?: boolean;
  /** La sección de permisos que manda sobre esta entrada. Sin ella sólo la filtra el rol. */
  seccion?: SeccionId;
  /** `false` la quita del menú: es de un módulo que la edición apagó. */
  si?: boolean;
}

export interface NavGroup {
  label: string;
  roles: string[];
  items: NavItem[];
}

const TODOS: NavGroup[] = [
  {
    label: "General",
    roles: ["admin", "organizer", "volunteer"],
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "organizer"], exact: true },
      { href: "/admin/evento", label: "Tablero en vivo", icon: Activity, roles: ["admin", "organizer"] },
    ],
  },
  {
    label: "Personas",
    roles: ["admin", "organizer", "volunteer"],
    items: [
      { href: "/admin/registrations", label: "Asistentes", icon: ClipboardList, roles: ["admin", "organizer", "volunteer"], seccion: "registrations" },
      { href: "/admin/volunteers", label: "Voluntarios", icon: Heart, roles: ["admin", "organizer"], seccion: "volunteers" },
      { href: "/admin/speakers", label: "Speakers", icon: Mic2, roles: ["admin", "organizer"], exact: true , seccion: "speakers" },
      { href: "/admin/users", label: "Cuentas de staff", icon: Users, roles: ["admin"] },
      { href: "/admin/speakers/canvas", label: "Tarjetas de speakers", icon: ImageIcon, roles: ["admin"] },
    ],
  },
  {
    label: "Programa",
    roles: ["admin", "organizer"],
    items: [
      { href: "/admin/programa", label: "Programa", icon: Calendar, roles: ["admin", "organizer"], seccion: "programa" },
    ],
  },
  {
    label: "Evento",
    roles: ["admin", "organizer", "volunteer"],
    items: [
      { href: "/admin/check-in", label: "Check-in", icon: QrCode, roles: ["admin", "organizer", "volunteer"], seccion: "checkin" },
      { href: "/admin/pasaportes", label: "Pasaportes", icon: Stamp, roles: ["admin"] },
      { href: "/admin/print", label: "Impresión", icon: Printer, roles: ["admin", "organizer", "volunteer"], seccion: "print" },
      { href: "/admin/correos", label: "Correos", icon: MailOpen, roles: ["admin", "organizer"], seccion: "correos" },
      { href: "/admin/certificados", label: "Certificados", icon: Award, roles: ["admin"] },
      { href: "/admin/encuesta", label: "Encuesta", icon: ClipboardList, roles: ["admin"] },
    ],
  },
  {
    label: "Escaner",
    roles: ["admin", "organizer", "volunteer", "badges"],
    items: [
      { href: "/admin/escaner/check-in", label: "Check-in", icon: QrCode, roles: ["admin", "organizer", "volunteer"], seccion: "escaner_checkin" },
      { href: "/admin/escaner/salas", label: "Salas", icon: MapPin, roles: ["admin", "organizer", "volunteer"], seccion: "escaner_salas" },
      { href: "/admin/escaner/almuerzos", label: "Almuerzos", icon: Utensils, roles: ["admin", "organizer", "volunteer"], seccion: "escaner_almuerzos" },
      { href: "/admin/escaner/badges", label: "Dar badges", icon: Stamp, roles: ["admin", "organizer", "volunteer", "badges"], seccion: "escaner_badges" },
    ],
  },
  {
    label: "Datos",
    roles: ["admin"],
    items: [
      { href: "/admin/consola", label: "Consola", icon: SlidersHorizontal, roles: ["admin"] },
      { href: "/admin/reportes", label: "Reportes", icon: FileSpreadsheet, roles: ["admin"] },
      { href: "/admin/logs", label: "Actividad", icon: FileText, roles: ["admin"] },
    ],
  },
  {
    label: "Sistema",
    roles: ["admin", "organizer"],
    items: [
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle, roles: ["admin", "organizer"], seccion: "faq" },
      { href: "/admin/config", label: "Configuración", icon: Settings, roles: ["admin"] },
    ],
  },
];

/** El menú, sin las entradas de los módulos apagados ni los grupos que queden vacíos. */
export const navGroups: NavGroup[] = TODOS
  .map((g) => ({ ...g, items: g.items.filter((i) => i.si !== false) }))
  .filter((g) => g.items.length > 0);
