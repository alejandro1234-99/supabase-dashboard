"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { swr, invalidateCache } from "@/lib/cached-fetch";
import { Loader2, Users, CalendarDays, ShoppingCart, ChevronDown, TrendingUp, Plus, Save, Edit3, Trash2, X, FileText, Lightbulb, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Stats = {
  totalLeads: number;
  totalAgendas: number;
  agendasUnicas: number;
  totalVentas: number;
  convLeadAgenda: string;
  convAgendaVenta: string;
  convLeadVenta: string;
};

type SourceRow = {
  source: string;
  leads: number;
  leadsPct: string;
  agendas: number;
  agendasUnicas: number;
  agendasPct: string;
  ventas: number;
  ventasPct: string;
};

type PaidCampaignRow = {
  campaign: string;
  leads: number;
  leadsPct: string;
  agendas: number;
  agendasUnicas: number;
  agendasPct: string;
  ventas: number;
  ventasPct: string;
  ratioAgenda: string;
  ratioVenta: string;
  cierreAgenda: string;
};

type PaidMedia = {
  totalLeads: number;
  totalAgendas: number;
  totalVentas: number;
  campaigns: PaidCampaignRow[];
};

type AffiliateRow = {
  affiliate: string;
  leads: number;
  leadsPct: string;
  agendas: number;
  agendasUnicas: number;
  agendasPct: string;
  ventas: number;
  ventasPct: string;
};

type AffiliateMedia = {
  totalLeads: number;
  totalAgendas: number;
  totalVentas: number;
  types: AffiliateRow[];
};

type ComercialRow = {
  comercial: string;
  agendas: number;
  agendasUnicas: number;
  ventas: number;
  cierre: string;
  paidAV0Agendas: number;
  paidAV2Agendas: number;
  paidAV0Ventas: number;
  paidAV2Ventas: number;
  cierreAV0: string;
  cierreAV2: string;
  orgAgendas: number;
  orgVentas: number;
  cierreOrg: string;
  untrackedAgendas: number;
  untrackedVentas: number;
  cierreUntracked: string;
};

const SOURCE_COLORS: Record<string, string> = {
  Paid: "bg-blue-500",
  Organico: "bg-emerald-500",
  Afiliados: "bg-purple-500",
  Untracked: "bg-gray-400",
};

const SOURCE_TEXT: Record<string, string> = {
  Paid: "text-blue-600",
  Organico: "text-emerald-600",
  Afiliados: "text-purple-600",
  Untracked: "text-gray-500",
};

export default function FunnelPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [paidMedia, setPaidMedia] = useState<PaidMedia | null>(null);
  const [affiliateMedia, setAffiliateMedia] = useState<AffiliateMedia | null>(null);
  const [comerciales, setComerciales] = useState<ComercialRow[]>([]);
  const [timeline, setTimeline] = useState<{ date: string; ventas: number; agendasCreadas: number; llamadas: number }[]>([]);
  const [closerPerformance, setCloserPerformance] = useState<{
    closer: string; llamadas: number; noShows: number; celebradas: number; ventas: number; cierre: string;
    days: { date: string; llamadas: number; noShows: number; celebradas: number; ventas: number }[];
  }[]>([]);
  const [notas, setNotas] = useState<{ id: string; titulo: string; contenido: string; tipo: string; created_at: string }[]>([]);
  const [showNewNota, setShowNewNota] = useState(false);
  const [newTitulo, setNewTitulo] = useState("");
  const [newContenido, setNewContenido] = useState("");
  const [newTipo, setNewTipo] = useState("conclusion");
  const [editingNotaId, setEditingNotaId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editContenido, setEditContenido] = useState("");
  const [editTipo, setEditTipo] = useState("conclusion");
  const [ediciones, setEdiciones] = useState<string[]>([]);
  const [edicionFilter, setEdicionFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const MONTH_ORDER: Record<string, number> = {
      Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
      Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
    };
    function edicionToDate(ed: string): number {
      const parts = ed.split(" ");
      const month = MONTH_ORDER[parts[0]] ?? 0;
      const year = parseInt(parts[1] ?? "0");
      return year * 100 + month;
    }

    fetch("/api/funnel/ediciones")
      .then((r) => r.json())
      .then((d) => {
        const eds = (d.ediciones ?? []) as string[];
        eds.sort((a, b) => edicionToDate(a) - edicionToDate(b));
        setEdiciones(eds);
        if (eds.length > 0) setEdicionFilter(eds[eds.length - 1]);
        setInitialized(true);
      });
  }, []);

  const cancelRef = useRef<(() => void)[]>([]);

  const fetchData = useCallback(() => {
    if (!edicionFilter) return;
    // Cancel previous SWR subscriptions
    cancelRef.current.forEach((c) => c());
    cancelRef.current = [];

    const funnelUrl = `/api/funnel?edicion=${encodeURIComponent(edicionFilter)}`;
    const notasUrl = `/api/notas?edicion=${encodeURIComponent(edicionFilter)}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelRef.current.push(swr<any>(funnelUrl, (d, isStale) => {
      setStats(d.stats);
      setSources(d.sources ?? []);
      setPaidMedia(d.paidMedia ?? null);
      setAffiliateMedia(d.affiliateMedia ?? null);
      setComerciales(d.comerciales ?? []);
      setTimeline(d.timeline ?? []);
      setCloserPerformance(d.closerPerformance ?? []);
      if (!isStale) setLoading(false);
      else setLoading(false); // Show stale data, no spinner
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelRef.current.push(swr<any>(notasUrl, (d) => {
      setNotas(d.data ?? []);
    }));
  }, [edicionFilter]);

  useEffect(() => { if (initialized) fetchData(); }, [fetchData, initialized]);

  async function handleCreateNota() {
    if (!newTitulo.trim() || !edicionFilter) return;
    await fetch("/api/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edicion: edicionFilter, titulo: newTitulo, contenido: newContenido, tipo: newTipo }),
    });
    setNewTitulo(""); setNewContenido(""); setNewTipo("conclusion"); setShowNewNota(false);
    invalidateCache("/api/notas"); fetchData();
  }

  async function handleUpdateNota(id: string) {
    await fetch("/api/notas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, titulo: editTitulo, contenido: editContenido, tipo: editTipo }),
    });
    setEditingNotaId(null);
    invalidateCache("/api/notas"); fetchData();
  }

  async function handleDeleteNota(id: string) {
    await fetch(`/api/notas?id=${id}`, { method: "DELETE" });
    invalidateCache("/api/notas"); fetchData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cruce de ventas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Embudo completo: Leads → Agendas → Ventas</p>
      </div>

      {/* Selector de edición */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Selecciona la edicion</p>
        <div className="flex items-center gap-2 flex-wrap">
          {ediciones.map((ed) => (
            <button
              key={ed}
              onClick={() => setEdicionFilter(ed)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${edicionFilter === ed
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.02]"
                : "bg-gray-50 border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {ed}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : stats && (
        <>
          {/* Resumen general */}
          <h2 className="text-lg font-bold text-gray-900">1. Resumen general</h2>

          <div className="flex gap-6">
            {/* Funnel visual — izquierda */}
            <div className="flex flex-col items-center gap-0 w-64 shrink-0">
              <div className="w-full bg-emerald-500 rounded-3xl border-2 border-white shadow-sm px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[11px] font-semibold text-white/70 uppercase">Leads</span>
                </div>
                <p className="text-lg font-black text-white">{stats.totalLeads.toLocaleString("es-ES")}</p>
              </div>

              <div className="py-1 flex items-center gap-1">
                <ChevronDown className="h-3 w-3 text-gray-300" />
                <span className="text-[10px] font-bold text-emerald-600">{stats.convLeadAgenda}%</span>
              </div>

              <div className="w-[78%] bg-indigo-500 rounded-3xl border-2 border-white shadow-sm px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[11px] font-semibold text-white/70 uppercase">Agendas</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{stats.agendasUnicas}</p>
                  <p className="text-[9px] text-white/60">{stats.totalAgendas} totales</p>
                </div>
              </div>

              <div className="py-1 flex items-center gap-1">
                <ChevronDown className="h-3 w-3 text-gray-300" />
                <span className="text-[10px] font-bold text-indigo-600">{stats.convAgendaVenta}%</span>
              </div>

              <div className="w-[54%] bg-amber-400 rounded-3xl border-2 border-white shadow-sm px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[11px] font-semibold text-white/70 uppercase">Ventas</span>
                </div>
                <p className="text-lg font-black text-white">{stats.totalVentas}</p>
              </div>
            </div>

            {/* Tarjetas KPI — derecha */}
            <div className="flex-1 grid grid-cols-2 gap-4 content-start">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Leads</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalLeads.toLocaleString("es-ES")}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Agendas unicas</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{stats.agendasUnicas} <span className="text-sm font-medium text-gray-400">{stats.totalAgendas} totales</span></p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ventas</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalVentas}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Conv. Lead → Venta</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{stats.convLeadVenta}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Actividad diaria */}
          <>
            <h2 className="text-lg font-bold text-gray-900 mt-2">2. Actividad diaria</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs text-gray-400 mb-4">Ventas, agendas creadas y llamadas de closers por dia</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={timeline.map((d) => ({
                    dia: new Date(d.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
                    Ventas: d.ventas,
                    "Agendas creadas": d.agendasCreadas,
                    "Llamadas hoy": d.llamadas,
                  }))} barCategoryGap="20%">
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                            <p className="font-semibold text-gray-700 mb-1">{label}</p>
                            {payload.map((p) => (
                              <p key={String(p.dataKey)} style={{ color: p.color }}>
                                {String(p.dataKey)}: {String(p.value)}
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Ventas" radius={[3, 3, 0, 0]} fill="#f59e0b" />
                    <Bar dataKey="Agendas creadas" radius={[3, 3, 0, 0]} fill="#6366f1" />
                    <Bar dataKey="Llamadas hoy" radius={[3, 3, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Rendimiento closers */}
              <>
                  <h3 className="text-sm font-bold text-gray-700 mt-4">Rendimiento closers <span className="font-normal text-gray-400">(Rendimiento en funcion de las llamadas ya celebradas)</span></h3>

                  {/* Resumen por closer */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Closer</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Llamadas</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">No shows</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Celebradas</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
                          <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">% cierre</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {closerPerformance.map((c) => (
                          <tr key={c.closer} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 text-sm font-semibold text-gray-800">{c.closer}</td>
                            <td className="text-right px-4 py-3 text-sm text-gray-600">{c.llamadas}</td>
                            <td className="text-right px-4 py-3 text-sm text-red-500 font-medium">{c.noShows}</td>
                            <td className="text-right px-4 py-3 text-sm font-bold text-gray-900">{c.celebradas}</td>
                            <td className="text-right px-4 py-3 text-sm font-bold text-emerald-600">{c.ventas}</td>
                            <td className="text-right px-5 py-3 text-sm font-black text-gray-900">{c.cierre}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Detalle por dia y closer */}
                  <h3 className="text-sm font-bold text-gray-700 mt-2">Detalle por dia</h3>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Dia</th>
                          {closerPerformance.map((c) => (
                            <th key={c.closer} colSpan={3} className="text-center px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide border-l border-gray-100">
                              {c.closer}
                            </th>
                          ))}
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50/40">
                          <th />
                          {closerPerformance.map((c) => (
                            <React.Fragment key={c.closer}>
                              <th className="text-right px-2 py-2 text-[10px] font-bold text-gray-400 uppercase border-l border-gray-100">Llam</th>
                              <th className="text-right px-2 py-2 text-[10px] font-bold text-gray-400 uppercase">Vent</th>
                              <th className="text-right px-2 py-2 text-[10px] font-bold text-gray-400 uppercase">%</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {timeline.map((t) => (
                          <tr key={t.date} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-2.5 text-xs font-semibold text-gray-600">
                              {new Date(t.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", weekday: "short" })}
                            </td>
                            {closerPerformance.map((c) => {
                              const dayData = c.days.find((d) => d.date === t.date);
                              const cel = dayData ? dayData.celebradas : 0;
                              const ven = dayData ? dayData.ventas : 0;
                              const pct = cel > 0 ? ((ven / cel) * 100).toFixed(0) : "—";
                              return (
                                <React.Fragment key={c.closer}>
                                  <td className="text-right px-2 py-2.5 text-xs text-gray-600 border-l border-gray-100">{cel || <span className="text-gray-300">—</span>}</td>
                                  <td className="text-right px-2 py-2.5 text-xs font-bold text-emerald-600">{ven || <span className="text-gray-300 font-normal">—</span>}</td>
                                  <td className="text-right px-2 py-2.5 text-xs font-semibold text-gray-500">{pct === "—" ? <span className="text-gray-300">—</span> : `${pct}%`}</td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </>
          </>

          {/* 3. Desglose por fuente */}
          {sources.length > 0 && (<>
            <h2 className="text-lg font-bold text-gray-900 mt-2">3. Desglose por fuente</h2>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Fuente</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Leads</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Agendas</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sources.map((s) => (
                    <tr key={s.source} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-3 h-3 rounded-full ${SOURCE_COLORS[s.source] ?? "bg-gray-300"}`} />
                          <span className="text-sm font-semibold text-gray-700">{s.source}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{s.leads.toLocaleString("es-ES")}</td>
                      <td className={`text-right px-4 py-3.5 text-sm font-semibold ${SOURCE_TEXT[s.source]}`}>{s.leadsPct}%</td>
                      <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">
                        {s.agendasUnicas}
                        <span className="text-xs font-normal text-gray-400 ml-1">({s.agendas})</span>
                      </td>
                      <td className={`text-right px-4 py-3.5 text-sm font-semibold ${SOURCE_TEXT[s.source]}`}>{s.agendasPct}%</td>
                      <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{s.ventas}</td>
                      <td className={`text-right px-6 py-3.5 text-sm font-semibold ${SOURCE_TEXT[s.source]}`}>{s.ventasPct}%</td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-gray-50/80 font-bold">
                    <td className="px-6 py-3.5 text-sm text-gray-700">Total</td>
                    <td className="text-right px-4 py-3.5 text-sm text-gray-900">{stats.totalLeads.toLocaleString("es-ES")}</td>
                    <td className="text-right px-4 py-3.5 text-sm text-gray-400">100%</td>
                    <td className="text-right px-4 py-3.5 text-sm text-gray-900">
                      {stats.agendasUnicas}
                      <span className="text-xs font-normal text-gray-400 ml-1">({stats.totalAgendas})</span>
                    </td>
                    <td className="text-right px-4 py-3.5 text-sm text-gray-400">100%</td>
                    <td className="text-right px-4 py-3.5 text-sm text-gray-900">{stats.totalVentas}</td>
                    <td className="text-right px-6 py-3.5 text-sm text-gray-400">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>)}

          {/* 4. Paid Media */}
          {paidMedia && paidMedia.campaigns.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mt-2">4. Paid Media</h2>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Fuente</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Captacion</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Agendas</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ratio agenda</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ratio venta</th>
                      <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cierre agenda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paidMedia.campaigns.map((c) => (
                      <tr key={c.campaign} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="text-sm font-semibold text-gray-700">{c.campaign}</span>
                        </td>
                        <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{c.leads.toLocaleString("es-ES")}</td>
                        <td className="text-right px-4 py-3.5 text-sm font-semibold text-blue-600">{c.leadsPct}%</td>
                        <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">
                          {c.agendasUnicas}
                          <span className="text-xs font-normal text-gray-400 ml-1">({c.agendas})</span>
                        </td>
                        <td className="text-right px-4 py-3.5 text-sm font-semibold text-blue-600">{c.agendasPct}%</td>
                        <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{c.ventas}</td>
                        <td className="text-right px-4 py-3.5 text-sm font-semibold text-blue-600">{c.ventasPct}%</td>
                        <td className="text-right px-4 py-3.5 text-sm font-semibold text-emerald-600">{c.ratioAgenda}%</td>
                        <td className="text-right px-4 py-3.5 text-sm font-semibold text-emerald-600">{c.ratioVenta}%</td>
                        <td className="text-right px-6 py-3.5 text-sm font-semibold text-amber-600">{c.cierreAgenda}%</td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="bg-gray-50/80 font-bold">
                      <td className="px-6 py-3.5 text-sm text-gray-700">TOTAL</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-900">{paidMedia.totalLeads.toLocaleString("es-ES")}</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-400">100%</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-900">{paidMedia.totalAgendas}</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-400">100%</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-900">{paidMedia.totalVentas}</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-400">100%</td>
                      <td className="text-right px-4 py-3.5 text-sm font-semibold text-emerald-600">
                        {paidMedia.totalLeads > 0 ? ((paidMedia.totalAgendas / paidMedia.totalLeads) * 100).toFixed(2) : "0"}%
                      </td>
                      <td className="text-right px-4 py-3.5 text-sm font-semibold text-emerald-600">
                        {paidMedia.totalLeads > 0 ? ((paidMedia.totalVentas / paidMedia.totalLeads) * 100).toFixed(2) : "0"}%
                      </td>
                      <td className="text-right px-6 py-3.5 text-sm font-semibold text-amber-600">
                        {paidMedia.totalAgendas > 0 ? ((paidMedia.totalVentas / paidMedia.totalAgendas) * 100).toFixed(2) : "0"}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* 5. Afiliados */}
          {affiliateMedia && affiliateMedia.types.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mt-2">5. Afiliados</h2>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Fuente</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Captacion</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Agendas</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
                      <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {affiliateMedia.types.map((a) => (
                      <tr key={a.affiliate} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="text-sm font-semibold text-gray-700">{a.affiliate}</span>
                        </td>
                        <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{a.leads.toLocaleString("es-ES")}</td>
                        <td className="text-right px-4 py-3.5 text-sm font-semibold text-purple-600">{a.leadsPct}%</td>
                        <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">
                          {a.agendasUnicas}
                          <span className="text-xs font-normal text-gray-400 ml-1">({a.agendas})</span>
                        </td>
                        <td className="text-right px-4 py-3.5 text-sm font-semibold text-purple-600">{a.agendasPct}%</td>
                        <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{a.ventas}</td>
                        <td className="text-right px-6 py-3.5 text-sm font-semibold text-purple-600">{a.ventasPct}%</td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="bg-gray-50/80 font-bold">
                      <td className="px-6 py-3.5 text-sm text-gray-700">TOTAL</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-900">{affiliateMedia.totalLeads.toLocaleString("es-ES")}</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-400">100%</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-900">{affiliateMedia.totalAgendas}</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-400">100%</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-900">{affiliateMedia.totalVentas}</td>
                      <td className="text-right px-6 py-3.5 text-sm text-gray-400">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* 6. Estudio por comercial */}
          {comerciales.length > 0 && (<>
              <h2 className="text-lg font-bold text-gray-900 mt-2">6. Estudio por comercial</h2>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th rowSpan={2} className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide border-r border-gray-100">Closing</th>
                      <th rowSpan={2} className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Agendas</th>
                      <th rowSpan={2} className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
                      <th rowSpan={2} className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide border-r border-gray-100">% cierre</th>
                      <th colSpan={5} className="text-center px-3 py-2 text-xs font-bold text-blue-500 uppercase tracking-wide border-r border-gray-100">Paid</th>
                      <th colSpan={3} className="text-center px-3 py-2 text-xs font-bold text-emerald-500 uppercase tracking-wide border-r border-gray-100">Organico</th>
                      <th colSpan={3} className="text-center px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Untracked</th>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50/40">
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Ag. AV0</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Ag. AV2</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">V. AV0</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">V. AV2</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase border-r border-gray-100">% AV0 / AV2</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Agendas</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Ventas</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase border-r border-gray-100">% cierre</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Agendas</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Ventas</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">% cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {comerciales.map((c) => (
                      <tr key={c.comercial} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-semibold text-gray-700 border-r border-gray-100">{c.comercial}</td>
                        <td className="text-right px-3 py-3 text-sm font-bold text-gray-900">
                          {c.agendasUnicas}
                          <span className="text-xs font-normal text-gray-400 ml-1">({c.agendas})</span>
                        </td>
                        <td className="text-right px-3 py-3 text-sm font-bold text-gray-900">{c.ventas}</td>
                        <td className="text-right px-3 py-3 text-sm font-bold text-gray-900 border-r border-gray-100">{c.cierre}%</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.paidAV0Agendas}</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.paidAV2Agendas}</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.paidAV0Ventas}</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.paidAV2Ventas}</td>
                        <td className="text-right px-3 py-3 text-sm font-semibold text-blue-600 border-r border-gray-100">{c.cierreAV0}% / {c.cierreAV2}%</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.orgAgendas}</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.orgVentas}</td>
                        <td className="text-right px-3 py-3 text-sm font-semibold text-emerald-600 border-r border-gray-100">{c.cierreOrg}%</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.untrackedAgendas}</td>
                        <td className="text-right px-3 py-3 text-sm text-gray-600">{c.untrackedVentas}</td>
                        <td className="text-right px-3 py-3 text-sm font-semibold text-gray-500">{c.cierreUntracked}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </>)}

          {/* 7. Conclusiones del lanzamiento */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">7. Conclusiones del lanzamiento</h2>
              <button
                onClick={() => setShowNewNota(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </button>
            </div>

            {showNewNota && (
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Titulo..."
                    value={newTitulo}
                    onChange={(e) => setNewTitulo(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300"
                  />
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300"
                  >
                    <option value="conclusion">Conclusion</option>
                    <option value="nota">Nota</option>
                    <option value="mejora">Mejora</option>
                  </select>
                </div>
                <textarea
                  placeholder="Contenido..."
                  value={newContenido}
                  onChange={(e) => setNewContenido(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300 resize-none"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setShowNewNota(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button
                    onClick={handleCreateNota}
                    disabled={!newTitulo.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {notas.length === 0 && !showNewNota ? (
              <div className="text-center py-10 text-gray-400 text-sm">No hay conclusiones para esta edicion</div>
            ) : (
              <div className="space-y-3">
                {notas.map((nota) => (
                  <div key={nota.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    {editingNotaId === nota.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input type="text" value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300" />
                          <select value={editTipo} onChange={(e) => setEditTipo(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300">
                            <option value="conclusion">Conclusion</option>
                            <option value="nota">Nota</option>
                            <option value="mejora">Mejora</option>
                          </select>
                        </div>
                        <textarea value={editContenido} onChange={(e) => setEditContenido(e.target.value)} rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300 resize-none" />
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditingNotaId(null)} className="p-1.5 text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
                          <button onClick={() => handleUpdateNota(nota.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                            <Save className="h-3.5 w-3.5" />Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {nota.tipo === "conclusion" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-emerald-500"><FileText className="h-3 w-3" />Conclusion</span>}
                            {nota.tipo === "nota" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-blue-500"><Lightbulb className="h-3 w-3" />Nota</span>}
                            {nota.tipo === "mejora" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-amber-500"><AlertTriangle className="h-3 w-3" />Mejora</span>}
                            <span className="text-[11px] text-gray-400">
                              {new Date(nota.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-900">{nota.titulo}</h3>
                          {nota.contenido && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{nota.contenido}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingNotaId(nota.id); setEditTitulo(nota.titulo); setEditContenido(nota.contenido); setEditTipo(nota.tipo); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDeleteNota(nota.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
