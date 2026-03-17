"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Loader2, Award, CheckCircle2, XCircle, BarChart2, TrendingUp, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

const PASS_THRESHOLD = 0.7;

type Certificate = {
  id: string;
  nombre: string;
  email: string | null;
  aciertos: number;
  fallos: number;
  porcentaje: number;
  aprobado: boolean;
  fecha: string | null;
};

type MonthlyData = { month: string; total: number; aprobados: number; suspensos: number };

type Stats = {
  total: number;
  aprobados: number;
  suspensos: number;
  avgPct: number;
  rangos: { label: string; count: number; aprobado: boolean }[];
  monthlyData: MonthlyData[];
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function ScoreBadge({ porcentaje, aprobado }: { porcentaje: number; aprobado: boolean }) {
  const pct = Math.round(porcentaje * 100);
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
      aprobado ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
    }`}>
      {aprobado
        ? <CheckCircle2 className="h-3.5 w-3.5" />
        : <XCircle className="h-3.5 w-3.5" />
      }
      {pct}%
    </div>
  );
}

function ProgressBar({ porcentaje }: { porcentaje: number }) {
  const pct = Math.round(porcentaje * 100);
  const color = porcentaje >= 0.85 ? "bg-emerald-500" : porcentaje >= 0.7 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CertCard({ cert, onDelete }: { cert: Certificate; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initials = cert.nombre.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const total = cert.aciertos + cert.fallos;

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    await fetch("/api/arp", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cert.id }) });
    onDelete(cert.id);
  };

  return (
    <div className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5 ${
      cert.aprobado ? "border-gray-100" : "border-red-100"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
          cert.aprobado ? "bg-emerald-500" : "bg-red-400"
        }`}>
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">{cert.nombre}</p>
            <div className="flex items-center gap-2">
              <ScoreBadge porcentaje={cert.porcentaje} aprobado={cert.aprobado} />
              {!confirm ? (
                <button
                  onClick={handleDelete}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setConfirm(false)}
                    className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-2 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center gap-1 disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          </div>
          {cert.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{cert.email}</p>}
          <div className="mt-2">
            <ProgressBar porcentaje={cert.porcentaje} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="text-emerald-600 font-medium">✓ {cert.aciertos} correctas</span>
            <span className="text-red-500 font-medium">✗ {cert.fallos} errores</span>
            <span className="text-gray-400">de {total} preguntas</span>
            {cert.fecha && (
              <span className="ml-auto text-gray-400">
                {new Date(cert.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArpPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"" | "aprobado" | "suspenso">("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback((searchValue: string, filterValue: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterValue) params.set("filter", filterValue);
    if (searchValue) params.set("search", searchValue);
    fetch(`/api/arp?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setCerts(d.data ?? []);
        setStats({ total: d.total, aprobados: d.aprobados, suspensos: d.suspensos, avgPct: d.avgPct, rangos: d.rangos, monthlyData: d.monthlyData ?? [] });
      })
      .finally(() => { setLoading(false); setSearching(false); });
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(value, filter), 350);
  };

  const handleFilter = (value: "" | "aprobado" | "suspenso") => {
    setFilter(value);
    fetchData(search, value);
  };

  useEffect(() => { fetchData("", ""); }, [fetchData]);

  const handleDelete = (id: string) => {
    setCerts((prev) => prev.filter((c) => c.id !== id));
    setStats((prev) => {
      if (!prev) return prev;
      const removed = certs.find((c) => c.id === id);
      if (!removed) return prev;
      const total = prev.total - 1;
      const aprobados = prev.aprobados - (removed.aprobado ? 1 : 0);
      const suspensos = prev.suspensos - (removed.aprobado ? 0 : 1);
      return { ...prev, total, aprobados, suspensos };
    });
  };

  const passRate = stats ? Math.round((stats.aprobados / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificados ARP</h1>
          <p className="text-gray-400 text-sm mt-0.5">Resultados del examen de certificación</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
          passRate >= 80 ? "bg-emerald-50 text-emerald-700" : passRate >= 60 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-600"
        }`}>
          <Award className="h-4 w-4" />
          {passRate}% tasa de aprobación
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={BarChart2} label="Examinados" value={stats.total} color="bg-blue-500" />
          <StatCard icon={CheckCircle2} label="Aprobados" value={stats.aprobados} sub={`≥ ${PASS_THRESHOLD * 100}% aciertos`} color="bg-emerald-500" />
          <StatCard icon={XCircle} label="Suspensos" value={stats.suspensos} color="bg-red-400" />
          <StatCard icon={TrendingUp} label="Media" value={`${Math.round(stats.avgPct * 100)}%`} sub="nota media" color="bg-purple-500" />
        </div>
      )}

      {/* Gráfica mensual */}
      {stats && stats.monthlyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900 text-sm">Exámenes por mes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Alumnos que han realizado el examen ARP cada mes</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthlyData} barCategoryGap="30%" barGap={3}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs space-y-1">
                      <p className="font-semibold text-gray-700">{label}</p>
                      <p className="text-emerald-600 font-medium">✓ {payload.find(p => p.dataKey === "aprobados")?.value} aprobados</p>
                      <p className="text-red-400 font-medium">✗ {payload.find(p => p.dataKey === "suspensos")?.value} suspensos</p>
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) => value === "aprobados" ? "Aprobados" : "Suspensos"}
                wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
              />
              <Bar dataKey="aprobados" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
              <Bar dataKey="suspensos" stackId="a" fill="#f87171" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfica de distribución */}
      {stats && stats.rangos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Distribución de notas</h2>
              <p className="text-xs text-gray-400 mt-0.5">Número de alumnos por rango de puntuación</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />Aprobado</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" />Suspenso</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.rangos} barCategoryGap="30%">
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700">{label}</p>
                      <p className="font-bold">{payload[0].value} alumnos</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.rangos.map((r, i) => (
                  <Cell key={i} fill={r.aprobado ? "#34d399" : "#f87171"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          {searching
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          }
          <Input
            placeholder="Buscar por nombre o email..."
            className="pl-9 bg-white border-gray-200"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["", "aprobado", "suspenso"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? f === "aprobado" ? "bg-emerald-500 text-white shadow-sm"
                    : f === "suspenso" ? "bg-red-400 text-white shadow-sm"
                    : "bg-gray-800 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {f === "" ? "Todos" : f === "aprobado" ? "✓ Aprobados" : "✗ Suspensos"}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 shrink-0">{certs.length} resultados</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Award className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay certificados con este filtro</p>
          <p className="text-xs mt-1">Ejecuta <code className="bg-gray-100 px-1 rounded">npm run import:arp</code> para importar datos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map((c) => <CertCard key={c.id} cert={c} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}
