"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

type CourseData = {
  id: string;
  title: string;
  access_level: string;
  is_published: boolean;
  sort_order: number;
};

type EventData = {
  id: string;
  title: string;
  starts_at: string;
  event_type: string | null;
  is_published: boolean;
};

type ProgressData = {
  lesson_id: string;
  completed: boolean;
};

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export default function AnalyticsPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/table-data?table=courses&pageSize=50").then((r) => r.json()),
      fetch("/api/table-data?table=events&pageSize=50").then((r) => r.json()),
      fetch("/api/table-data?table=lesson_progress&pageSize=500").then((r) => r.json()),
    ]).then(([c, e, p]) => {
      setCourses(c.data ?? []);
      setEvents(e.data ?? []);
      setProgress(p.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  // Cursos: publicados vs borradores
  const coursesPublished = courses.filter((c) => c.is_published).length;
  const coursesDraft = courses.length - coursesPublished;
  const courseStatusData = [
    { name: "Publicados", value: coursesPublished },
    { name: "Borradores", value: coursesDraft },
  ];

  // Progreso: completadas vs no completadas
  const completedLessons = progress.filter((p) => p.completed).length;
  const incompleteLessons = progress.length - completedLessons;
  const progressData = [
    { name: "Completadas", value: completedLessons },
    { name: "Sin completar", value: incompleteLessons },
  ];

  // Eventos por tipo
  const eventsByType: Record<string, number> = {};
  events.forEach((e) => {
    const type = e.event_type ?? "Sin tipo";
    eventsByType[type] = (eventsByType[type] ?? 0) + 1;
  });
  const eventTypeData = Object.entries(eventsByType).map(([name, value]) => ({ name, value }));

  // Eventos próximos (futuros)
  const upcoming = events
    .filter((e) => new Date(e.starts_at) > new Date() && e.is_published)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Formación, cursos y eventos de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Estado de cursos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Cursos ({courses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {courseStatusData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={courseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label>
                    {courseStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">Sin cursos</p>
            )}
          </CardContent>
        </Card>

        {/* Progreso de lecciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Progreso lecciones ({progress.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={progressData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label>
                    {progressData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">Sin progreso registrado</p>
            )}
          </CardContent>
        </Card>

        {/* Eventos por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Eventos por tipo ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {eventTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={eventTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Eventos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">Sin eventos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de cursos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {courses.sort((a, b) => a.sort_order - b.sort_order).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-800">{c.title}</span>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={c.access_level === "premium" ? "border-yellow-300 text-yellow-700" : "border-gray-300 text-gray-500"}
                  >
                    {c.access_level}
                  </Badge>
                  <Badge
                    variant={c.is_published ? "default" : "secondary"}
                    className={c.is_published ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
                  >
                    {c.is_published ? "Publicado" : "Borrador"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Próximos eventos */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcoming.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-800">{e.title}</span>
                  <div className="flex gap-2 items-center">
                    {e.event_type && <Badge variant="outline" className="text-xs">{e.event_type}</Badge>}
                    <span className="text-xs text-gray-400">
                      {new Date(e.starts_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
