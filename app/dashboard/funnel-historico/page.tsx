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
      {(() => {
        // Ediciones cerradas = todas menos la ultima (la en curso)
        const closed = data.length > 1 ? data.slice(0, -1) : [];
        const closedCount = closed.length;
        const avgLeads = closedCount > 0 ? Math.round(closed.reduce((s, d) => s + d.leads, 0) / closedCount) : 0;
        const avgAgendas = closedCount > 0 ? Math.round(closed.reduce((s, d) => s + d.agendas, 0) / closedCount) : 0;
        const avgAgendasUnicas = closedCount > 0 ? Math.round(closed.reduce((s, d) => s + d.agendasUnicas, 0) / closedCount) : 0;
        const avgVentas = closedCount > 0 ? Math.round(closed.reduce((s, d) => s + d.ventas, 0) / closedCount) : 0;
        // Ratios desde totales agregados (no media de medias)
        const sumLeads = closed.reduce((s, d) => s + d.leads, 0);
        const sumAgendasU = closed.reduce((s, d) => s + d.agendasUnicas, 0);
        const sumVentas = closed.reduce((s, d) => s + d.ventas, 0);
        const ratioAgenda = sumLeads > 0 ? ((sumAgendasU / sumLeads) * 100).toFixed(1) : "0";
        const cierreLlamada = sumAgendasU > 0 ? ((sumVentas / sumAgendasU) * 100).toFixed(1) : "0";
        const convLead = sumLeads > 0 ? ((sumVentas / sumLeads) * 100).toFixed(1) : "0";

        return (<>
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
              <tbody>
                {/* Filas por edicion */}
                {data.map((d, idx) => {
                  const isEnCurso = idx === data.length - 1;
                  return (
                    <tr key={d.edicion} className={`border-t border-gray-50 hover:bg-gray-50/50 transition-colors ${isEnCurso ? "bg-amber-50/30" : ""}`}>
                      <td className="px-6 py-3.5 text-sm font-semibold text-gray-700">
                        {d.edicion}
                        {isEnCurso && <span className="text-[10px] font-normal text-amber-500 ml-2">en curso</span>}
                      </td>
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
                  );
                })}
                {/* Fila media — referencia de ediciones cerradas */}
                {closedCount > 0 && (
                  <tr className="bg-indigo-50/60 border-t-2 border-indigo-200">
                    <td className="px-6 py-3 text-sm font-black text-indigo-700">Media <span className="text-xs font-normal text-indigo-400">({closedCount} ed. cerradas)</span></td>
                    <td className="text-right px-4 py-3 text-sm font-bold text-indigo-900">{avgLeads.toLocaleString("es-ES")}</td>
                    <td className="text-right px-4 py-3 text-sm font-bold text-indigo-900">
                      {avgAgendasUnicas}
                      <span className="text-xs font-normal text-indigo-400 ml-1">({avgAgendas})</span>
                    </td>
                    <td className="text-right px-4 py-3 text-sm font-bold text-indigo-900">{avgVentas}</td>
                    <td className="text-right px-4 py-3 text-sm font-black text-indigo-600">{ratioAgenda}%</td>
                    <td className="text-right px-4 py-3 text-sm font-black text-indigo-600">{cierreLlamada}%</td>
                    <td className="text-right px-6 py-3 text-sm font-black text-indigo-600">{convLead}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Matriz de variaciones vs media */}
          {closedCount > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden mt-2">
              <table className="w-full" style={{ fontSize: "11px" }}>
                <thead>
                  <tr className="bg-gray-800"><td colSpan={4} className="px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">Variacion vs media</td></tr>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Edicion</th>
                    <th className="text-right px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Ratio agenda</th>
                    <th className="text-right px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Cierre llamada</th>
                    <th className="text-right px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Conv. lead</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, idx) => {
                    const isEnCurso = idx === data.length - 1;
                    const ra = parseFloat(d.convLeadAgenda);
                    const cl = parseFloat(d.convAgendaVenta);
                    const cv = parseFloat(d.convLeadVenta);
                    const mediaRa = parseFloat(ratioAgenda);
                    const mediaCl = parseFloat(cierreLlamada);
                    const mediaCv = parseFloat(convLead);

                    const varRa = mediaRa > 0 ? ((ra - mediaRa) / mediaRa) * 100 : 0;
                    const varCl = mediaCl > 0 ? ((cl - mediaCl) / mediaCl) * 100 : 0;
                    const varCv = mediaCv > 0 ? ((cv - mediaCv) / mediaCv) * 100 : 0;

                    const cellClass = (v: number) =>
                      v > 0.5 ? "bg-emerald-50 text-emerald-700" :
                      v < -0.5 ? "bg-red-50 text-red-700" :
                      "bg-gray-50 text-gray-400";
                    const fmtVar = (v: number) => v > 0 ? `+${v.toFixed(1)}%` : v < 0 ? `${v.toFixed(1)}%` : "—";

                    return (
                      <tr key={d.edicion} className={`border-t border-gray-100 ${isEnCurso ? "bg-amber-50/20" : ""}`}>
                        <td className="px-3 py-0.5 text-xs font-semibold text-gray-700">
                          {isEnCurso ? <span className="italic text-amber-600">{d.edicion} <span className="text-[9px] font-normal">en curso</span></span> : d.edicion}
                        </td>
                        <td className={`text-right px-3 py-0.5 text-xs font-bold ${cellClass(varRa)}`}>{fmtVar(varRa)}</td>
                        <td className={`text-right px-3 py-0.5 text-xs font-bold ${cellClass(varCl)}`}>{fmtVar(varCl)}</td>
                        <td className={`text-right px-3 py-0.5 text-xs font-bold ${cellClass(varCv)}`}>{fmtVar(varCv)}</td>
                      </tr>
                    );
                  })}
                  {/* Fila media referencia */}
                  <tr className="border-t-2 border-indigo-200 bg-indigo-50/40">
                    <td className="px-3 py-0.5 text-xs font-black text-indigo-700">Media <span className="font-normal text-indigo-400">({closedCount} ed.)</span></td>
                    <td className="text-right px-3 py-0.5 text-xs font-bold text-indigo-600">{ratioAgenda}%</td>
                    <td className="text-right px-3 py-0.5 text-xs font-bold text-indigo-600">{cierreLlamada}%</td>
                    <td className="text-right px-3 py-0.5 text-xs font-bold text-indigo-600">{convLead}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>);
      })()}

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
