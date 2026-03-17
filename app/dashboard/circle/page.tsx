"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Users, Activity, TrendingUp, AlertTriangle, FileText,
  Zap, ExternalLink, RefreshCw, Search, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

type Stats = {
  totalMembers: number;
  activeMembers: number;
  membersRisk: number;
  totalPosts: number;
  postsThisWeek: number;
  engagementRate: number;
};

type Contributor = {
  name: string;
  email: string;
  avatar_url: string | null;
  profile_url: string | null;
  posts_count: number;
  comments_count: number;
  last_seen_at: string | null;
};

type Member = {
  circle_member_id: number;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  posts_count: number;
  comments_count: number;
  topics_count: number;
  connections_count: number;
  last_seen_at: string | null;
  joined_at: string | null;
  active: boolean;
  member_tags: string[];
  edicion: string | null;
  fecha_compra_venta: string | null;
};

type PorEspacio = { espacio: string; posts: number };
type Crecimiento = { mes: string; nuevos: number };
type ActivityEvent = {
  id: string;
  event_type: string;
  member_name: string | null;
  member_email: string | null;
  post_title: string | null;
  space_name: string | null;
  happened_at: string;
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  member_joined:    { label: "Nuevo miembro",     color: "#34d399" },
  post_created:     { label: "Post publicado",    color: "#818cf8" },
  comment_created:  { label: "Comentario",        color: "#60a5fa" },
  member_removed:   { label: "Miembro eliminado", color: "#f87171" },
  post_liked:       { label: "Like",              color: "#fbbf24" },
};

const SORT_COLS = [
  { key: "posts_count",       label: "Posts" },
  { key: "comments_count",    label: "Cmts" },
  { key: "topics_count",      label: "Temas" },
  { key: "connections_count", label: "Conexiones" },
  { key: "last_seen_at",      label: "Última visita" },
  { key: "joined_at",         label: "Registro" },
  { key: "fecha_compra_venta", label: "Compra" },
];

