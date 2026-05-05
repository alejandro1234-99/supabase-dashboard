"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Headphones, HelpCircle } from "lucide-react";
import TicketsPanel from "./TicketsPanel";
import SesionesQAPanel from "./SesionesQAPanel";

type TabId = "tickets" | "qa";

const TABS: { id: TabId; label: string; icon: typeof Headphones }[] = [
  { id: "tickets", label: "Tickets", icon: Headphones },
  { id: "qa", label: "Sesiones Q&A", icon: HelpCircle },
];

function SoporteContent() {
  const searchParams = useSearchParams();
  const initial: TabId = searchParams.get("tab") === "qa" ? "qa" : "tickets";
  const [tab, setTab] = useState<TabId>(initial);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
        <p className="text-gray-400 text-sm mt-0.5">Tickets de soporte y pipeline de Q&A</p>
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

      {tab === "tickets" && <TicketsPanel />}
      {tab === "qa" && <SesionesQAPanel />}
    </div>
  );
}

export default function SoportePage() {
  return (
    <Suspense fallback={<div className="space-y-6 max-w-7xl"><div className="h-20" /></div>}>
      <SoporteContent />
    </Suspense>
  );
}
