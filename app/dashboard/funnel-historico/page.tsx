"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { swr } from "@/lib/cached-fetch";
import { distribute } from "@/lib/distribute-untracked";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine } from "recharts";

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

export default function HistoricoPage() {
  const [data, setData] = useState<EdicionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cancel = swr<any>("/api/funnel/historico", (d) => {
      const eds = d.ediciones ?? [];
      setData(eds);
      setSelected(new Set(["Media", ...eds.map((e: EdicionData) => e.edicion)]));
      setLoading(false);
    });
    return cancel;
  }, []);

  // Closed editions = all except last (en curso)
  const closed = useMemo(() => data.length > 1 ? data.slice(0, -1) : [], [data]);
  const closedCount = closed.length;

  // Media from aggregated totals
  const media = useMemo(() => {
    if (closedCount === 0) return { leads: 0, agendas: 0, agendasUnicas: 0, ventas: 0, ra: 0, cl: 0, cv: 0 };
    const sL = closed.reduce((s, d) => s + d.leads, 0);
    const sA = closed.reduce((s, d) => s + d.agendas, 0);
    const sAU = closed.reduce((s, d) => s + d.agendasUnicas, 0);
    const sV = closed.reduce((s, d) => s + d.ventas, 0);
    return {
      leads: Math.round(sL / closedCount),
      agendas: Math.round(sA / closedCount),
      agendasUnicas: Math.round(sAU / closedCount),
      ventas: Math.round(sV / closedCount),
      ra: sL > 0 ? (sAU / sL) * 100 : 0,
      cl: sAU > 0 ? (sV / sAU) * 100 : 0,
      cv: sL > 0 ? (sV / sL) * 100 : 0,
    };
  }, [closed, closedCount]);

  function toggleEdicion(ed: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ed)) { if (next.size > 2) next.delete(ed); }
      else next.add(ed);
      return next;
    });
  }

  // Filtered data for comparador
  const filteredData = useMemo(() => data.filter((d) => selected.has(d.edicion)), [data, selected]);
  const showMedia = selected.has("Media");

  // Reference base for matrix: Media if selected, else oldest selected edition
  const refBase = useMemo(() => {
    if (showMedia) return { ra: media.ra, cl: media.cl, cv: media.cv, label: "Media" };
    const oldest = filteredData[0];
    if (!oldest) return { ra: 0, cl: 0, cv: 0, label: "" };
    return { ra: parseFloat(oldest.convLeadAgenda), cl: parseFloat(oldest.convAgendaVenta), cv: parseFloat(oldest.convLeadVenta), label: oldest.edicion };
  }, [showMedia, media, filteredData]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div>;
  }

  const cellClass = (v: number) => v > 0.05 ? "bg-sky-50 text-sky-700" : v < -0.05 ? "bg-orange-50 text-orange-700" : "bg-gray-50 text-gray-400";
  const fmtVar = (v: number) => v > 0.05 ? `+${v.toFixed(1)} pp` : v < -0.05 ? `${v.toFixed(1)} pp` : "—";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historico cruce de ventas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Evolucion del embudo por ediciones</p>
      </div>

      {/* ── Tabla resumen ── */}
      {(() => {
        return (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full" style={{ fontSize: "11px" }}>
              <thead>
                <tr className="bg-gray-800"><td colSpan={7} className="px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">Resumen por edicion</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Edicion</th>
                  <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Leads</th>
                  <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Agendas</th>
                  <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Ventas</th>
                  <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Ratio agenda</th>
                  <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Cierre</th>
                  <th className="text-right px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Conv. lead</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, idx) => {
                  const isEnCurso = idx === data.length - 1;
                  return (
                    <tr key={d.edicion} className={`border-t border-gray-50 ${isEnCurso ? "bg-amber-50/30" : "hover:bg-gray-50/50"}`}>
                      <td className="px-3 py-0.5 text-xs font-semibold text-gray-700">{d.edicion}{isEnCurso && <span className="text-[9px] font-normal text-amber-500 ml-1">en curso</span>}</td>
                      <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{d.leads.toLocaleString("es-ES")}</td>
                      <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{d.agendasUnicas} <span className="text-[9px] font-normal text-gray-400">({d.agendas})</span></td>
                      <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{d.ventas}</td>
                      <td className="text-right px-2 py-0.5 text-xs font-semibold text-sky-600">{d.convLeadAgenda}%</td>
                      <td className="text-right px-2 py-0.5 text-xs font-semibold text-violet-600">{d.convAgendaVenta}%</td>
                      <td className="text-right px-3 py-0.5 text-xs font-semibold text-amber-600">{d.convLeadVenta}%</td>
                    </tr>
                  );
                })}
                {closedCount > 0 && (
                  <tr className="bg-indigo-50/60 border-t-2 border-indigo-200">
                    <td className="px-3 py-0.5 text-xs font-black text-indigo-700">Media <span className="font-normal text-indigo-400">({closedCount} ed.)</span></td>
                    <td className="text-right px-2 py-0.5 text-xs font-bold text-indigo-900">{media.leads.toLocaleString("es-ES")}</td>
                    <td className="text-right px-2 py-0.5 text-xs font-bold text-indigo-900">{media.agendasUnicas} <span className="text-[9px] font-normal text-indigo-400">({media.agendas})</span></td>
                    <td className="text-right px-2 py-0.5 text-xs font-bold text-indigo-900">{media.ventas}</td>
                    <td className="text-right px-2 py-0.5 text-xs font-black text-indigo-600">{media.ra.toFixed(1)}%</td>
                    <td className="text-right px-2 py-0.5 text-xs font-black text-indigo-600">{media.cl.toFixed(1)}%</td>
                    <td className="text-right px-3 py-0.5 text-xs font-black text-indigo-600">{media.cv.toFixed(1)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── Comparador de lanzamientos ── */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-indigo-800 px-3 py-1">
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Comparador de lanzamientos</span>
        </div>

        {/* Selector de ediciones */}
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-400 uppercase mr-1">Ediciones:</span>
          <button onClick={() => toggleEdicion("Media")}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${selected.has("Media") ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-indigo-100"}`}>
            Media
          </button>
          {data.map((d, idx) => {
            const isEnCurso = idx === data.length - 1;
            const isOn = selected.has(d.edicion);
            return (
              <button key={d.edicion} onClick={() => toggleEdicion(d.edicion)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${isOn ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"} ${isEnCurso && isOn ? "ring-1 ring-amber-400" : ""}`}>
                {d.edicion.replace(" 2025", " 25").replace(" 2026", " 26")}{isEnCurso ? " ●" : ""}
              </button>
            );
          })}
        </div>

        {/* Herramienta 1 — Lineas de ratios */}
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Ratios por edicion</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={filteredData.map((d) => ({
              ed: d.edicion.replace(" 2025", " 25").replace(" 2026", " 26"),
              "Ratio agenda": parseFloat(d.convLeadAgenda),
              "Cierre llamada": parseFloat(d.convAgendaVenta),
              "Conv. lead": parseFloat(d.convLeadVenta),
            }))}>
              <XAxis dataKey="ed" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" domain={[0, "auto"]} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-2 py-1.5 text-[10px]">
                    <p className="font-bold text-gray-700 mb-0.5">{label}</p>
                    {payload.map((p) => <p key={String(p.dataKey)} style={{ color: p.color }}>{String(p.dataKey)}: {p.value}%</p>)}
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {showMedia && <ReferenceLine y={media.ra} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1} />}
              {showMedia && <ReferenceLine y={media.cl} stroke="#8b5cf6" strokeDasharray="4 4" strokeWidth={1} />}
              {showMedia && <ReferenceLine y={media.cv} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />}
              <Line type="monotone" dataKey="Ratio agenda" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Cierre llamada" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Conv. lead" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Herramienta 2 — Barras agrupadas */}
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Ratios por edicion (barras)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={filteredData.map((d) => ({
              ed: d.edicion.replace(" 2025", " 25").replace(" 2026", " 26"),
              "Ratio agenda": parseFloat(d.convLeadAgenda),
              "Cierre llamada": parseFloat(d.convAgendaVenta),
              "Conv. lead": parseFloat(d.convLeadVenta),
            }))} barCategoryGap="20%">
              <XAxis dataKey="ed" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-2 py-1.5 text-[10px]">
                    <p className="font-bold text-gray-700 mb-0.5">{label}</p>
                    {payload.map((p) => <p key={String(p.dataKey)} style={{ color: p.color }}>{String(p.dataKey)}: {p.value}%</p>)}
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Ratio agenda" radius={[3, 3, 0, 0]} fill="#0ea5e9" />
              <Bar dataKey="Cierre llamada" radius={[3, 3, 0, 0]} fill="#8b5cf6" />
              <Bar dataKey="Conv. lead" radius={[3, 3, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Herramienta 3 — Matriz de incrementos */}
        <div className="px-3 py-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Variacion vs {refBase.label} <span className="font-normal">(puntos porcentuales)</span></p>
          <table className="w-full" style={{ fontSize: "11px" }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                <th className="text-left px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase">Edicion</th>
                <th className="text-right px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase">Ratio agenda</th>
                <th className="text-right px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase">Cierre llamada</th>
                <th className="text-right px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase">Conv. lead</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((d) => {
                const isEnCurso = d.edicion === data[data.length - 1]?.edicion;
                const ra = parseFloat(d.convLeadAgenda);
                const cl = parseFloat(d.convAgendaVenta);
                const cv = parseFloat(d.convLeadVenta);
                const vRa = ra - refBase.ra;
                const vCl = cl - refBase.cl;
                const vCv = cv - refBase.cv;
                return (
                  <tr key={d.edicion} className={`border-t border-gray-50 ${isEnCurso ? "bg-amber-50/20" : ""}`}>
                    <td className="px-2 py-0.5 text-xs font-semibold text-gray-700">{isEnCurso ? <span className="italic text-amber-600">{d.edicion} <span className="text-[8px] font-normal">●</span></span> : d.edicion}</td>
                    <td className={`text-right px-2 py-0.5 text-xs font-bold ${cellClass(vRa)}`}>{fmtVar(vRa)}</td>
                    <td className={`text-right px-2 py-0.5 text-xs font-bold ${cellClass(vCl)}`}>{fmtVar(vCl)}</td>
                    <td className={`text-right px-2 py-0.5 text-xs font-bold ${cellClass(vCv)}`}>{fmtVar(vCv)}</td>
                  </tr>
                );
              })}
              {/* Referencia */}
              <tr className="border-t-2 border-indigo-200 bg-indigo-50/40">
                <td className="px-2 py-0.5 text-xs font-black text-indigo-700">{refBase.label}</td>
                <td className="text-right px-2 py-0.5 text-xs font-bold text-indigo-600">{refBase.ra.toFixed(1)}%</td>
                <td className="text-right px-2 py-0.5 text-xs font-bold text-indigo-600">{refBase.cl.toFixed(1)}%</td>
                <td className="text-right px-2 py-0.5 text-xs font-bold text-indigo-600">{refBase.cv.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
