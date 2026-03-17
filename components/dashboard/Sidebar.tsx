"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BarChart3, Activity,
  Table2, RefreshCw, Settings, Star, Zap, Award, MessageSquare, ShoppingCart, CalendarDays, ClipboardList, Trophy, PlayCircle, Headphones, HelpCircle, Globe, ChevronDown,
} from "lucide-react";

const navSections = [
  {
    label: "Nuevo Circle",
    collapsible: true,
    items: [
      { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
      { href: "/dashboard/users", label: "Usuarios", icon: Users },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/activity", label: "Actividad", icon: Activity },
    ],
  },
  {
    label: "Panel de producto",
    collapsible: true,
    items: [
      { href: "/dashboard/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/feedback", label: "NPS Formación", icon: MessageSquare },
      { href: "/dashboard/arp", label: "Certificados ARP", icon: Award },
      { href: "/dashboard/vimeo", label: "Consumo Vimeo", icon: PlayCircle },
      { href: "/dashboard/circle", label: "Circle", icon: Globe },
      { href: "/dashboard/exitos", label: "Casos de Éxito", icon: Trophy },
    ],
  },
  {
    label: "Plataforma",
    collapsible: false,
    items: [
      { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart },
      { href: "/dashboard/agendas", label: "Agendas", icon: CalendarDays },
      { href: "/dashboard/onboarding", label: "Onboarding", icon: ClipboardList },
      { href: "/dashboard/alumnos", label: "Alumnos Circle", icon: Users },
      { href: "/dashboard/soporte", label: "Soporte", icon: Headphones },
      { href: "/dashboard/qa", label: "Q&A Pipeline", icon: HelpCircle },
    ],
  },
  {
    label: "Base de datos",
    collapsible: false,
    items: [
      { href: "/dashboard/tables", label: "Explorador", icon: Table2 },
      { href: "/dashboard/charts", label: "Gráficas", icon: BarChart3 },
      { href: "/dashboard/migrate", label: "Migrar Airtable", icon: RefreshCw },
    ],
  },
  {
    label: "Sistema",
    collapsible: false,
    items: [
      { href: "/dashboard/settings", label: "Configuración", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }

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
        {navSections.map((section) => {
          const isOpen = section.collapsible ? !!openSections[section.label] : true;
          return (
            <div key={section.label}>
              {section.collapsible ? (
                <button
                  onClick={() => toggle(section.label)}
                  className="flex items-center justify-between w-full px-3 mb-1.5 group"
                >
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-gray-300 group-hover:text-gray-500 transition-all duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              ) : (
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-3">
                  {section.label}
                </p>
              )}

              {isOpen && (
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
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-300 font-medium">v1.0 · Revolutia AI PRO</p>
      </div>
    </aside>
  );
}
