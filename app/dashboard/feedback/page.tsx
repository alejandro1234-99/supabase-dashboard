"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, MessageSquare, Star, TrendingUp, Users, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type FeedbackItem = {
  id: string;
  semana: number;
  submitted_at: string;
  rating: number;
  respuesta_util: string | null;
  mejora_sugerida: string | null;
  respuestas_extra: Record<string, string | null> | null;
};

type SemanaStats = { semana: number; avg: number; count: number };

type Stats = {
  totalResponses: number;
  globalAvg: number;
  semanasActivas: number;
  semanaStats: SemanaStats[];
};

const MODULO_NAMES: Record<number, { short: string; full: string }> = {
  10: { short: "N8N", full: "N8N" },
  11: { short: "MC", full: "Manychat" },
  12: { short: "VF", full: "Voiceflow" },
};

function moduloLabel(n: number, format: "short" | "full" = "short") {
  if (MODULO_NAMES[n]) return format === "full" ? MODULO_NAMES[n].full : MODULO_NAMES[n].short;
  return format === "full" ? `Semana ${n}` : `S${n}`;
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= value ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function RatingBadge({ value }: { value: number }) {
  const color = value >= 4 ? "bg-emerald-50 text-emerald-700" : value >= 3 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-600";
  return (
    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>
      <Star className="h-3 w-3 fill-current" />
      {value}/5
    </div>
  );
}

function FeedbackCard({ item, onDelete }: { item: FeedbackItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const extras = item.respuestas_extra ? Object.entries(item.respuestas_extra).filter(([, v]) => v) : [];

  async function handleDelete() {
    if (!confirm("¿Borrar esta respuesta?")) return;
    setDeleting(true);
    await fetch(`/api/feedback?id=${item.id}`, { method: "DELETE" });
    onDelete(item.id);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {moduloLabel(item.semana)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <RatingBadge value={item.rating} />
              <span className="text-xs text-gray-400">
                {new Date(item.submitted_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {extras.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-300 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {item.respuesta_util && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Lo más útil</p>
          <p className="text-sm text-gray-700 leading-relaxed">{item.respuesta_util}</p>
        </div>
      )}

      {expanded && extras.map(([key, val]) => (
        <div key={key} className="mt-3 border-t border-gray-50 pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 line-clamp-1">{key}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{val}</p>
        </div>
      ))}

      {item.mejora_sugerida && (
        <div className="mt-3 border-t border-gray-50 pt-3">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Sugerencia de mejora</p>
          <p className="text-sm text-gray-600 leading-relaxed italic">{item.mejora_sugerida}</p>
        </div>
      )}
    </div>
  );
}

function AvgChart({ semanaStats }: { semanaStats: SemanaStats[] }) {
  const data = semanaStats.map((s) => ({ label: moduloLabel(s.semana), avg: s.avg, count: s.count }));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="font-bold text-gray-900 text-sm">Nota media por semana</h2>
        <p className="text-xs text-gray-400 mt-0.5">Valoración promedio de los alumnos (1–5)</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="35%">
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 5]} hide />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { avg: number; count: number };
              return (
                <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-700">{label}</p>
                  <p className="font-bold text-indigo-600">{d.avg} / 5</p>
                  <p className="text-gray-400">{d.count} respuestas</p>
                </div>
              );
            }}
          />
          <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.avg >= 4.25 ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [semanaFilter, setSemanaFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [noTable, setNoTable] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (semanaFilter) params.set("semana", String(semanaFilter));
    fetch(`/api/feedback?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNoTable(true); return; }
        setItems(d.data ?? []);
        setCount(d.count ?? 0);
        setStats({
          totalResponses: d.totalResponses,
          globalAvg: d.globalAvg,
          semanasActivas: d.semanasActivas,
          semanaStats: d.semanaStats ?? [],
        });
      })
      .finally(() => setLoading(false));
  }, [page, semanaFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(count / 20);

  if (noTable) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800">Tabla no encontrada</h2>
        <p className="text-gray-500 text-sm">Crea la tabla en Supabase y ejecuta <code className="bg-gray-100 px-1 rounded">npm run import:feedback</code></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback de Alumnos</h1>
        <p className="text-gray-400 text-sm mt-0.5">Respuestas de los formularios semanales</p>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Respuestas</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalResponses}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nota / 5</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.globalAvg}<span className="text-sm font-medium text-gray-400">/5</span></p>
                <RatingStars value={Math.round(stats.globalAvg)} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-400 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nota / 10</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{(stats.globalAvg * 2).toFixed(2)}<span className="text-sm font-medium text-gray-400">/10</span></p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Módulos</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.semanasActivas}</p>
              </div>
            </div>
          </div>

          {/* Gráfica */}
          {stats.semanaStats.length > 0 && <AvgChart semanaStats={stats.semanaStats} />}
        </>
      )}

      {/* Filtro por semana */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-500">Módulo:</span>
        <button
          onClick={() => { setSemanaFilter(null); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !semanaFilter ? "bg-indigo-500 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
          }`}
        >
          Todos
        </button>
        {stats?.semanaStats.slice().sort((a, b) => a.semana - b.semana).map((ss) => {
          const low = ss.avg < 4.25;
          return (
            <button
              key={ss.semana}
              onClick={() => { setSemanaFilter(ss.semana); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                semanaFilter === ss.semana
                  ? low ? "bg-red-500 text-white shadow-sm" : "bg-indigo-500 text-white shadow-sm"
                  : low ? "bg-red-50 border border-red-200 text-red-600 hover:border-red-400" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
              }`}
            >
              {moduloLabel(ss.semana, "full")}
              <span className="ml-1 text-[10px] opacity-70">{ss.avg}</span>
            </button>
          );
        })}
        <span className="ml-auto text-sm text-gray-400">{count} respuestas</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay respuestas aún</p>
          <p className="text-xs mt-1">Ejecuta <code className="bg-gray-100 px-1 rounded">npm run import:feedback</code></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
            />
          ))}
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
