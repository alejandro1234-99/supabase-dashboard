"use client";

import { useState } from "react";
import { Wallet, Briefcase, FileText } from "lucide-react";
import PagosRecobrosTab from "./tabs/PagosRecobrosTab";
import ContratosFacturasTab from "./tabs/ContratosFacturasTab";

const TABS = [
  { id: "pagos-recobros", label: "Pagos y Recobros", icon: Wallet, component: PagosRecobrosTab },
  { id: "contratos-facturas", label: "Contratos y Facturas", icon: FileText, component: ContratosFacturasTab },
];

export default function AdministracionPage() {
  const [active, setActive] = useState<string>(TABS[0].id);
  const Active = TABS.find((t) => t.id === active)?.component ?? PagosRecobrosTab;

  return (
    <div className="space-y-6 -mt-2">
      {/* Header simple */}
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
          <Briefcase size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-500">Paneles de gestión administrativa y financiera</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                isActive
                  ? "border-amber-500 text-amber-700 bg-amber-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="pt-2">
        <Active />
      </div>
    </div>
  );
}
