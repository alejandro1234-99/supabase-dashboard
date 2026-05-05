"use client";

import { useState } from "react";
import { MessageSquare, Star, Lock } from "lucide-react";
import NPSFormacionPanel from "./NPSFormacionPanel";
import TrustpilotPanel from "./TrustpilotPanel";

type TabId = "nps" | "trustpilot" | "workshops";

const TABS: { id: TabId; label: string; icon: typeof Star; color: string; disabled?: boolean }[] = [
  { id: "nps", label: "NPS Formación", icon: MessageSquare, color: "indigo" },
  { id: "trustpilot", label: "Trustpilot", icon: Star, color: "emerald" },
  { id: "workshops", label: "NPS Workshops", icon: MessageSquare, color: "gray", disabled: true },
];

export default function OpinionesPage() {
  const [tab, setTab] = useState<TabId>("nps");

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opiniones de Alumnos</h1>
        <p className="text-gray-400 text-sm mt-0.5">NPS de la formación y reseñas externas</p>
      </div>

      <div className="border-b border-gray-200 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => !t.disabled && setTab(t.id)}
              disabled={t.disabled}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${
                active
                  ? "border-purple-500 text-purple-700"
                  : t.disabled
                    ? "border-transparent text-gray-300 cursor-not-allowed"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.disabled ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-4 w-4" />}
              {t.label}
              {t.disabled && <span className="text-[10px] uppercase tracking-wide text-gray-300 ml-1">próximamente</span>}
            </button>
          );
        })}
      </div>

      {tab === "nps" && <NPSFormacionPanel />}
      {tab === "trustpilot" && <TrustpilotPanel />}
    </div>
  );
}
