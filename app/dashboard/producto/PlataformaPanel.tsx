"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, UserPlus, Activity, BookOpen } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { swr } from "@/lib/cached-fetch";

type Stats = {
  totalAlumnos: number;
  newUsers7d: number;
  newUsers30d: number;
  activos24h: number;
  activos7d: number;
  activos30d: number;
  leccionesCompletadas: number;
};

type Resp = {
  stats: Stats;
  dauChart: { date: string; count: number }[];
  porCohort: { cohort: string; count: number }[];
  porCurso: { course: string; completion: number; usuarios: number; lecciones: number }[];
};

const MES_CORTO: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function fmtDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${parseInt(d)} ${MES_CORTO[m] ?? m}`;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PlataformaPanel() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cancel = swr<Resp>("/api/producto/plataforma", (d) => {
      setData(d);
      setLoading(false);
    });
    return () => cancel();
  }, []);

  if (loading || !data) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-purple-500" /></div>;
  }

  const { stats, dauChart, porCohort, porCurso } = data;

  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">Actividad de los alumnos en la plataforma Revolutia</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total alumnos" value={stats.totalAlumnos} sub={`+${stats.newUsers30d} en 30 días`} color="bg-purple-500" />
        <StatCard icon={Activity} label="Activos 24h" value={stats.activos24h} sub={`${stats.activos7d} en 7d · ${stats.activos30d} en 30d`} color="bg-emerald-500" />
        <StatCard icon={UserPlus} label="Nuevos 7d" value={stats.newUsers7d} color="bg-blue-500" />
        <StatCard icon={BookOpen} label="Lecciones completadas" value={stats.leccionesCompletadas.toLocaleString("es-ES")} color="bg-amber-500" />
      </div>

      {/* DAU chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900 text-sm">Conexiones diarias (últimos 30 días)</h2>
          <p className="text-xs text-gray-400 mt-0.5">Alumnos únicos con actividad en ese día (basado en last_active_at)</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dauChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12 }}
              labelFormatter={(d) => fmtDay(d as string)}
              formatter={(v) => [`${v} alumnos`, "Activos"]}
            />
            <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: "#a855f7" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por cohort */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900 text-sm">Alumnos por edición</h2>
            <p className="text-xs text-gray-400 mt-0.5">Distribución basada en cohort de la plataforma</p>
          </div>
          {porCohort.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Sin datos de cohort</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porCohort}>
                <XAxis dataKey="cohort" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {porCohort.map((_, i) => <Cell key={i} fill="#a855f7" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completion por curso */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900 text-sm">% completion medio por curso</h2>
            <p className="text-xs text-gray-400 mt-0.5">Media de lecciones completadas por alumno que ha empezado el curso</p>
          </div>
          {porCurso.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Sin datos de cursos publicados</p>
          ) : (
            <div className="space-y-2.5">
              {porCurso.map((c) => (
                <div key={c.course}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700 truncate">{c.course}</span>
                    <span className="text-gray-400 shrink-0 ml-2">{c.usuarios} alumnos · {c.lecciones} lecciones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${c.completion}%` }} />
                    </div>
                    <span className="text-xs font-bold text-purple-600 w-12 text-right">{c.completion}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
