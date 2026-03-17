"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard, Users, BarChart3, Activity,
  Star, Award, MessageSquare,
  ShoppingCart, CalendarDays, ClipboardList, Trophy, PlayCircle,
  Headphones, HelpCircle, Globe, ChevronDown, LogOut, Briefcase,
} from "lucide-react";

const SECTION_COLORS: Record<string, { bg: string; text: string }> = {
  "Nuevo Circle":       { bg: "bg-indigo-50",   text: "text-indigo-600" },
  "Panel de producto":  { bg: "bg-purple-50",   text: "text-purple-600" },
  "Cruce de ventas":    { bg: "bg-emerald-50",  text: "text-emerald-700" },
  "Operativa producto": { bg: "bg-amber-50",    text: "text-amber-700" },
};

const navSections = [
  {
    label: "Nuevo Circle",
    items: [
      { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
      { href: "/dashboard/users", label: "Usuarios", icon: Users },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/activity", label: "Actividad", icon: Activity },
    ],
  },
  {
    label: "Panel de producto",
    items: [
      { href: "/dashboard/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/feedback", label: "NPS Formación", icon: MessageSquare },
      { href: "/dashboard/arp", label: "Certificados ARP", icon: Award },
      { href: "/dashboard/vimeo", label: "Consumo Vimeo", icon: PlayCircle },
      { href: "/dashboard/circle", label: "Circle", icon: Globe },
      { href: "/dashboard/exitos", label: "Casos de Éxito", icon: Trophy },
      { href: "/dashboard/soporte", label: "Soporte", icon: Headphones },
    ],
  },
  {
    label: "Cruce de ventas",
    items: [
      { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart },
      { href: "/dashboard/agendas", label: "Agendas", icon: CalendarDays },
      { href: "/dashboard/onboarding", label: "Onboarding", icon: ClipboardList },
    ],
  },
  {
    label: "Operativa producto",
    items: [
      { href: "/dashboard/qa", label: "Q&A Pipeline", icon: HelpCircle },
      { href: "/dashboard/jobs", label: "Banco de Empleo", icon: Briefcase },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Nuevo Circle": true,
    "Panel de producto": true,
    "Cruce de ventas": true,
    "Operativa producto": true,
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggle(label: string) {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside className="w-[260px] min-h-screen flex flex-col border-r border-gray-200 bg-slate-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Revolutia"
          className="h-6 w-auto object-contain"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navSections.map((section) => {
          const isOpen = !!openSections[section.label];
          return (
            <div key={section.label} className="mb-1">
              {(() => {
                const c = SECTION_COLORS[section.label] ?? { bg: "bg-white/10", text: "text-white/80" };
                return (
                  <button
                    onClick={() => toggle(section.label)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-lg group transition-colors",
                      c.bg
                    )}
                  >
                    <span className={cn("text-[13px] font-extrabold tracking-wide transition-colors group-hover:brightness-125", c.text)}>
                      {section.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-all duration-200 opacity-60 group-hover:opacity-90",
                        c.text,
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                );
              })()}

              {isOpen && (
                <div className="space-y-0.5 mt-0.5 mb-2">
                  {section.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150",
                          active
                            ? "bg-purple-50 text-purple-700 shadow-sm"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-500 rounded-r-full" />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-purple-500" : "text-gray-400"
                          )}
                        />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[11px] text-gray-300 font-medium px-2">v1.0 · Admin Dashboard</p>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
