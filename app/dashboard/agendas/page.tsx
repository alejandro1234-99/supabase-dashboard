"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Calendar, Phone, UserX, Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Agenda = {
  id: string;
  nombre: string | null;
  email: string | null;
  whatsapp: string | null;
  situacion_actual: string | null;
  objetivo: string | null;
  inversion: string | null;
  comercial: string | null;
  edicion: string | null;
  fecha_llamada: string | null;
  no_show: boolean;
  creada: string | null;
};

type Stats = { total: number; conLlamada: number; noShows: number; sinLlamada: number };
type PorComercial = { comercial: string; total: number; noShow: number; conLlamada: number };
type PorEdicion = { edicion: string; total: number };
type PorInversion = { inversion: string; total: number };

export default function AgendasPage() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porComercial, setPorComercial] = useState<PorComercial[]>([]);
  const [porEdicion, setPorEdicion] = useState<PorEdicion[]>([]);
  const [porInversion, setPorInversion] = useState<PorInversion[]>([]);
  const [ediciones, setEdiciones] = useState<string[]>([]);
  const [comerciales, setComerciales] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [edicionFilter, setEdicionFilter] = useState<string | null>(null);
  const [comercialFilter, setComercialFilter] = useState<string | null>(null);
  const [noShowFilter, setNoShowFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (edicionFilter) params.set("edicion", edicionFilter);
    if (comercialFilter) params.set("comercial", comercialFilter);
    if (noShowFilter !== null) params.set("no_show", noShowFilter);
    if (search) params.set("search", search);
    fetch(`/api/agendas?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setAgendas(d.data ?? []);
        setCount(d.count ?? 0);
        setStats(d.stats);
        setPorComercial(d.porComercial ?? []);
        setPorEdicion(d.porEdicion ?? []);
        setPorInversion(d.porInversion ?? []);
        setEdiciones(d.ediciones ?? []);
        setComerciales(d.comerciales ?? []);
      })
      .finally(() => setLoading(false));
  }, [page, edicionFilter, comercialFilter, noShowFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(count / 30);
  const noShowRate = stats ? ((stats.noShows / (stats.conLlamada || 1)) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agendas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Llamadas de admisión · Airtable → Supabase</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total agendas</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Con llamada</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.conLlamada}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sin llamada</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.sinLlamada}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-400 flex items-center justify-center shrink-0">
              <UserX className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">No shows</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {stats.noShows}
                <span className="text-sm font-medium text-gray-400 ml-1">{noShowRate}%</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-3 gap-4">
        {/* Por edición */}
        {porEdicion.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Por edición</h2>
            <p className="text-xs text-gray-400 mb-4">Total agendas</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porEdicion.slice(0, 8)} barCategoryGap="35%">
                <XAxis dataKey="edicion" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                        <p className="font-semibold text-gray-700">{label}</p>
                        <p className="font-bold text-indigo-600">{(payload[0].payload as PorEdicion).total} agendas</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" radius={[5, 5, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Por comercial */}
        {porComercial.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Por comercial</h2>
            <p className="text-xs text-gray-400 mb-3">Agendas · No shows</p>
            <div className="space-y-2.5">
              {porComercial.slice(0, 7).map((c) => {
                const max = porComercial[0]?.total ?? 1;
                const pct = Math.round((c.total / max) * 100);
                const nsRate = c.conLlamada > 0 ? ((c.noShow / c.conLlamada) * 100).toFixed(0) : "0";
                return (
                  <div key={c.comercial}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{c.comercial}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-red-400">{c.noShow} NS ({nsRate}%)</span>
                        <span className="text-xs font-bold text-gray-800">{c.total}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Por inversión */}
        {porInversion.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Disposición de inversión</h2>
            <p className="text-xs text-gray-400 mb-3">Respuesta al formulario</p>
            <div className="space-y-2.5">
              {porInversion.slice(0, 6).map((inv) => {
                const max = porInversion[0]?.total ?? 1;
                const pct = Math.round((inv.total / max) * 100);
                const label = inv.inversion.length > 35 ? inv.inversion.slice(0, 35) + "…" : inv.inversion;
                return (
                  <div key={inv.inversion}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-gray-600 truncate max-w-[180px]" title={inv.inversion}>{label}</span>
                      <span className="text-xs font-bold text-gray-800 ml-2 shrink-0">{inv.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Nombre, email o teléfono..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-52"
          />
        </div>

        {/* Edición */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-gray-400">Edición:</span>
          <button onClick={() => { setEdicionFilter(null); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!edicionFilter ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
            Todas
          </button>
          {ediciones.map((ed) => (
            <button key={ed} onClick={() => { setEdicionFilter(ed); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${edicionFilter === ed ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
              {ed}
            </button>
          ))}
        </div>

        {/* Comercial + No show */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-medium text-gray-400">Comercial:</span>
          <button onClick={() => { setComercialFilter(null); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!comercialFilter ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            Todos
          </button>
          {comerciales.map((c) => (
            <button key={c} onClick={() => { setComercialFilter(c); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${comercialFilter === c ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {c}
            </button>
          ))}
          <button onClick={() => { setNoShowFilter(noShowFilter === "true" ? null : "true"); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ml-2 ${noShowFilter === "true" ? "bg-red-500 text-white" : "bg-red-50 border border-red-200 text-red-600 hover:border-red-400"}`}>
            No show
          </button>
          <span className="text-xs text-gray-400 ml-2">{count} agendas</span>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Contacto</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Edición</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Situación</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Inversión</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Comercial</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Llamada</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agendas.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 text-xs">{a.nombre ?? "—"}</p>
                    <p className="text-[11px] text-gray-400">{a.email ?? ""}</p>
                    {a.whatsapp && <p className="text-[11px] text-gray-400">{a.whatsapp}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.edicion ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate" title={a.situacion_actual ?? ""}>{a.situacion_actual ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px]">
                    <span className="line-clamp-2 leading-snug">{a.inversion ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.comercial ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {a.fecha_llamada ? new Date(a.fecha_llamada).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-amber-400 font-medium">Pendiente</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.no_show ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">No show</span>
                    ) : a.fecha_llamada ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">Realizada</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">Pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agendas.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No hay resultados</div>
          )}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-400">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled={page === 1}
              onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={page === p ? "default" : "outline"} size="sm"
                className={`rounded-full w-9 ${page === p ? "bg-indigo-500 hover:bg-indigo-600 border-indigo-500" : ""}`}
                onClick={() => { setPage(p); window.scrollTo(0, 0); }}>
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="rounded-full" disabled={page === totalPages}
              onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
