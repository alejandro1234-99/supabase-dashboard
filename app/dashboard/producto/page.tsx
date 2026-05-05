"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutDashboard, PlayCircle, Award, Briefcase } from "lucide-react";
import PlataformaPanel from "./PlataformaPanel";
import VimeoPanel from "./VimeoPanel";
import CertificadosArpPanel from "./CertificadosArpPanel";
import BancoEmpleoPanel from "./BancoEmpleoPanel";

type TabId = "plataforma" | "vimeo" | "arp" | "jobs";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "plataforma", label: "Plataforma", icon: LayoutDashboard },
  { id: "vimeo", label: "Consumo Vimeo", icon: PlayCircle },
  { id: "arp", label: "Certificados ARP", icon: Award },
  { id: "jobs", label: "Banco de Empleo", icon: Briefcase },
];

function Content() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initial: TabId =
    tabParam === "vimeo" ? "vimeo" :
    tabParam === "arp" ? "arp" :
    tabParam === "jobs" ? "jobs" :
    "plataforma";
  const [tab, setTab] = useState<TabId>(initial);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Producto</h1>
        <p className="text-gray-400 text-sm mt-0.5">Actividad en la plataforma Revolutia y consumo de vídeo</p>
      </div>

      <div className="border-b border-gray-200 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${
                active
                  ? "border-purple-500 text-purple-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "plataforma" && <PlataformaPanel />}
      {tab === "vimeo" && <VimeoPanel />}
      {tab === "arp" && <CertificadosArpPanel />}
      {tab === "jobs" && <BancoEmpleoPanel />}
    </div>
  );
}

export default function ProductoPage() {
  return (
    <Suspense fallback={<div className="space-y-6 max-w-7xl"><div className="h-20" /></div>}>
      <Content />
    </Suspense>
  );
}
