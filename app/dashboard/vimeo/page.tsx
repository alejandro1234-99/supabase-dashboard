"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Video, Eye, Clock, Users, Search, CheckCircle, ExternalLink, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type VideoStat = {
  id: string;
  video_url: string | null;
  video_title: string | null;
  video_upload_date: string | null;
  views: number | null;
  impressions: number | null;
  unique_viewers: number | null;
  total_time_watched_seconds: number | null;
  avg_time_watched_seconds: number | null;
  avg_pct_watched: number | null;
  finishes: number | null;
  tiempo_reproduccion_min: number | null;
  categoria: string | null;
  pct_reproduccion: number | null;
  modulo: string | null;
};

type Stats = {
  totalViews: number;
  totalMinutos: number;
  totalUnique: number;
  totalFinishes: number;
  avgPct: number;
  total: number;
};

type PorModulo = { modulo: string; views: number; minutos: number; videos: number };

const MODULO_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

function PctBar({ value }: { value: number | null }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 bg-gray-100 rounded-full">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function fmtTime(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function VideoCard({ video }: { video: VideoStat }) {
  const vimeoId = video.video_url?.split("/").pop();
  const vimeoLink = vimeoId ? `https://vimeo.com/${vimeoId}` : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{video.video_title ?? "—"}</p>
          <div className="flex items-center gap-2 mt-1">
            {video.categoria && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{video.categoria}</span>
            )}
            {video.modulo && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{video.modulo}</span>
            )}
          </div>
        </div>
        {vimeoLink && (
          <a href={vimeoLink} target="_blank" rel="noopener noreferrer"
            className="text-gray-300 hover:text-indigo-500 transition-colors shrink-0 mt-0.5">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="text-lg font-black text-gray-900">{video.views ?? 0}</p>
          <p className="text-[9px] text-gray-400 font-semibold uppercase">Vistas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-gray-900">{video.unique_viewers ?? 0}</p>
          <p className="text-[9px] text-gray-400 font-semibold uppercase">Únicos</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-gray-900">{video.finishes ?? 0}</p>
          <p className="text-[9px] text-gray-400 font-semibold uppercase">Completos</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-gray-900">{fmtTime(video.avg_time_watched_seconds)}</p>
          <p className="text-[9px] text-gray-400 font-semibold uppercase">Avg visto</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <PctBar value={video.avg_pct_watched} />
        {video.video_upload_date && (
          <span className="text-[10px] text-gray-400">
            {new Date(video.video_upload_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function VimeoPage() {
  const [videos, setVideos] = useState<VideoStat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porModulo, setPorModulo] = useState<PorModulo[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [modulos, setModulos] = useState<string[]>([]);
  const [categoriaFilter, setCategoriaFilter] = useState<string | null>(null);
  const [moduloFilter, setModuloFilter] = useState<string | null>(null);
  const [sort, setSort] = useState("views");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoriaFilter) params.set("categoria", categoriaFilter);
    if (moduloFilter) params.set("modulo", moduloFilter);
    if (search) params.set("search", search);
    params.set("sort", sort);
    fetch(`/api/vimeo?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.data ?? []);
        setStats(d.stats);
        setPorModulo(d.porModulo ?? []);
        setCategorias(d.categorias ?? []);
        setModulos(d.modulos ?? []);
      })
      .finally(() => setLoading(false));
  }, [categoriaFilter, moduloFilter, search, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consumo de Vimeo</h1>
        <p className="text-gray-400 text-sm mt-0.5">Estadísticas de reproducción por vídeo · Formación</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Video className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Vídeos</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Eye className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Vistas totales</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalViews.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Viewers únicos</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalUnique.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Completos</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalFinishes.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Min. reproducidos</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalMinutos.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart por módulo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Vistas por módulo</h2>
            <p className="text-xs text-gray-400">Total de reproducciones acumuladas</p>
          </div>
          <TrendingUp className="h-4 w-4 text-gray-300" />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={porModulo} barCategoryGap="30%">
            <XAxis dataKey="modulo" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "#f3f4f6" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as PorModulo;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs space-y-0.5">
                    <p className="font-bold text-gray-800">{label}</p>
                    <p className="text-indigo-600 font-semibold">{d.views.toLocaleString()} vistas</p>
                    <p className="text-gray-500">{d.minutos} min reproducidos</p>
                    <p className="text-gray-500">{d.videos} vídeos</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="views" radius={[5, 5, 0, 0]}>
              {porModulo.map((_, i) => (
                <Cell key={i} fill={MODULO_COLORS[i % MODULO_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar vídeo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-52"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Tipo:</span>
          <button onClick={() => setCategoriaFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!categoriaFilter ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>
            Todos
          </button>
          {categorias.map((c) => (
            <button key={c} onClick={() => setCategoriaFilter(categoriaFilter === c ? null : c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${categoriaFilter === c ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Módulo:</span>
          <select
            value={moduloFilter ?? ""}
            onChange={(e) => setModuloFilter(e.target.value || null)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 bg-white text-gray-600">
            <option value="">Todos</option>
            {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Ordenar:</span>
          {[
            { key: "views", label: "Vistas" },
            { key: "unique_viewers", label: "Únicos" },
            { key: "finishes", label: "Completos" },
            { key: "avg_pct_watched", label: "% visto" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSort(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${sort === key ? "bg-amber-400 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-400">{videos.length} vídeos</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Video className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay vídeos con estos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </div>
  );
}
