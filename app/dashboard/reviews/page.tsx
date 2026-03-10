"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Star, ExternalLink, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type Review = {
  id: string;
  reviewer_name: string;
  stars: number;
  review_date: string;
  headline: string;
  review_body: string;
};

type MonthlyData = { month: string; count: number };
type WeeklyData = { week: string; count: number };

type Stats = {
  avgRating: string;
  total: number;
  uniqueReviewers: number;
  starCounts: { stars: number; count: number }[];
  monthlyData: MonthlyData[];
  weeklyData: WeeklyData[];
};

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${sz} ${s <= value ? "fill-[#00b67a] text-[#00b67a]" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`h-10 w-10 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {initials || "?"}
    </div>
  );
}

function ReviewCard({ review, onDelete }: { review: Review; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    await fetch("/api/trustpilot", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: review.id }),
    });
    onDelete(review.id);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 group">
      <div className="flex items-start gap-3">
        <Avatar name={review.reviewer_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{review.reviewer_name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {new Date(review.review_date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {confirm ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setConfirm(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Confirmar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 p-1 rounded-lg hover:bg-red-50"
                  title="Eliminar review"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <Stars value={review.stars} size="sm" />
          {review.headline && (
            <p className="font-semibold text-gray-800 mt-2 text-sm">{review.headline}</p>
          )}
          {review.review_body && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{review.review_body}</p>
          )}
        </div>
      </div>
    </div>
  );
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  return `${MONTH_NAMES[month]} ${year.slice(2)}`;
}

function toQuarter(month: string) {
  const [year, m] = month.split("-");
  const q = Math.ceil(parseInt(m) / 3);
  return `Q${q} ${year}`;
}

function formatWeek(w: string) {
  // "2025-W35" → "S35 '25"
  const [year, week] = w.split("-W");
  return `S${week} '${year.slice(2)}`;
}

function ReviewsChart({ monthlyData, weeklyData }: { monthlyData: MonthlyData[]; weeklyData: WeeklyData[] }) {
  const [view, setView] = useState<"week" | "month" | "quarter">("month");

  const chartData = useMemo(() => {
    if (view === "week") {
      return weeklyData.map((d) => ({ label: formatWeek(d.week), count: d.count }));
    }
    if (view === "month") {
      return monthlyData.map((d) => ({ label: formatMonth(d.month), count: d.count }));
    }
    // Aggregate by quarter
    const qMap: Record<string, number> = {};
    for (const d of monthlyData) {
      const q = toQuarter(d.month);
      qMap[q] = (qMap[q] ?? 0) + d.count;
    }
    return Object.entries(qMap).map(([label, count]) => ({ label, count }));
  }, [monthlyData, weeklyData, view]);

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-900 text-sm">Reviews por periodo</h2>
          <p className="text-xs text-gray-400 mt-0.5">Distribución temporal de valoraciones</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === "week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Semanas
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Meses
          </button>
          <button
            onClick={() => setView("quarter")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === "quarter" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Trimestres
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barCategoryGap="30%">
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-700">{label}</p>
                  <p className="text-[#00b67a] font-bold">{payload[0].value} reviews</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.count === maxCount ? "#00b67a" : "#d1fae5"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [starsFilter, setStarsFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [noTable, setNoTable] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReviews = useCallback((searchValue: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (starsFilter) params.set("stars", String(starsFilter));
    if (searchValue) params.set("search", searchValue);
    fetch(`/api/trustpilot?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNoTable(true); return; }
        setReviews(d.data ?? []);
        setCount(d.count ?? 0);
        setStats({
          avgRating: d.avgRating,
          total: d.total,
          uniqueReviewers: d.uniqueReviewers,
          starCounts: d.starCounts,
          monthlyData: d.monthlyData ?? [],
          weeklyData: d.weeklyData ?? [],
        });
      })
      .finally(() => { setLoading(false); setSearching(false); });
  }, [page, starsFilter]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSearching(true);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchReviews(value), 350);
  };

  useEffect(() => { fetchReviews(search); }, [fetchReviews]);

  const handleDelete = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setCount((c) => c - 1);
    setStats((s) => s ? { ...s, total: s.total - 1 } : s);
  };

  const filtered = reviews; // filtering is now server-side

  const totalPages = Math.ceil(count / 20);
  const avg = parseFloat(stats?.avgRating ?? "0");

  if (noTable) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800">Tabla no encontrada</h2>
        <p className="text-gray-500 text-sm">Crea la tabla en Supabase y ejecuta <code className="bg-gray-100 px-1 rounded">npm run import:trustpilot</code></p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews de Trustpilot</h1>
          <p className="text-gray-400 text-sm mt-0.5">revolutia.ai</p>
        </div>
        <a
          href="https://es.trustpilot.com/review/revolutia.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[#00b67a] hover:text-[#00a36c] font-medium transition-colors"
        >
          Ver en Trustpilot <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Stats hero */}
      {stats && (
        <div className="bg-gradient-to-br from-[#00b67a] to-[#007a52] rounded-3xl p-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-center">
              <p className="text-7xl font-black leading-none">{stats.avgRating}</p>
              <Stars value={Math.round(avg)} size="lg" />
              <div className="mt-3 space-y-1">
                <p className="text-white font-bold text-sm">{stats.total} valoraciones totales</p>
                <p className="text-white/60 text-xs">{stats.uniqueReviewers} clientes únicos</p>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2">
              {[...stats.starCounts].reverse().map(({ stars, count: c }) => {
                const pct = stats.total > 0 ? Math.round((c / stats.total) * 100) : 0;
                return (
                  <button
                    key={stars}
                    onClick={() => { setStarsFilter(starsFilter === stars ? null : stars); setPage(1); }}
                    className={`w-full flex items-center gap-3 group transition-opacity ${starsFilter && starsFilter !== stars ? "opacity-40" : ""}`}
                  >
                    <span className="text-white/80 text-xs w-8 text-right shrink-0">{stars} ★</span>
                    <div className="flex-1 bg-white/20 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-white h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white/80 text-xs w-8 shrink-0">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Gráfica temporal */}
      {stats && stats.monthlyData.length > 0 && (
        <ReviewsChart monthlyData={stats.monthlyData} weeklyData={stats.weeklyData} />
      )}

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          {searching
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          }
          <Input
            placeholder="Buscar por nombre, texto o titular..."
            className="pl-9 bg-white border-gray-200"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-1.5">
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => { setStarsFilter(starsFilter === s ? null : s); setPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                starsFilter === s
                  ? "bg-[#00b67a] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#00b67a] hover:text-[#00b67a]"
              }`}
            >
              {s} <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
          {starsFilter && (
            <button
              onClick={() => { setStarsFilter(null); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              × Quitar
            </button>
          )}
        </div>

        <span className="text-sm text-gray-400 shrink-0">{count} reviews</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#00b67a]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay reviews con este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <ReviewCard key={r.id} review={r} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-400">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              className="rounded-full"
              disabled={page === 1}
              onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={page === p ? "default" : "outline"}
                size="sm"
                className={`rounded-full w-9 ${page === p ? "bg-[#00b67a] hover:bg-[#00a36c] border-[#00b67a]" : ""}`}
                onClick={() => { setPage(p); window.scrollTo(0, 0); }}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline" size="sm"
              className="rounded-full"
              disabled={page === totalPages}
              onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
