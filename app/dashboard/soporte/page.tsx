"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Headphones, CheckCircle, Clock, AlertTriangle, Search, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Ticket = {
  id: string;
  numero_ticket: number | null;
  fecha: string | null;
  alumno: string | null;
  consulta: string | null;
  tipo_consulta: string | null;
  medio_canal: string | null;
  responsable: string | null;
  escalado_a: string | null;
  pendiente_escalada: boolean | null;
  cerrada: boolean | null;
};

type Stats = { total: number; totalCerradas: number; totalPendientes: number; totalEscaladas: number; tasaCierre: number };
type PorTipo = { tipo: string; count: number };
type PorCanal = { canal: string; count: number };
type PorResponsable = { responsable: string; total: number; cerradas: number };
type PorMes = { mes: string; count: number };

const TIPO_COLORS: Record<string, string> = {
  Plataforma: "#6366f1",
  OB: "#10b981",
  Técnica: "#f59e0b",
  Negocio: "#3b82f6",
  Clases: "#8b5cf6",
  Otro: "#9ca3af",
};

const CANAL_COLORS: Record<string, string> = {
  "WhatsApp": "#25d366",
  "Circle DM": "#6366f1",
  "Cricle Post": "#8b5cf6",
  "Llamada": "#f59e0b",
  "Videollamada": "#3b82f6",
};

function EstadoBadge({ cerrada, escalado }: { cerrada: boolean | null; escalado: string | null }) {
  if (escalado) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
      <AlertTriangle className="h-2.5 w-2.5" /> Escalada
    </span>
  );
  if (cerrada) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
      <CheckCircle className="h-2.5 w-2.5" /> Cerrada
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
      <Clock className="h-2.5 w-2.5" /> Pendiente
    </span>
  );
}

function fmtMes(mes: string) {
  const [y, m] = mes.split("-");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

export default function SoportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porTipo, setPorTipo] = useState<PorTipo[]>([]);
  const [porCanal, setPorCanal] = useState<PorCanal[]>([]);
  const [porResponsable, setPorResponsable] = useState<PorResponsable[]>([]);
  const [porMes, setPorMes] = useState<PorMes[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [canales, setCanales] = useState<string[]>([]);
  const [responsables, setResponsables] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);
  const [canalFilter, setCanalFilter] = useState<string | null>(null);
  const [responsableFilter, setResponsableFilter] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const pageSize = 40;

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tipoFilter) params.set("tipo", tipoFilter);
    if (canalFilter) params.set("canal", canalFilter);
    if (responsableFilter) params.set("responsable", responsableFilter);
    if (estadoFilter) params.set("estado", estadoFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    fetch(`/api/soporte?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTickets(d.data ?? []);
        setStats(d.stats);
        setPorTipo(d.porTipo ?? []);
        setPorCanal(d.porCanal ?? []);
        setPorResponsable(d.porResponsable ?? []);
        setPorMes(d.porMes ?? []);
        setTipos(d.tipos ?? []);
        setCanales(d.canales ?? []);
        setResponsables(d.responsables ?? []);
        setTotalCount(d.count ?? 0);
      })
      .finally(() => setLoading(false));
  }, [tipoFilter, canalFilter, responsableFilter, estadoFilter, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
        <p className="text-gray-400 text-sm mt-0.5">Tickets de atención al alumno</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Headphones className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total tickets</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cerradas</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalCerradas}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pendientes</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalPendientes}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Escaladas</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalEscaladas}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tasa cierre</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.tasaCierre}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Por mes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Tickets por mes</h2>
          <p className="text-xs text-gray-400 mb-3">Volumen mensual</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={porMes} barCategoryGap="30%">
              <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={fmtMes} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700">{fmtMes(label as string)}</p>
                      <p className="font-bold text-indigo-600">{(payload[0].payload as PorMes).count} tickets</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Por tipo de consulta</h2>
          <div className="space-y-2.5">
            {porTipo.map((t) => (
              <div key={t.tipo}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TIPO_COLORS[t.tipo] ?? "#9ca3af" }} />
                    {t.tipo}
                  </span>
                  <span className="text-xs font-bold text-gray-800">{t.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 rounded-full" style={{
                    width: `${Math.round((t.count / (porTipo[0]?.count ?? 1)) * 100)}%`,
                    backgroundColor: TIPO_COLORS[t.tipo] ?? "#9ca3af"
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por responsable */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Por agente</h2>
          <div className="space-y-3">
            {porResponsable.map((r) => {
              const pct = r.total > 0 ? Math.round((r.cerradas / r.total) * 100) : 0;
              return (
                <div key={r.responsable} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-indigo-600">{r.responsable.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-800">{r.responsable}</span>
                      <span className="text-[10px] text-gray-400">{r.total} tickets · {pct}% cierre</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Canales mini */}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Por canal</p>
            <div className="flex flex-wrap gap-1.5">
              {porCanal.map((c) => (
                <span key={c.canal} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: CANAL_COLORS[c.canal] ?? "#9ca3af" }}>
                  {c.canal} · {c.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Alumno o consulta..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-52"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Estado:</span>
          {[
            { key: null, label: "Todos" },
            { key: "cerrada", label: "Cerradas" },
            { key: "pendiente", label: "Pendientes" },
            { key: "escalada", label: "Escaladas" },
          ].map(({ key, label }) => (
            <button key={String(key)} onClick={() => { setEstadoFilter(key); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${estadoFilter === key ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Tipo:</span>
          <select value={tipoFilter ?? ""} onChange={(e) => { setTipoFilter(e.target.value || null); setPage(1); }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 bg-white text-gray-600">
            <option value="">Todos</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Canal:</span>
          <select value={canalFilter ?? ""} onChange={(e) => { setCanalFilter(e.target.value || null); setPage(1); }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 bg-white text-gray-600">
            <option value="">Todos</option>
            {canales.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Agente:</span>
          <select value={responsableFilter ?? ""} onChange={(e) => { setResponsableFilter(e.target.value || null); setPage(1); }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 bg-white text-gray-600">
            <option value="">Todos</option>
            {responsables.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <span className="ml-auto text-xs text-gray-400">{totalCount} tickets</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Headphones className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay tickets con estos filtros</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide w-16">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide w-24">Fecha</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Alumno</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Consulta</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide w-24">Tipo</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide w-24">Canal</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide w-20">Agente</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide w-28">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{t.numero_ticket ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {t.fecha ? new Date(t.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">{t.alumno ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                      <p className="line-clamp-2">{t.consulta ?? "—"}</p>
                      {t.escalado_a && (
                        <p className="text-[10px] text-red-400 mt-0.5">→ Escalado a {t.escalado_a}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: TIPO_COLORS[t.tipo_consulta ?? ""] ?? "#9ca3af" }}>
                        {t.tipo_consulta ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: CANAL_COLORS[t.medio_canal ?? ""] ?? "#9ca3af" }}>
                        {t.medio_canal ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{t.responsable ?? "—"}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge cerrada={t.cerrada} escalado={t.escalado_a} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Página {page} de {totalPages}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 disabled:opacity-30 transition-all">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 disabled:opacity-30 transition-all">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
