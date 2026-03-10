"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, Trophy, Activity, FileText, MessageSquare, Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Alumno = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  id_circle: string | null;
  fecha_union: string | null;
  tags: string | null;
  localizacion: string | null;
  enlace_perfil: string | null;
  conexiones_circle: number | null;
  posts_publicados: number | null;
  comentarios_totales: number | null;
  caso_exito: string | null;
  tipo_exito: string | null;
  descripcion_exito: string | null;
};

type Stats = {
  total: number;
  casosExito: number;
  conActividad: number;
  totalPosts: number;
  totalComentarios: number;
  avgConexiones: number;
};

type PorTags = { tag: string; count: number };
type PorPais = { pais: string; count: number };
type PorTipoExito = { tipo: string; count: number };

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    "Alumnos Lanzamiento Enero": "bg-blue-50 text-blue-600",
    "Revolutioner": "bg-purple-50 text-purple-600",
    "Alumnos Lanzamiento Octubre": "bg-orange-50 text-orange-600",
    "Alumnos Lanzamiento Febrero": "bg-emerald-50 text-emerald-600",
  };
  const cls = colors[tag] ?? "bg-gray-100 text-gray-600";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{tag}</span>;
}

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porTags, setPorTags] = useState<PorTags[]>([]);
  const [porPais, setPorPais] = useState<PorPais[]>([]);
  const [porTipoExito, setPorTipoExito] = useState<PorTipoExito[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [tagsFilter, setTagsFilter] = useState<string | null>(null);
  const [exitoFilter, setExitoFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (tagsFilter) params.set("tags", tagsFilter);
    if (exitoFilter) params.set("caso_exito", exitoFilter);
    if (search) params.set("search", search);
    fetch(`/api/alumnos?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setAlumnos(d.data ?? []);
        setCount(d.count ?? 0);
        setStats(d.stats);
        setPorTags(d.porTags ?? []);
        setPorPais(d.porPais ?? []);
        setPorTipoExito(d.porTipoExito ?? []);
        setAllTags(d.allTags ?? []);
      })
      .finally(() => setLoading(false));
  }, [page, tagsFilter, exitoFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(count / 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alumnos</h1>
        <p className="text-gray-400 text-sm mt-0.5">Comunidad Circle · Actividad y casos de éxito</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Casos de éxito</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.casosExito}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Con actividad</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.conActividad}
                <span className="text-sm font-medium text-gray-400 ml-1">{Math.round((stats.conActividad / stats.total) * 100)}%</span>
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Posts</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalPosts}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Comentarios</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalComentarios}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-3 gap-4">
        {/* Por tags */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Por lanzamiento</h2>
          <div className="space-y-2.5">
            {porTags.slice(0, 8).map((t) => (
              <div key={t.tag}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[11px] text-gray-600 truncate max-w-[160px]" title={t.tag}>{t.tag}</span>
                  <span className="text-xs font-bold text-gray-800 ml-1 shrink-0">{t.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${Math.round((t.count / (porTags[0]?.count ?? 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por país */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Por país</h2>
          <div className="space-y-2.5">
            {porPais.map((p) => (
              <div key={p.pais}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[11px] text-gray-600">{p.pais}</span>
                  <span className="text-xs font-bold text-gray-800">{p.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-emerald-400 rounded-full" style={{ width: `${Math.round((p.count / (porPais[0]?.count ?? 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Casos de éxito por tipo */}
        {porTipoExito.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Tipo de caso de éxito</h2>
            <p className="text-xs text-gray-400 mb-3">{stats?.casosExito} en total</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={porTipoExito} barCategoryGap="35%">
                <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                        <p className="font-semibold text-gray-700">{label}</p>
                        <p className="font-bold text-amber-600">{(payload[0].payload as PorTipoExito).count}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin tipos de éxito registrados</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Nombre o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-48"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-gray-400">Tag:</span>
          <button onClick={() => { setTagsFilter(null); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!tagsFilter ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
            Todos
          </button>
          {allTags.map((t) => (
            <button key={t} onClick={() => { setTagsFilter(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${tagsFilter === t ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={() => { setExitoFilter(exitoFilter === "Sí" ? null : "Sí"); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${exitoFilter === "Sí" ? "bg-amber-400 text-white" : "bg-amber-50 border border-amber-200 text-amber-600 hover:border-amber-400"}`}>
            ✨ Solo casos de éxito
          </button>
          <span className="text-xs text-gray-400 ml-2">{count} alumnos</span>
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
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Alumno</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Tag</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Localización</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Conexiones</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Posts</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Comentarios</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Caso de éxito</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Fecha unión</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alumnos.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 text-xs">{a.nombre_completo ?? "—"}</p>
                    <p className="text-[11px] text-gray-400">{a.email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    {a.tags && <TagBadge tag={a.tags.split(",")[0].trim()} />}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">{a.localizacion ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">{a.conexiones_circle ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold ${(a.posts_publicados ?? 0) > 0 ? "text-blue-600" : "text-gray-300"}`}>
                      {a.posts_publicados ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold ${(a.comentarios_totales ?? 0) > 0 ? "text-purple-600" : "text-gray-300"}`}>
                      {a.comentarios_totales ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.caso_exito === "Sí" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">
                        ✨ {a.tipo_exito ?? "Éxito"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {a.fecha_union ? new Date(a.fecha_union).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.enlace_perfil && (
                      <a href={a.enlace_perfil} target="_blank" rel="noopener noreferrer"
                        className="text-gray-300 hover:text-indigo-500 transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {alumnos.length === 0 && (
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
