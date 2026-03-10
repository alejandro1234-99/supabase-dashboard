"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BarChart3, Activity,
  Table2, RefreshCw, Settings, Star, Zap, Award, MessageSquare, ShoppingCart, CalendarDays, ClipboardList, Trophy, PlayCircle, Headphones, HelpCircle, Globe,
} from "lucide-react";

const navSections = [
  {
    label: "Plataforma",
    items: [
      { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
      { href: "/dashboard/users", label: "Usuarios", icon: Users },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/activity", label: "Actividad", icon: Activity },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/arp", label: "Certificados ARP", icon: Award },
      { href: "/dashboard/feedback", label: "Feedback Alumnos", icon: MessageSquare },
      { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart },
      { href: "/dashboard/agendas", label: "Agendas", icon: CalendarDays },
      { href: "/dashboard/onboarding", label: "Onboarding", icon: ClipboardList },
      { href: "/dashboard/alumnos", label: "Alumnos Circle", icon: Users },
      { href: "/dashboard/exitos", label: "Casos de Éxito", icon: Trophy },
      { href: "/dashboard/vimeo", label: "Consumo Vimeo", icon: PlayCircle },
      { href: "/dashboard/soporte", label: "Soporte", icon: Headphones },
      { href: "/dashboard/qa", label: "Q&A Pipeline", icon: HelpCircle },
      { href: "/dashboard/circle", label: "Circle", icon: Globe },
    ],
  },
  {
    label: "Base de datos",
    items: [
      { href: "/dashboard/tables", label: "Explorador", icon: Table2 },
      { href: "/dashboard/charts", label: "Gráficas", icon: BarChart3 },
      { href: "/dashboard/migrate", label: "Migrar Airtable", icon: RefreshCw },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/settings", label: "Configuración", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-gray-900 tracking-tight">Revolutia AI</p>
            <p className="text-[11px] text-gray-400 font-medium">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-3">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150",
                      active
                        ? "bg-emerald-50 text-emerald-700 shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-emerald-600" : "text-gray-400")} />
                    {label}
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-300 font-medium">v1.0 · Revolutia AI PRO</p>
      </div>
    </aside>
  );
}
