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
  Headphones, HelpCircle, Globe, ChevronDown, LogOut,
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
      { href: "/dashboard/soporte", label: "Soporte", icon: Headphones },
      { href: "/dashboard/qa", label: "Q&A Pipeline", icon: HelpCircle },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

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
    <aside className="w-[260px] min-h-screen flex flex-col border-r border-white/[0.06] bg-[hsl(240_8%_8%)]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Image
          src="/logo.png"
          alt="Revolutia"
          width={140}
          height={32}
          className="h-7 w-auto object-contain"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-thin">
        {navSections.map((section) => {
          const isOpen = section.collapsible ? !!openSections[section.label] : true;
          return (
            <div key={section.label}>
              {section.collapsible ? (
                <button
                  onClick={() => toggle(section.label)}
                  className="flex items-center justify-between w-full px-2 mb-1.5 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white/70 transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-white/20 group-hover:text-white/40 transition-all duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              ) : (
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5 px-2">
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
                          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150",
                          active
                            ? "bg-[hsl(280_80%_60%_/_0.22)] text-white shadow-sm"
                            : "text-white/65 hover:bg-white/[0.08] hover:text-white"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[hsl(280_80%_60%)] rounded-r-full" />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-[hsl(280_80%_80%)]" : "text-white/50"
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
      <div className="p-3 border-t border-white/[0.06] flex items-center justify-between">
        <p className="text-[11px] text-white/20 font-medium px-2">v1.0 · Admin Dashboard</p>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
