"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard, Users, BarChart3, Activity,
  Star, Award, MessageSquare,
  ShoppingCart, CalendarDays, ClipboardList, Trophy, PlayCircle,
  Headphones, HelpCircle, Globe, ChevronDown, LogOut, Briefcase, GitMerge, TrendingUp, FileText, Presentation, CalendarClock,
  PanelLeftClose, PanelLeftOpen, Lock, Shield,
} from "lucide-react";

const SECTION_STYLES: Record<string, { bg: string; text: string; border: string; activeBg: string; activeText: string; activeBar: string; number: string }> = {
  "Cruce de ventas": {
    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",
    activeBg: "bg-emerald-50", activeText: "text-emerald-700", activeBar: "bg-emerald-500", number: "bg-emerald-500",
  },
  "Panel de producto": {
    bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200",
    activeBg: "bg-purple-50", activeText: "text-purple-700", activeBar: "bg-purple-500", number: "bg-purple-500",
  },
  "Operativa producto": {
    bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200",
    activeBg: "bg-amber-50", activeText: "text-amber-700", activeBar: "bg-amber-500", number: "bg-amber-500",
  },
  "Accesos": {
    bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200",
    activeBg: "bg-rose-50", activeText: "text-rose-700", activeBar: "bg-rose-500", number: "bg-rose-500",
  },
};

type NavItem = { href: string; label: string; icon: typeof GitMerge };
type NavSection = { label: string; number: string; items: NavItem[]; requiresSuperAdmin?: boolean };

const navSections: NavSection[] = [
  {
    label: "Cruce de ventas",
    number: "1",
    items: [
      { href: "/dashboard/funnel", label: "Cruce de ventas", icon: GitMerge },
      { href: "/dashboard/funnel-historico", label: "Historico", icon: TrendingUp },
    ],
  },
  {
    label: "Panel de producto",
    number: "2",
    items: [
      { href: "/dashboard/reembolsos", label: "Reembolsos", icon: ClipboardList },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/feedback", label: "NPS Formacion", icon: MessageSquare },
      { href: "/dashboard/arp", label: "Certificados ARP", icon: Award },
      { href: "/dashboard/vimeo", label: "Consumo Vimeo", icon: PlayCircle },
      { href: "/dashboard/circle", label: "Circle", icon: Globe },
      { href: "/dashboard/exitos", label: "Casos de Exito", icon: Trophy },
      { href: "/dashboard/soporte", label: "Soporte", icon: Headphones },
    ],
  },
  {
    label: "Operativa producto",
    number: "3",
    items: [
      { href: "/dashboard/onboardings", label: "Onboardings", icon: ClipboardList },
      { href: "/dashboard/gestion-exitos", label: "Gestion Casos de Exito", icon: Trophy },
      { href: "/dashboard/qa", label: "Q&A Pipeline", icon: HelpCircle },
      { href: "/dashboard/jobs", label: "Banco de Empleo", icon: Briefcase },
      { href: "/dashboard/workshops", label: "Workshops", icon: Presentation },
    ],
  },
  {
    label: "Accesos",
    number: "4",
    requiresSuperAdmin: true,
    items: [
      { href: "/dashboard/permisos", label: "Permisos", icon: Shield },
    ],
  },
];

export default function Sidebar({ role = "admin", allowedRoutes, isSuperAdmin = false }: { role?: string; allowedRoutes?: string[] | null; isSuperAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Cruce de ventas": true,
    "Panel de producto": false,
    "Operativa producto": false,
    "Accesos": false,
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

  const sections: NavSection[] = role === "qa_admin"
    ? [{ label: "Operativa producto", number: "3", items: navSections.flatMap(s => s.items).filter(i => i.href === "/dashboard/qa") }]
    : navSections;

  if (collapsed) {
    return (
      <aside className="w-12 min-h-screen flex flex-col border-r border-gray-200 bg-slate-50 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 hover:bg-gray-100 transition-colors border-b border-gray-100"
          title="Expandir menu"
        >
          <PanelLeftOpen className="h-5 w-5 text-gray-400" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] min-h-screen flex flex-col border-r border-gray-200 bg-slate-50 shrink-0">
      {/* Logo + collapse */}
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Revolutia"
          className="h-6 w-auto object-contain"
        />
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          title="Ocultar menu"
        >
          <PanelLeftClose className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto scrollbar-thin">
        {sections.map((section) => {
          const isOpen = !!openSections[section.label];
          const s = SECTION_STYLES[section.label] ?? SECTION_STYLES["Panel de producto"];
          const hasActive = section.items.some(i => pathname === i.href);
          const requiresSuperAdminLocked = !!section.requiresSuperAdmin && !isSuperAdmin;
          const sectionLocked = requiresSuperAdminLocked || (allowedRoutes !== null && allowedRoutes !== undefined && !section.items.some(i => allowedRoutes.includes(i.href)));

          return (
            <div key={section.label}>
              {/* Section header */}
              <button
                onClick={() => !sectionLocked && toggle(section.label)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-xl group transition-all duration-200",
                  sectionLocked ? "bg-gray-50 opacity-50 cursor-not-allowed" : s.bg,
                  !sectionLocked && hasActive && `border ${s.border}`,
                  !sectionLocked && !hasActive && "border border-transparent",
                  sectionLocked && "border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black text-white", s.number)}>
                    {section.number}
                  </span>
                  <span className={cn("text-[13px] font-extrabold tracking-wide transition-colors", s.text)}>
                    {section.label}
                  </span>
                </div>
                {sectionLocked ? (
                  <Lock className="h-3.5 w-3.5 text-gray-400" />
                ) : (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-all duration-200 opacity-50 group-hover:opacity-80",
                      s.text,
                      isOpen && "rotate-180"
                    )}
                  />
                )}
              </button>

              {/* Section items */}
              {isOpen && (
                <div className="mt-1 ml-2 pl-4 border-l-2 border-gray-200 space-y-0.5">
                  {section.items.map(({ href, label, icon: Icon }, idx) => {
                    const active = pathname === href;
                    const locked = requiresSuperAdminLocked || (allowedRoutes !== null && allowedRoutes !== undefined && !allowedRoutes.includes(href));
                    if (locked) {
                      return (
                        <div
                          key={href}
                          className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-semibold text-gray-300 cursor-not-allowed select-none"
                        >
                          <span className="text-[10px] font-bold w-4 text-center shrink-0 text-gray-300">
                            {section.number}.{idx + 1}
                          </span>
                          <Lock className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                          {label}
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150",
                          active
                            ? cn(s.activeBg, s.activeText, "shadow-sm")
                            : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900"
                        )}
                      >
                        {active && (
                          <span className={cn("absolute -left-[17px] top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full", s.activeBar)} />
                        )}
                        <span className={cn(
                          "text-[10px] font-bold w-4 text-center shrink-0",
                          active ? s.activeText : "text-gray-400"
                        )}>
                          {section.number}.{idx + 1}
                        </span>
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            active ? s.activeText : "text-gray-400"
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
          title="Cerrar sesion"
          className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
