"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Search, Briefcase, Clock, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, X, ExternalLink, BarChart2, Send,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type JobOffer = {
  id: string;
  title: string;
  company: string | null;
  platform: string;
  url: string | null;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  job_type: string;
  category: string;
  html_header: string;
  html_body: string;
  status: "pending_review" | "published" | "rejected";
  found_at: string;
};

type Stats = { total: number; pending: number; published: number; rejected: number };
type ChartPoint = { label: string; count: number };

type ApiResponse = {
  data: JobOffer[];
  count: number;
  page: number;
  pageSize: number;
  stats: Stats;
  categories: string[];
  porSemana: ChartPoint[];
};

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function fmtBudget(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const sym = currency === "EUR" ? "€" : "$";
  if (min && max) return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `desde ${sym}${min.toLocaleString()}`;
  return `hasta ${sym}${max!.toLocaleString()}`;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
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

const STATUS_MAP = {
  pending_review: { label: "Pendiente", color: "text-amber-600 bg-amber-50", icon: Clock },
  published:      { label: "Publicada", color: "text-emerald-600 bg-emerald-50", icon: Send },
  rejected:       { label: "Rechazada", color: "text-rose-500 bg-rose-50", icon: XCircle },
};

export default function JobsPage() {
  const [data, setData] = useState<JobOffer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [porSemana, setPorSemana] = useState<ChartPoint[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobOffer | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending_review");
  const [filterCategory, setFilterCategory] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);

    const res = await fetch(`/api/jobs?${params}`);
    const json: ApiResponse = await res.json();
    setData(json.data ?? []);
    setCount(json.count ?? 0);
    setStats(json.stats ?? null);
    setCategories(json.categories ?? []);
    setPorSemana(json.porSemana ?? []);
    setLoading(false);
  }, [page, search, filterStatus, filterCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(count / 20);
  const hasFilters = search || filterStatus || filterCategory;

  function clearFilters() {
    setSearch(""); setFilterStatus(""); setFilterCategory(""); setPage(1);
  }

  async function updateStatus(id: string, status: JobOffer["status"]) {
    setUpdating(id);
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setUpdating(null);
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    fetchData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Banco de Empleo</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Ofertas de trabajo en automatización, no-code e IA · actualizadas diariamente por agente Claude
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={Briefcase}    label="Total ofertas"  value={stats.total}    color="bg-indigo-500" />
          <StatCard icon={Clock}        label="Por revisar"    value={stats.pending}  color="bg-amber-500" />
          <StatCard icon={Send}          label="Publicadas"     value={stats.published} color="bg-emerald-500" />
          <StatCard icon={XCircle}      label="Rechazadas"     value={stats.rejected} color="bg-rose-500" />
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-4 w-4 text-indigo-500" />
          <p className="font-bold text-gray-900 text-sm">Ofertas encontradas por semana</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={porSemana} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12 }}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              formatter={(v: number) => [v, "Ofertas"]}
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
              placeholder="Buscar por título, empresa..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-indigo-300"
            />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-300">
            <option value="">Todos los estados</option>
            <option value="pending_review">Por revisar</option>
            <option value="published">Publicadas</option>
            <option value="rejected">Rechazadas</option>
          </select>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-300">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-gray-300 text-sm">No hay ofertas que coincidan</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {data.map((job) => {
              const st = STATUS_MAP[job.status];
              const StIcon = st.icon;
              const budget = fmtBudget(job.budget_min, job.budget_max, job.currency);
              return (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelected(job)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{job.platform}</span>
                        {job.category && <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{job.category}</span>}
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          <StIcon className="h-3 w-3" /> {st.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{job.title}</h3>
                      {job.company && <p className="text-xs text-gray-400 mt-0.5">{job.company}</p>}
                      {budget && <p className="text-xs font-semibold text-emerald-600 mt-1">{budget}</p>}
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-[10px] text-gray-300 whitespace-nowrap">{fmtFecha(job.found_at)}</p>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                          <ExternalLink className="h-3 w-3" /> Ver oferta
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => updateStatus(job.id, "published")}
                      disabled={job.status === "published" || updating === job.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" /> Publicar en Circle
                    </button>
                    <button
                      onClick={() => updateStatus(job.id, "rejected")}
                      disabled={job.status === "rejected" || updating === job.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Rechazar
                    </button>
                    {job.status !== "pending_review" && (
                      <button
                        onClick={() => updateStatus(job.id, "pending_review")}
                        disabled={updating === job.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5" /> Pendiente
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-400">
                {((page - 1) * 20) + 1}–{Math.min(page * 20, count)} de {count} ofertas
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-7 w-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-gray-400 px-1">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="h-7 w-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{selected.platform} · {selected.category}</p>
                <h2 className="font-bold text-gray-900 text-base leading-snug">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {/* HTML preview */}
              <div
                className="rounded-xl overflow-hidden border border-gray-100 mb-4"
                dangerouslySetInnerHTML={{ __html: selected.html_header + selected.html_body }}
              />
              {/* Actions */}
              <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                <button onClick={() => updateStatus(selected.id, "published")}
                  disabled={selected.status === "published" || updating === selected.id}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Send className="h-3.5 w-3.5" /> Publicar en Circle
                </button>
                <button onClick={() => updateStatus(selected.id, "rejected")}
                  disabled={selected.status === "rejected" || updating === selected.id}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <XCircle className="h-3.5 w-3.5" /> Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
