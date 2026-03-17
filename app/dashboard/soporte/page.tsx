"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Search, Headphones, CheckCircle, Clock, AlertTriangle,
  TrendingUp, ChevronLeft, ChevronRight, X, BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Ticket = {
  numero_ticket: number;
  fecha: string | null;
  alumno: string | null;
  consulta: string | null;
  tipo_consulta: string | null;
  medio_canal: string | null;
  responsable: string | null;
  escalado_a: string | null;
  cerrada: boolean;
};

type Stats = {
  total: number;
  totalCerradas: number;
  totalPendientes: number;
  totalEscaladas: number;
  tasaCierre: number;
};

type ChartPoint = { label: string; count: number };
type Agrupacion = "semana" | "mes" | "quarter";

type ApiResponse = {
  data: Ticket[];
  count: number;
  page: number;
  pageSize: number;
  stats: Stats;
  tipos: string[];
  canales: string[];
  responsables: string[];
  porSemana: ChartPoint[];
  porMes: ChartPoint[];
  porQuarter: ChartPoint[];
};

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function SoportePage() {
  const [data, setData] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tipos, setTipos] = useState<string[]>([]);
  const [canales, setCanales] = useState<string[]>([]);
  const [responsables, setResponsables] = useState<string[]>([]);
  const [porSemana, setPorSemana] = useState<ChartPoint[]>([]);
  const [porMes, setPorMes] = useState<ChartPoint[]>([]);
  const [porQuarter, setPorQuarter] = useState<ChartPoint[]>([]);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("mes");
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterCanal, setFilterCanal] = useState("");
  const [filterResponsable, setFilterResponsable] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (filterTipo) params.set("tipo", filterTipo);
    if (filterCanal) params.set("canal", filterCanal);
    if (filterResponsable) params.set("responsable", filterResponsable);
    if (filterEstado) params.set("estado", filterEstado);

    const res = await fetch(`/api/soporte?${params}`);
    const json: ApiResponse = await res.json();
    setData(json.data ?? []);
    setCount(json.count ?? 0);
    setStats(json.stats ?? null);
    setTipos(json.tipos ?? []);
    setCanales(json.canales ?? []);
    setResponsables(json.responsables ?? []);
    setPorSemana(json.porSemana ?? []);
    setPorMes(json.porMes ?? []);
    setPorQuarter(json.porQuarter ?? []);
    setLoading(false);
  }, [page, search, filterTipo, filterCanal, filterResponsable, filterEstado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(count / 40);
  const hasFilters = search || filterTipo || filterCanal || filterResponsable || filterEstado;

  function clearFilters() {
    setSearch(""); setFilterTipo(""); setFilterCanal("");
    setFilterResponsable(""); setFilterEstado(""); setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
        <p className="text-gray-400 text-sm mt-0.5">Tickets de soporte · sincronizados cada noche desde Google Sheets vía n8n</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          <StatCard icon={Headphones}    label="Total tickets" value={stats.total}             color="bg-indigo-500" />
          <StatCard icon={CheckCircle}   label="Cerradas"      value={stats.totalCerradas}      color="bg-emerald-500" />
          <StatCard icon={Clock}         label="Pendientes"    value={stats.totalPendientes}     color="bg-amber-500" />
          <StatCard icon={AlertTriangle} label="Escaladas"     value={stats.totalEscaladas}      color="bg-rose-500" />
          <StatCard icon={TrendingUp}    label="Tasa cierre"   value={`${stats.tasaCierre}%`}   color="bg-violet-500" />
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-indigo-500" />
            <p className="font-bold text-gray-900 text-sm">Tickets por período</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(["semana", "mes", "quarter"] as Agrupacion[]).map((op) => (
              <button
                key={op}
                onClick={() => setAgrupacion(op)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  agrupacion === op
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {op === "semana" ? "Semanas" : op === "mes" ? "Meses" : "Quarters"}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={agrupacion === "semana" ? porSemana : agrupacion === "mes" ? porMes : porQuarter}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12 }}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              formatter={(v: number) => [v, "Tickets"]}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar alumno o consulta..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-indigo-300"
            />
          </div>
          <select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-300">
            <option value="">Todos los tipos</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterCanal} onChange={(e) => { setFilterCanal(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-300">
            <option value="">Todos los canales</option>
            {canales.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterResponsable} onChange={(e) => { setFilterResponsable(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-300">
            <option value="">Todos los responsables</option>
            {responsables.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-300">
            <option value="">Todos los estados</option>
            <option value="cerrada">Cerrada</option>
            <option value="pendiente">Pendiente</option>
            <option value="escalada">Escalada</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-300 text-sm">No hay tickets que coincidan</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Alumno</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Consulta</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Canal</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Responsable</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map((t) => (
                    <tr key={t.numero_ticket} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs">{t.numero_ticket}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtFecha(t.fecha)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium text-xs">{t.alumno ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                        <span className="line-clamp-2 leading-relaxed">{t.consulta ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {t.tipo_consulta
                          ? <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">{t.tipo_consulta}</span>
                          : <span className="text-gray-200 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {t.medio_canal
                          ? <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full whitespace-nowrap">{t.medio_canal}</span>
                          : <span className="text-gray-200 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {t.escalado_a
                          ? <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">↗ {t.escalado_a}</span>
                          : (t.responsable ?? "—")}
                      </td>
                      <td className="px-4 py-3">
                        {t.cerrada
                          ? <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle className="h-3 w-3" /> Cerrada</span>
                          : <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500"><Clock className="h-3 w-3" /> Pendiente</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {((page - 1) * 40) + 1}–{Math.min(page * 40, count)} de {count} tickets
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="h-7 w-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs text-gray-400 px-1">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="h-7 w-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
