"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, Shield, Lock, Unlock, Save } from "lucide-react";

type Permission = {
  user_id: string;
  email: string;
  name: string;
  allowed_routes: string[];
  is_super_admin: boolean;
};

const ALL_PANELS = [
  { group: "1 · Cruce de ventas", items: [
    { route: "/dashboard/funnel", label: "Cruce de ventas" },
    { route: "/dashboard/funnel-historico", label: "Historico" },
  ]},
  { group: "2 · Panel de producto", items: [
    { route: "/dashboard/reembolsos", label: "Reembolsos" },
    { route: "/dashboard/reviews", label: "Reviews" },
    { route: "/dashboard/feedback", label: "NPS Formacion" },
    { route: "/dashboard/arp", label: "Certificados ARP" },
    { route: "/dashboard/vimeo", label: "Consumo Vimeo" },
    { route: "/dashboard/circle", label: "Circle" },
    { route: "/dashboard/exitos", label: "Casos de Exito" },
    { route: "/dashboard/soporte", label: "Soporte" },
  ]},
  { group: "3 · Operativa producto", items: [
    { route: "/dashboard/onboardings", label: "Onboardings" },
    { route: "/dashboard/gestion-exitos", label: "Gestion Casos de Exito" },
    { route: "/dashboard/qa", label: "Q&A Pipeline" },
    { route: "/dashboard/jobs", label: "Banco de Empleo" },
    { route: "/dashboard/documentos", label: "Documentos y Accesos" },
    { route: "/dashboard/workshops", label: "Workshops" },
    { route: "/dashboard/permisos", label: "Permisos" },
  ]},
];

export default function PermisosPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, string[]>>({});

  const fetchPermissions = useCallback(async () => {
    const res = await fetch("/api/permissions");
    const data = await res.json();
    setPermissions(data.permissions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  function toggleRoute(userId: string, route: string, currentRoutes: string[]) {
    const updated = currentRoutes.includes(route)
      ? currentRoutes.filter((r) => r !== route)
      : [...currentRoutes, route];
    setDirty((prev) => ({ ...prev, [userId]: updated }));
  }

  function toggleGroup(userId: string, groupRoutes: string[], currentRoutes: string[]) {
    const allEnabled = groupRoutes.every((r) => currentRoutes.includes(r));
    const updated = allEnabled
      ? currentRoutes.filter((r) => !groupRoutes.includes(r))
      : [...new Set([...currentRoutes, ...groupRoutes])];
    setDirty((prev) => ({ ...prev, [userId]: updated }));
  }

  async function saveUser(userId: string) {
    const routes = dirty[userId];
    if (!routes) return;
    setSaving(userId);
    await fetch("/api/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, allowed_routes: routes }),
    });
    setPermissions((prev) => prev.map((p) => p.user_id === userId ? { ...p, allowed_routes: routes } : p));
    setDirty((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-500" /> Gestor de permisos
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Controla el acceso de cada usuario a los paneles del dashboard</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full" style={{ fontSize: "12px" }}>
          <thead>
            <tr className="bg-amber-700">
              <td colSpan={permissions.length + 1} className="px-4 py-1 text-[10px] font-bold text-white uppercase tracking-widest">Permisos por panel</td>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50/60">
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase w-[200px]">Panel</th>
              {permissions.map((p) => (
                <th key={p.user_id} className="text-center px-4 py-3 border-l border-gray-100">
                  <div className="text-sm font-bold text-gray-800">{p.name || p.email.split("@")[0]}</div>
                  <div className="text-[10px] text-gray-400 font-normal">{p.email}</div>
                  {p.is_super_admin && <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full uppercase">Super Admin</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PANELS.map((group) => {
              const groupRoutes = group.items.map((i) => i.route);
              return (
                <React.Fragment key={group.group}>
                  <tr className="bg-gray-50/80">
                    <td className="px-4 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{group.group}</td>
                    {permissions.map((p) => {
                      if (p.is_super_admin) return <td key={p.user_id} className="border-l border-gray-100" />;
                      const routes = dirty[p.user_id] ?? p.allowed_routes;
                      const allOn = groupRoutes.every((r) => routes.includes(r));
                      const someOn = groupRoutes.some((r) => routes.includes(r));
                      return (
                        <td key={p.user_id} className="text-center border-l border-gray-100">
                          <button
                            onClick={() => toggleGroup(p.user_id, groupRoutes, routes)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${allOn ? "text-emerald-600 hover:text-red-500" : someOn ? "text-amber-500 hover:text-emerald-600" : "text-gray-300 hover:text-emerald-600"}`}
                          >
                            {allOn ? "todo" : someOn ? "parcial" : "nada"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  {group.items.map((item) => (
                    <tr key={item.route} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-1.5 pl-8 text-xs text-gray-600">{item.label}</td>
                      {permissions.map((p) => {
                        if (p.is_super_admin) {
                          return (
                            <td key={p.user_id} className="text-center border-l border-gray-100">
                              <Unlock className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                            </td>
                          );
                        }
                        const routes = dirty[p.user_id] ?? p.allowed_routes;
                        const enabled = routes.includes(item.route);
                        return (
                          <td key={p.user_id} className="text-center border-l border-gray-100">
                            <button
                              onClick={() => toggleRoute(p.user_id, item.route, routes)}
                              className="p-1 rounded-lg transition-all hover:bg-gray-100"
                            >
                              {enabled
                                ? <Unlock className="h-4 w-4 text-emerald-500" />
                                : <Lock className="h-4 w-4 text-red-300" />
                              }
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save buttons */}
      <div className="flex gap-3">
        {permissions.filter((p) => !p.is_super_admin && dirty[p.user_id]).map((p) => (
          <button
            key={p.user_id}
            onClick={() => saveUser(p.user_id)}
            disabled={saving === p.user_id}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 transition-all disabled:opacity-50"
          >
            {saving === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
