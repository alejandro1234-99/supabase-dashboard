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

                    // Diferencia en puntos porcentuales (no relativa)
                    const varRa = ra - mediaRa;
                    const varCl = cl - mediaCl;
                    const varCv = cv - mediaCv;

                    const cellClass = (v: number) =>
                      v > 0.05 ? "bg-emerald-50 text-emerald-700" :
                      v < -0.05 ? "bg-red-50 text-red-700" :
                      "bg-gray-50 text-gray-400";
                    const fmtVar = (v: number) => v > 0.05 ? `+${v.toFixed(1)} pp` : v < -0.05 ? `${v.toFixed(1)} pp` : "—";

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

    </div>
  );
}