function fmtMes(mes: string) {
  const [y, m] = mes.split("-");
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${months[parseInt(m)-1]} '${y.slice(2)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}m`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

const SPACE_COLORS = ["#818cf8","#34d399","#fbbf24","#60a5fa","#f87171","#a78bfa","#f472b6","#2dd4bf"];

export default function CirclePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topContributors, setTopContributors] = useState<Contributor[]>([]);
  const [porEspacio, setPorEspacio] = useState<PorEspacio[]>([]);
  const [crecimiento, setCrecimiento] = useState<Crecimiento[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPage, setMembersPage] = useState(1);
  const [membersSearch, setMembersSearch] = useState("");
  const [membersSort, setMembersSort] = useState("posts_count");
  const [membersOrder, setMembersOrder] = useState<"asc" | "desc">("desc");
  const [membersLoading, setMembersLoading] = useState(false);
  const PAGE_SIZE = 50;

  const fetchStats = () => {
    setLoading(true);
    fetch("/api/circle/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setTopContributors(d.topContributors ?? []);
        setPorEspacio(d.porEspacio ?? []);
        setCrecimiento(d.crecimiento ?? []);
        setRecentActivity(d.recentActivity ?? []);
      })
      .finally(() => setLoading(false));
  };

  const fetchMembers = useCallback((page: number, search: string, sort: string, order: "asc" | "desc") => {
    setMembersLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort,
      order,
      ...(search ? { search } : {}),
    });
    fetch(`/api/circle/members?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.data ?? []);
        setMembersTotal(d.total ?? 0);
      })
      .finally(() => setMembersLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    fetchMembers(membersPage, membersSearch, membersSort, membersOrder);
  }, [fetchMembers, membersPage, membersSearch, membersSort, membersOrder]);

  const handleSort = (col: string) => {
    if (col === membersSort) {
      setMembersOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setMembersSort(col);
      setMembersOrder("desc");
    }
    setMembersPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (col !== membersSort) return <ArrowUpDown className="h-3 w-3 text-white/20" />;
    return membersOrder === "desc"
      ? <ArrowDown className="h-3 w-3 text-indigo-400" />
      : <ArrowUp className="h-3 w-3 text-indigo-400" />;
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/circle/sync", { method: "POST" });
    setSyncing(false);
    fetchStats();
    fetchMembers(membersPage, membersSearch, membersSort, membersOrder);
  };

  const totalPages = Math.ceil(membersTotal / PAGE_SIZE);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Circle — Comunidad</h1>
          <p className="text-white/45 text-sm mt-0.5">Monitoreo en tiempo real · Revolutia IA PRO</p>
        </div>
        <a href="https://revolutia-ia-pro.circle.so" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-3 py-2 rounded-full hover:bg-indigo-400/20 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" /> Abrir Circle
        </a>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-6 gap-3">
          {[
            { icon: Users,         label: "Miembros",          val: stats.totalMembers,         color: "bg-indigo-500" },
            { icon: Activity,      label: "Activos 7 días",    val: stats.activeMembers,        color: "bg-emerald-500" },
            { icon: TrendingUp,    label: "Engagement",        val: `${stats.engagementRate}%`, color: "bg-blue-500" },
            { icon: FileText,      label: "Posts totales",     val: stats.totalPosts,           color: "bg-amber-500" },
            { icon: Zap,           label: "Posts esta semana", val: stats.postsThisWeek,        color: "bg-purple-500" },
            { icon: AlertTriangle, label: "En riesgo (+14d)",  val: stats.membersRisk,          color: "bg-red-500" },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-black text-white leading-tight">{val}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Crecimiento */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-white text-sm mb-1">Crecimiento de miembros</h2>
          <p className="text-xs text-white/40 mb-4">Nuevos miembros por mes</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={crecimiento}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }} tickFormatter={fmtMes} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[hsl(240_6%_18%)] border border-white/10 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-white/70">{fmtMes(label as string)}</p>
                      <p className="font-bold text-indigo-400">{(payload[0].payload as Crecimiento).nuevos} nuevos</p>
                    </div>
                  );
                }}
              />
              <Area dataKey="nuevos" stroke="#818cf8" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Posts por espacio */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-white text-sm mb-3">Actividad por espacio</h2>
          <div className="space-y-2.5">
            {porEspacio.slice(0, 7).map((e, i) => (
              <div key={e.espacio}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/65 truncate flex-1 mr-2">{e.espacio}</span>
                  <span className="text-xs font-bold text-white">{e.posts}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full">
                  <div className="h-1.5 rounded-full"
                    style={{ width: `${Math.round((e.posts / (porEspacio[0]?.posts || 1)) * 100)}%`, backgroundColor: SPACE_COLORS[i % SPACE_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top contribuidores */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-white text-sm mb-4">Top contribuidores</h2>
          <div className="space-y-3">
            {topContributors.map((c, i) => (
              <div key={c.email} className="flex items-center gap-3">
                <span className="text-sm font-black text-white/30 w-5 shrink-0">{i + 1}</span>
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-400/20 shrink-0 overflow-hidden flex items-center justify-center">
                  {c.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.avatar_url} alt={c.name} className="h-full w-full object-cover" />
                    : <span className="text-xs font-black text-indigo-300">{c.name?.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    {c.profile_url && (
                      <a href={c.profile_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 text-white/20 hover:text-indigo-400" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-white/40">
                    {c.posts_count} posts · {c.comments_count} cmts
                    {c.last_seen_at && ` · visto ${timeAgo(c.last_seen_at)}`}
                  </p>
                </div>
                <span className="text-sm font-black text-indigo-400">{c.posts_count}</span>
              </div>
            ))}
            {topContributors.length === 0 && (
              <p className="text-sm text-white/30 text-center py-4">Sincroniza la comunidad para ver contribuidores</p>
            )}
          </div>
        </div>

        {/* Feed de actividad */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-sm">Actividad en tiempo real</h2>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/40 font-medium">En vivo</span>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-white/30 space-y-2">
              <Zap className="h-8 w-8 mx-auto opacity-20" />
              <p className="text-xs">Configura el webhook en Make.com para ver actividad en tiempo real</p>
              <p className="text-xs text-white/20 font-mono">POST → /api/circle/webhook</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
              {recentActivity.map((e) => {
                const ev = EVENT_LABELS[e.event_type] ?? { label: e.event_type, color: "#9ca3af" };
                return (
                  <div key={e.id} className="flex items-start gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold" style={{ color: ev.color }}>{ev.label}</span>
                      <span className="text-xs text-white/45 ml-1.5">
                        {e.member_name ?? e.member_email ?? ""}
                        {e.post_title ? ` · "${e.post_title.slice(0, 40)}..."` : ""}
                        {e.space_name ? ` · ${e.space_name}` : ""}
                      </span>
                    </div>
                    <span className="text-xs text-white/25 shrink-0">{timeAgo(e.happened_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="font-bold text-white text-sm">Todos los miembros</h2>
            <p className="text-xs text-white/40 mt-0.5">{membersTotal} miembros · snapshots diarios activos</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
            <input
              type="text"
              placeholder="Buscar nombre o email..."
              value={membersSearch}
              onChange={(e) => { setMembersSearch(e.target.value); setMembersPage(1); }}
              className="pl-8 pr-3 py-1.5 text-xs rounded-full focus:outline-none w-56 bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:border-indigo-400/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Miembro</th>
                {SORT_COLS.map(({ key, label }) => (
                  <th key={key}
                    className="px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide cursor-pointer hover:text-white/70 transition-colors"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      {label}
                      <SortIcon col={key} />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Edición</th>
                <th className="px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mx-auto" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-white/30">No se encontraron miembros</td>
                </tr>
              ) : (
                members.map((m) => {
                  const isActive = m.last_seen_at
                    ? (Date.now() - new Date(m.last_seen_at).getTime()) < 7 * 86400000
                    : false;
                  const isRisk = m.last_seen_at
                    ? (Date.now() - new Date(m.last_seen_at).getTime()) > 14 * 86400000
                    : true;

                  return (
                    <tr key={m.circle_member_id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-500/20 border border-indigo-400/20 shrink-0 overflow-hidden flex items-center justify-center">
                            {m.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={m.avatar_url} alt={m.name ?? ""} className="h-full w-full object-cover" />
                              : <span className="text-[10px] font-black text-indigo-300">{m.name?.charAt(0) ?? "?"}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-semibold text-white truncate max-w-[140px]">{m.name ?? "—"}</p>
                              {m.profile_url && (
                                <a href={m.profile_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 text-white/20 hover:text-indigo-400 shrink-0" />
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-white/35 truncate max-w-[160px]">{m.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-white">{m.posts_count}</td>
                      <td className="px-3 py-3 text-center text-white/60">{m.comments_count}</td>
                      <td className="px-3 py-3 text-center text-white/60">{m.topics_count}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold text-sm ${m.connections_count > 0 ? "text-indigo-400" : "text-white/20"}`}>
                          {m.connections_count}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-white/60">
                        {m.last_seen_at ? timeAgo(m.last_seen_at) : "—"}
                      </td>
                      <td className="px-3 py-3 text-center text-white/45">{fmtDate(m.joined_at)}</td>
                      <td className="px-3 py-3 text-center text-white/45">{fmtDate(m.fecha_compra_venta)}</td>
                      <td className="px-3 py-3 text-center">
                        {m.edicion && (
                          <span className="inline-block text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                            {m.edicion}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isActive
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">● Activo</span>
                          : isRisk
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">● Riesgo</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/35 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-full">● Inactivo</span>
                        }
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/35">
              {((membersPage - 1) * PAGE_SIZE) + 1}–{Math.min(membersPage * PAGE_SIZE, membersTotal)} de {membersTotal}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={membersPage === 1}
                onClick={() => setMembersPage((p) => p - 1)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-white/50" />
              </button>
              <span className="text-xs text-white/40 px-2">
                {membersPage} / {totalPages}
              </span>
              <button
                disabled={membersPage === totalPages}
                onClick={() => setMembersPage((p) => p + 1)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-white/50" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sync info */}
      <div className="bg-indigo-500/10 rounded-2xl border border-indigo-400/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-indigo-300">Sincronización con Circle</p>
          <p className="text-xs text-indigo-300/60 mt-0.5">
            Ejecuta <code className="bg-indigo-400/10 px-1.5 py-0.5 rounded font-mono text-indigo-300">npm run sync:circle</code> para actualizar miembros y posts.
            Para actividad en tiempo real, configura el webhook en Make.com → POST /api/circle/webhook
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 bg-indigo-400/10 border border-indigo-400/25 px-3 py-2 rounded-full hover:bg-indigo-400/20 disabled:opacity-50 transition-all shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar ahora"}
        </button>
      </div>
    </div>
  );
}
