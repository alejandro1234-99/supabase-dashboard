"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { swr } from "@/lib/cached-fetch";
import { distribute } from "@/lib/distribute-untracked";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

type SourceBreakdown = {
  Paid: number;
  Organico: number;
  Afiliados: number;
  Untracked: number;
};

type EdicionData = {
  edicion: string;
  leads: number;
  agendas: number;
  agendasUnicas: number;
  ventas: number;
  cash: number;
  convLeadAgenda: string;
  convAgendaVenta: string;
  convLeadVenta: string;
  leadsBySource: SourceBreakdown;
  agendasBySource: SourceBreakdown;
  ventasBySource: SourceBreakdown;
};

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function HistoricoPage() {
  const [data, setData] = useState<EdicionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cancel = swr<any>("/api/funnel/historico", (d) => {
      setData(d.ediciones ?? []);
      setLoading(false);
    });
    return cancel;
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Chart data
  const funnelData = data.map((d) => ({
    edicion: d.edicion,
    Leads: d.leads,
    Agendas: d.agendasUnicas,
    Ventas: d.ventas,
  }));

  const conversionData = data.map((d) => ({
    edicion: d.edicion,
    "Ratio agenda": parseFloat(d.convLeadAgenda),
    "Cierre llamada": parseFloat(d.convAgendaVenta),
    "Conv. lead → venta": parseFloat(d.convLeadVenta),
  }));

  const sourceLeadsData = data.map((d) => ({
    edicion: d.edicion,
    Paid: d.leadsBySource.Paid,
    Organico: d.leadsBySource.Organico,
    Afiliados: d.leadsBySource.Afiliados,
    Untracked: d.leadsBySource.Untracked,
  }));

  // Adjusted source data (untracked distributed)
  function adjustSource(src: SourceBreakdown): { Paid: number; Organico: number; Afiliados: number } {
    const tracked = [
      { key: "Paid", value: src.Paid },
      { key: "Organico", value: src.Organico },
      { key: "Afiliados", value: src.Afiliados },
    ];
    const adj = distribute(tracked, src.Untracked);
    return {
      Paid: adj.find((a) => a.key === "Paid")?.adjusted ?? 0,
      Organico: adj.find((a) => a.key === "Organico")?.adjusted ?? 0,
      Afiliados: adj.find((a) => a.key === "Afiliados")?.adjusted ?? 0,
    };
  }

  const adjSourceLeadsData = data.map((d) => ({ edicion: d.edicion, ...adjustSource(d.leadsBySource) }));
  const adjSourceVentasData = data.map((d) => ({ edicion: d.edicion, ...adjustSource(d.ventasBySource) }));

  const sourceVentasData = data.map((d) => ({
    edicion: d.edicion,
    Paid: d.ventasBySource.Paid,
    Organico: d.ventasBySource.Organico,
    Afiliados: d.ventasBySource.Afiliados,
    Untracked: d.ventasBySource.Untracked,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historico cruce de ventas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Evolucion del embudo por ediciones</p>
      </div>

      {/* Tabla resumen */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Edicion</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Leads</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Agendas</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ratio agenda</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cierre</th>
              <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Conv. lead</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((d) => (
              <tr key={d.edicion} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-3.5 text-sm font-semibold text-gray-700">{d.edicion}</td>
                <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{d.leads.toLocaleString("es-ES")}</td>
                <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">
                  {d.agendasUnicas}
                  <span className="text-xs font-normal text-gray-400 ml-1">({d.agendas})</span>
                </td>
                <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{d.ventas}</td>
                <td className="text-right px-4 py-3.5 text-sm font-semibold text-emerald-600">{d.convLeadAgenda}%</td>
                <td className="text-right px-4 py-3.5 text-sm font-semibold text-indigo-600">{d.convAgendaVenta}%</td>
                <td className="text-right px-6 py-3.5 text-sm font-semibold text-amber-600">{d.convLeadVenta}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Embudo por edicion */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Embudo por edicion</h2>
          <p className="text-xs text-gray-400 mb-4">Leads, agendas unicas y ventas</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnelData} barCategoryGap="25%">
              <XAxis dataKey="edicion" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{label}</p>
                      {payload.map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color }}>
                          {String(p.dataKey)}: {Number(p.value).toLocaleString("es-ES")}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Leads" radius={[4, 4, 0, 0]} fill="#10b981" />
              <Bar dataKey="Agendas" radius={[4, 4, 0, 0]} fill="#6366f1" />
              <Bar dataKey="Ventas" radius={[4, 4, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasas de conversion */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Ratios de conversion</h2>
          <p className="text-xs text-gray-400 mb-4">Evolucion por edicion</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={conversionData}>
              <XAxis dataKey="edicion" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{label}</p>
                      {payload.map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color }}>
                          {String(p.dataKey)}: {p.value}%
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Ratio agenda" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Cierre llamada" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Conv. lead → venta" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leads y ventas por fuente */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Leads por fuente</h2>
          <p className="text-xs text-gray-400 mb-4">Distribucion por edicion</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sourceLeadsData} barCategoryGap="25%">
              <XAxis dataKey="edicion" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{label}</p>
                      {payload.map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color }}>
                          {String(p.dataKey)}: {Number(p.value).toLocaleString("es-ES")}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Paid" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Organico" stackId="a" fill="#10b981" />
              <Bar dataKey="Afiliados" stackId="a" fill="#a855f7" />
              <Bar dataKey="Untracked" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Ventas por fuente</h2>
          <p className="text-xs text-gray-400 mb-4">Distribucion por edicion</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sourceVentasData} barCategoryGap="25%">
              <XAxis dataKey="edicion" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{label}</p>
                      {payload.map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color }}>
                          {String(p.dataKey)}: {String(p.value)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Paid" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Organico" stackId="a" fill="#10b981" />
              <Bar dataKey="Afiliados" stackId="a" fill="#a855f7" />
              <Bar dataKey="Untracked" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Adjusted charts */}
      <p className="text-xs text-gray-400 mt-4">Datos ajustados (untracked distribuido proporcionalmente)</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Leads por fuente (ajustado)</h2>
          <p className="text-xs text-gray-400 mb-4">Sin untracked — distribuido</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={adjSourceLeadsData} barCategoryGap="25%">
              <XAxis dataKey="edicion" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "#f3f4f6" }} content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-700 mb-1">{label}</p>
                    {payload.map((p) => <p key={String(p.dataKey)} style={{ color: p.color }}>{String(p.dataKey)}: {Number(p.value).toLocaleString("es-ES")}</p>)}
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Paid" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Organico" stackId="a" fill="#10b981" />
              <Bar dataKey="Afiliados" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Ventas por fuente (ajustado)</h2>
          <p className="text-xs text-gray-400 mb-4">Sin untracked — distribuido</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={adjSourceVentasData} barCategoryGap="25%">
              <XAxis dataKey="edicion" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "#f3f4f6" }} content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-700 mb-1">{label}</p>
                    {payload.map((p) => <p key={String(p.dataKey)} style={{ color: p.color }}>{String(p.dataKey)}: {String(p.value)}</p>)}
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Paid" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Organico" stackId="a" fill="#10b981" />
              <Bar dataKey="Afiliados" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
