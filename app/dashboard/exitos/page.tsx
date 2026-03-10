"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Trophy, Search, ExternalLink, Activity, MessageSquare, Users } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

type CasoExito = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  tags: string | null;
  localizacion: string | null;
  enlace_perfil: string | null;
  tipo_exito: string | null;
  fuente_caso_exito: string | null;
  fecha_caso_exito: string | null;
  descripcion_exito: string | null;
  conexiones_circle: number | null;
  posts_publicados: number | null;
  comentarios_totales: number | null;
};

type Stats = { total: number; avgPosts: number; avgComentarios: number; avgConexiones: number };
type PorTipo = { tipo: string; count: number };
type PorFuente = { fuente: string; count: number };
type PorLanzamiento = { lanzamiento: string; count: number };

const STAGE_COLORS: Record<string, string> = {
  "Stage 0": "#6366f1",
  "Stage 1": "#10b981",
  "Stage 2": "#f59e0b",
  "Sin tipo": "#9ca3af",
};

const STAGE_DESC: Record<string, string> = {
  "Stage 0": "Primer logro / inicio",
  "Stage 1": "Resultado tangible",
  "Stage 2": "Transformación profunda",
};

function StageBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return null;
  const color = STAGE_COLORS[tipo] ?? "#9ca3af";
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
      {tipo}
    </span>
  );
}

function ExitoCard({ caso }: { caso: CasoExito }) {
  const color = STAGE_COLORS[caso.tipo_exito ?? ""] ?? "#9ca3af";
  const tag = caso.tags?.split(",")[0].trim();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
            style={{ backgroundColor: color }}>
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{caso.nombre_completo ?? "—"}</p>
            <p className="text-[11px] text-gray-400">{caso.localizacion ?? caso.email ?? ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StageBadge tipo={caso.tipo_exito} />
          {caso.enlace_perfil && (
            <a href={caso.enlace_perfil} target="_blank" rel="noopener noreferrer"
              className="text-gray-300 hover:text-indigo-500 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Descripción */}
      {caso.descripcion_exito && (
        <p className="text-sm text-gray-700 leading-relaxed border-l-2 pl-3" style={{ borderColor: color }}>
          "{caso.descripcion_exito}"
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
        {tag && <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{tag}</span>}
        {caso.fuente_caso_exito && (
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">{caso.fuente_caso_exito}</span>
        )}
        {caso.fecha_caso_exito && (
          <span className="text-[10px] text-gray-400 ml-auto">
            {new Date(caso.fecha_caso_exito).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 ml-auto">
          <span>{caso.posts_publicados ?? 0} posts</span>
          <span>{caso.comentarios_totales ?? 0} cmts</span>
        </div>
      </div>
    </div>
  );
}

export default function ExitosPage() {
  const [casos, setCasos] = useState<CasoExito[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porTipo, setPorTipo] = useState<PorTipo[]>([]);
  const [porFuente, setPorFuente] = useState<PorFuente[]>([]);
  const [porLanzamiento, setPorLanzamiento] = useState<PorLanzamiento[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tipoFilter) params.set("tipo", tipoFilter);
    if (search) params.set("search", search);
    fetch(`/api/exitos?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setCasos(d.data ?? []);
        setStats(d.stats);
        setPorTipo(d.porTipo ?? []);
        setPorFuente(d.porFuente ?? []);
        setPorLanzamiento(d.porLanzamiento ?? []);
        setTipos(d.tipos ?? []);
      })
      .finally(() => setLoading(false));
  }, [tipoFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Casos de Éxito</h1>
        <p className="text-gray-400 text-sm mt-0.5">Alumnos con resultado documentado · Circle</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Casos de éxito</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Conexiones medias</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.avgConexiones}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Posts medios</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.avgPosts}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Comentarios medios</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.avgComentarios}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-3 gap-4">
        {/* Donut por stage */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Por stage</h2>
          <p className="text-xs text-gray-400 mb-2">Nivel del caso de éxito</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={porTipo} dataKey="count" nameKey="tipo" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {porTipo.map((entry) => (
                  <Cell key={entry.tipo} fill={STAGE_COLORS[entry.tipo] ?? "#9ca3af"} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as PorTipo;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                    <p className="font-bold" style={{ color: STAGE_COLORS[d.tipo] ?? "#9ca3af" }}>{d.tipo}</p>
                    <p className="text-gray-500">{STAGE_DESC[d.tipo] ?? ""}</p>
                    <p className="font-bold text-gray-800">{d.count} casos</p>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {porTipo.map((t) => (
              <div key={t.tipo} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[t.tipo] ?? "#9ca3af" }} />
                <span className="text-xs text-gray-600 flex-1">{t.tipo}</span>
                <span className="text-xs font-bold text-gray-800">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por lanzamiento */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Por lanzamiento</h2>
          <p className="text-xs text-gray-400 mb-4">Distribución por edición</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={porLanzamiento} barCategoryGap="35%">
              <XAxis dataKey="lanzamiento" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700">{label}</p>
                      <p className="font-bold text-amber-600">{(payload[0].payload as PorLanzamiento).count} casos</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por fuente */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Por fuente</h2>
          <div className="space-y-2.5">
            {porFuente.map((f) => (
              <div key={f.fuente}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{f.fuente}</span>
                  <span className="text-xs font-bold text-gray-800">{f.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${Math.round((f.count / (porFuente[0]?.count ?? 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Nombre o descripción..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); } }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-52"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Stage:</span>
          <button onClick={() => setTipoFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!tipoFilter ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>
            Todos
          </button>
          {tipos.map((t) => (
            <button key={t} onClick={() => setTipoFilter(tipoFilter === t ? null : t)}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all"
              style={{ backgroundColor: tipoFilter === t ? STAGE_COLORS[t] : "#e5e7eb", color: tipoFilter === t ? "white" : "#6b7280" }}>
              {t}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{casos.length} casos</span>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
        </div>
      ) : casos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay casos de éxito con estos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {casos.map((caso) => <ExitoCard key={caso.id} caso={caso} />)}
        </div>
      )}
    </div>
  );
}
