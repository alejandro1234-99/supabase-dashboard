"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, BookOpen, CalendarCheck, MessageSquare,
  HelpCircle, TrendingUp, UserPlus, Trophy,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

type Stats = {
  totalUsers: number;
  newUsersWeek: number;
  newUsersMonth: number;
  totalLessonsCompleted: number;
  totalEventRegs: number;
  totalPosts: number;
  totalQaPending: number;
  totalCourses: number;
  totalEvents: number;
  topSpacesChart: { name: string; posts: number }[];
  recentUsers: { id: string; name: string; avatar_url: string | null; created_at: string; public_role: string }[];
  signupChart: { date: string; count: number }[];
};

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "Usuarios totales", value: stats?.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Nuevos esta semana", value: stats?.newUsersWeek, icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Lecciones completadas", value: stats?.totalLessonsCompleted, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Registros en eventos", value: stats?.totalEventRegs, icon: CalendarCheck, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Posts en comunidad", value: stats?.totalPosts, icon: MessageSquare, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Q&A pendientes", value: stats?.totalQaPending, icon: HelpCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Cursos publicados", value: stats?.totalCourses, icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Eventos publicados", value: stats?.totalEvents, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revolutia AI PRO — Panel</h1>
        <p className="text-gray-500 mt-1">Métricas en tiempo real de tu plataforma</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {loading ? "—" : (value ?? 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registros últimos 30 días */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Nuevos usuarios — últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && stats?.signupChart && stats.signupChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.signupChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => `Día: ${v}`} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="Usuarios" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                {loading ? "Cargando..." : "Sin datos"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top espacios por actividad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Espacios más activos (posts)</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && stats?.topSpacesChart && stats.topSpacesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.topSpacesChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="posts" fill="#6366f1" radius={[0, 4, 4, 0]} name="Posts" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                {loading ? "Cargando..." : "Sin datos"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimos usuarios registrados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">Últimos usuarios registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {(stats?.recentUsers ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
                      {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{u.name ?? "Sin nombre"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{u.public_role}</Badge>
                    <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString("es-ES")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
